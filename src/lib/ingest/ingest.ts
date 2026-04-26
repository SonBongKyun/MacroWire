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

async function isDuplicateByTitle(title: string, publishedAt: Date): Promise<boolean> {
  const window = new Date(publishedAt.getTime() - 24 * 60 * 60 * 1000);
  const recent = await prisma.article.findMany({
    where: { publishedAt: { gte: window } },
    select: { title: true },
    take: 200,
  });
  for (const existing of recent) {
    if (titleSimilarity(title, existing.title) > 0.7) return true;
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

export async function runIngest(): Promise<IngestResult> {
  const startTime = new Date();
  console.log(`[ingest] started at ${startTime.toISOString()}`);

  const sources = await prisma.source.findMany({
    where: { enabled: true },
  });

  let totalAdded = 0;
  let totalSkipped = 0;
  const failedSources: string[] = [];

  for (const source of sources) {
    try {
      console.log(`[ingest] fetching: ${source.name} (${source.feedUrl})`);

      // Check for custom parser (#23)
      const customParser = customParsers.find((p) => p.canHandle(source.feedUrl));
      let feedItems: { title: string; url: string; summary?: string; publishedAt?: Date }[];

      if (customParser) {
        const result = await customParser.parse(source.feedUrl);
        feedItems = result.items;
      } else {
        const feed = await parser.parseURL(source.feedUrl);
        feedItems = feed.items.map((item) => ({
          title: item.title?.trim() ?? "Untitled",
          url: item.link ?? "",
          summary: item.contentSnippet?.slice(0, 500) ?? item.content?.slice(0, 500) ?? undefined,
          publishedAt: item.pubDate ? new Date(item.pubDate) : item.isoDate ? new Date(item.isoDate) : new Date(),
        }));
      }

      let sourceAdded = 0;
      let sourceSkipped = 0;

      for (const item of feedItems) {
        const rawUrl = item.url;
        if (!rawUrl) {
          sourceSkipped++;
          continue;
        }

        const url = canonicalizeUrl(rawUrl);
        const id = hashUrl(url);
        const title = item.title?.trim() ?? "Untitled";
        const summary = item.summary?.slice(0, 500) ?? null;
        const publishedAt = item.publishedAt ?? new Date();

        // Duplicate check by URL
        const exists = await prisma.article.findUnique({
          where: { url },
          select: { id: true },
        });
        if (exists) {
          sourceSkipped++;
          continue;
        }

        // Enhanced duplicate check by title similarity (#24)
        if (await isDuplicateByTitle(title, publishedAt)) {
          sourceSkipped++;
          console.log(`[ingest] title-dedup skip: ${title.slice(0, 50)}…`);
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
        } catch (err: unknown) {
          // unique constraint violation – skip
          if (
            err instanceof Error &&
            err.message.includes("Unique constraint")
          ) {
            sourceSkipped++;
          } else {
            throw err;
          }
        }
      }

      totalAdded += sourceAdded;
      totalSkipped += sourceSkipped;
      console.log(
        `[ingest] ${source.name}: +${sourceAdded} added, ${sourceSkipped} skipped`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[ingest] FAILED ${source.name}: ${msg}`);
      failedSources.push(source.name);
    }
  }

  // Run cleanup after ingest
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
