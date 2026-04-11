import crypto from "crypto";
import Parser from "rss-parser";
import { prisma } from "../db/prisma";
import { applyTags } from "../tagging/tagger";
import { seedSources } from "../db/seed";

const parser = new Parser({
  timeout: 10000,
  headers: { "User-Agent": "ryzm-finance/1.0 (breaking news aggregator)" },
});

function hashUrl(url: string): string {
  return crypto.createHash("sha256").update(url).digest("hex").slice(0, 24);
}

function canonicalizeUrl(raw: string): string {
  try {
    const u = new URL(raw);
    u.hash = "";
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach(
      (p) => u.searchParams.delete(p)
    );
    return u.toString();
  } catch {
    return raw;
  }
}

/** Ingest a single breaking source — resolves to number of articles added. */
async function ingestBreakingSource(source: {
  id: string;
  name: string;
  feedUrl: string;
  category: string;
}): Promise<{ added: number; failed: boolean }> {
  try {
    const feed = await parser.parseURL(source.feedUrl);
    let added = 0;

    // Only look at articles from the last 6 hours for breaking news
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

    for (const item of feed.items) {
      const rawUrl = item.link ?? "";
      if (!rawUrl) continue;

      const url = canonicalizeUrl(rawUrl);
      const id = hashUrl(url);
      const title = item.title?.trim() ?? "Untitled";
      const summary = item.contentSnippet?.slice(0, 500) ?? item.content?.slice(0, 500) ?? null;
      const publishedAt = item.pubDate
        ? new Date(item.pubDate)
        : item.isoDate
        ? new Date(item.isoDate)
        : new Date();

      // Only ingest recent articles for breaking news
      if (publishedAt < sixHoursAgo) continue;

      const exists = await prisma.article.findUnique({
        where: { url },
        select: { id: true },
      });
      if (exists) continue;

      // Get base tags + always add "속보" for breaking category sources
      const baseTags = applyTags(title, summary);
      const tags = baseTags.includes("속보") ? baseTags : ["속보", ...baseTags];

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
        added++;
      } catch {
        // unique constraint — skip
      }
    }

    return { added, failed: false };
  } catch (err) {
    console.error(`[breaking-ingest] FAILED ${source.name}: ${err instanceof Error ? err.message : err}`);
    return { added: 0, failed: true };
  }
}

export interface BreakingIngestResult {
  added: number;
  failedSources: number;
  lastUpdated: string;
}

export async function runBreakingIngest(): Promise<BreakingIngestResult> {
  await seedSources();

  const breakingSources = await prisma.source.findMany({
    where: { enabled: true, category: "속보" },
  });

  if (breakingSources.length === 0) {
    return { added: 0, failedSources: 0, lastUpdated: new Date().toISOString() };
  }

  console.log(`[breaking-ingest] fetching ${breakingSources.length} sources in parallel`);

  // Parallel fetch — all breaking sources at once
  const results = await Promise.all(
    breakingSources.map((src) => ingestBreakingSource(src))
  );

  const added = results.reduce((sum, r) => sum + r.added, 0);
  const failedSources = results.filter((r) => r.failed).length;
  const lastUpdated = new Date().toISOString();

  console.log(`[breaking-ingest] done. added=${added}, failed=${failedSources}`);
  return { added, failedSources, lastUpdated };
}
