import crypto from "crypto";
import Parser from "rss-parser";
import { prisma } from "../db/prisma";
import { applyTags } from "../tagging/tagger";
import { cleanupOldArticles } from "../cleanup/cleaner";

const parser = new Parser({
  timeout: 15000,
  headers: {
    "User-Agent": "macro-wire/1.0 (personal news aggregator)",
  },
});

function hashUrl(url: string): string {
  return crypto.createHash("sha256").update(url).digest("hex").slice(0, 24);
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
      const feed = await parser.parseURL(source.feedUrl);
      let sourceAdded = 0;
      let sourceSkipped = 0;

      for (const item of feed.items) {
        const rawUrl = item.link;
        if (!rawUrl) {
          sourceSkipped++;
          continue;
        }

        const url = canonicalizeUrl(rawUrl);
        const id = hashUrl(url);
        const title = item.title?.trim() ?? "Untitled";
        const summary =
          item.contentSnippet?.slice(0, 500) ??
          item.content?.slice(0, 500) ??
          null;
        const publishedAt = item.pubDate
          ? new Date(item.pubDate)
          : item.isoDate
          ? new Date(item.isoDate)
          : new Date();

        // Duplicate check
        const exists = await prisma.article.findUnique({
          where: { url },
          select: { id: true },
        });
        if (exists) {
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
