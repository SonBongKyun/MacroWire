import { prisma } from "../db/prisma";
import { cleanupOldArticles } from "../cleanup/cleaner";
import { pollSourceAndRecordHealth, type WireSource } from "./sourceIngest";
import { backfillRecentEvents, linkNewArticlesToEvents } from "../events/eventGraph";

export interface SourceParser {
  canHandle: (feedUrl: string) => boolean;
  parse: (feedUrl: string) => Promise<{
    items: { title: string; url: string; summary?: string; publishedAt?: Date }[];
  }>;
}

export function registerParser(parser: SourceParser) {
  void parser;
}

export interface IngestResult {
  added: number;
  skipped: number;
  failedSources: string[];
  lastUpdated: string;
}

/**
 * Bounded full-ingest fallback. The tiered worker is the primary path.
 *
 * The fallback must still record source health because it may be the only active
 * ingestion path while the background worker is unavailable. Health recording
 * also persists conditional-feed validators for subsequent polls. Discord alert
 * delivery happens inside pollSourceAndRecordHealth(), so do not re-deliver the
 * aggregated newArticles here.
 */
export async function runIngest(): Promise<IngestResult> {
  const sources = await prisma.source.findMany({ where: { enabled: true } });
  const results = await Promise.all(
    sources.map((source) => pollSourceAndRecordHealth(source as WireSource)),
  );
  const newArticles = results.flatMap((result) => result.newArticles);
  await linkNewArticlesToEvents(newArticles);
  try {
    await backfillRecentEvents(30, 48);
  } catch (error) {
    console.error("[event] fallback backfill error:", error);
  }

  try {
    await cleanupOldArticles();
  } catch (error) {
    console.error("[ingest] cleanup error:", error);
  }

  return {
    added: results.reduce((sum, result) => sum + result.added, 0),
    skipped: results.reduce((sum, result) => sum + result.skipped, 0),
    failedSources: results.filter((result) => result.failed).map((result) => result.sourceName),
    lastUpdated: new Date().toISOString(),
  };
}
