import crypto from "crypto";
import Parser from "rss-parser";
import { prisma } from "../db/prisma";
import { applyTags } from "../tagging/tagger";
import { cleanupOldArticles } from "../cleanup/cleaner";

const parser = new Parser({
  timeout: 15000,
  headers: {
    "User-Agent": "macrowire/1.0 (personal news aggregator)",
  },
});

function hashUrl(url: string): string {
  return crypto.createHash("sha256").update(url).digest("hex").slice(0, 24);
}

// ------ Enhanced dedup: title similarity check (#24) ------
const STOP_WORDS_INGEST = new Set([
  "의", "가", "이", "은", "는", "을", "를", "에", "와", "과",
  "도", "로", "으로", "에서", "까지", "부터", "한", "할", "하는",
  "및", "등", "것", "수", "위", "중", "각", "더", "또", "그",
]);

function extractTitleKeywords(title: string): string[] {
  return title
    .replace(/[^\w\uAC00-\uD7A3\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOP_WORDS_INGEST.has(w));
}

function titleSimilarity(a: string, b: string): number {
  const kwA = new Set(extractTitleKeywords(a));
  const kwB = new Set(extractTitleKeywords(b));
  if (kwA.size === 0 || kwB.size === 0) return 0;
  let overlap = 0;
  for (const w of kwA) { if (kwB.has(w)) overlap++; }
  return overlap / Math.max(kwA.size, kwB.size);
}

function isDuplicateByTitleAgainst(title: string, recentTitles: string[]): boolean {
  for (const existing of recentTitles) {
    if (titleSimilarity(title, existing) > 0.7) return true;
  }
  return false;
}

// ------ Custom parser plugin architecture (#23) ------
export interface SourceParser {
  canHandle: (feedUrl: string) => boolean;
  parse: (feedUrl: string) => Promise<{
    items: { title: string; url: string; summary?: string; publishedAt?: Date }[];
  }>;
}

const customParsers: SourceParser[] = [];

export function registerParser(parser: SourceParser) {
  customParsers.push(parser);
}

function canonicalizeUrl(raw: string): string {
  try {
    const u = new URL(raw);
    u.hash = "";
    // Remove common tracking params
    const removeParams = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
    ];
    removeParams.forEach((p) => u.searchParams.delete(p));
    return u.toString();
  } catch {
    return raw;
  }
}

export interface IngestResult {
  added: number;
  skipped: number;
  failedSources: string[];
  lastUpdated: string;
}

type FeedItem = { title: string; url: string; summary?: string; publishedAt?: Date };

async function fetchFeed(source: { feedUrl: string }): Promise<FeedItem[]> {
  const customParser = customParsers.find((p) => p.canHandle(source.feedUrl));
  if (customParser) {
    const result = await customParser.parse(source.feedUrl);
    return result.items;
  }
  const feed = await parser.parseURL(source.feedUrl);
  return feed.items.map((item) => ({
    title: item.title?.trim() ?? "Untitled",
    url: item.link ?? "",
    summary: item.contentSnippet?.slice(0, 500) ?? item.content?.slice(0, 500) ?? undefined,
    publishedAt: item.pubDate ? new Date(item.pubDate) : item.isoDate ? new Date(item.isoDate) : new Date(),
  }));
}

export async function runIngest(): Promise<IngestResult> {
  const startTime = new Date();
  console.log(`[ingest] started at ${startTime.toISOString()}`);

  const sources = await prisma.source.findMany({
    where: { enabled: true },
  });

  // Phase 1: fetch all feeds in parallel (network-bound)
  const fetchResults = await Promise.allSettled(
    sources.map((s) => fetchFeed(s).then((items) => ({ source: s, items })))
  );

  // Phase 2: load recent titles ONCE for dedup (last 24h)
  const dedupWindow = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recent = await prisma.article.findMany({
    where: { publishedAt: { gte: dedupWindow } },
    select: { title: true },
    take: 1000,
  });
  const recentTitles = recent.map((r) => r.title);

  let totalAdded = 0;
  let totalSkipped = 0;
  const failedSources: string[] = [];

  // Phase 3: write to DB, source by source
  for (let i = 0; i < fetchResults.length; i++) {
    const result = fetchResults[i];
    const source = sources[i];

    if (result.status === "rejected") {
      console.error(`[ingest] FAILED ${source.name}: ${result.reason}`);
      failedSources.push(source.name);
      continue;
    }

    const { items } = result.value;
    let sourceAdded = 0;
    let sourceSkipped = 0;

    for (const item of items) {
      if (!item.url) {
        sourceSkipped++;
        continue;
      }
      const url = canonicalizeUrl(item.url);
      const id = hashUrl(url);
      const title = item.title?.trim() ?? "Untitled";
      const summary = item.summary?.slice(0, 500) ?? null;
      const publishedAt = item.publishedAt ?? new Date();

      if (isDuplicateByTitleAgainst(title, recentTitles)) {
        sourceSkipped++;
        continue;
      }

      const tags = applyTags(title, summary);

      try {
        await prisma.article.create({
          data: {
            id,
            sourceId: source.id,
            sourceName: source.name,
            title,
            url,
            publishedAt,
            summary,
            tags: JSON.stringify(tags),
            isRead: false,
            isSaved: false,
          },
        });
        sourceAdded++;
        recentTitles.push(title); // include in subsequent dedup checks within this run
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes("Unique constraint")) {
          sourceSkipped++;
        } else {
          console.error(`[ingest] write error ${source.name}: ${err}`);
          sourceSkipped++;
        }
      }
    }

    totalAdded += sourceAdded;
    totalSkipped += sourceSkipped;
    console.log(`[ingest] ${source.name}: +${sourceAdded} added, ${sourceSkipped} skipped`);
  }

  try {
    await cleanupOldArticles();
  } catch (err) {
    console.error(`[ingest] cleanup error:`, err);
  }

  const lastUpdated = new Date().toISOString();
  console.log(
    `[ingest] finished. added=${totalAdded}, skipped=${totalSkipped}, failed=${failedSources.length}`
  );

  return {
    added: totalAdded,
    skipped: totalSkipped,
    failedSources,
    lastUpdated,
  };
}
