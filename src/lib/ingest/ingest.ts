import { prisma } from "../db/prisma";
import { cleanupOldArticles } from "../cleanup/cleaner";
import { runSourceIngest, type WireSource } from "./sourceIngest";

export interface SourceParser {
  canHandle: (feedUrl: string) => boolean;
  parse: (feedUrl: string) => Promise<{
    items: { title: string; url: string; summary?: string; publishedAt?: Date }[];
  }>;
}

// Kept for API compatibility. Current production sources use RSS/Atom and the
// shared source ingest path; source-specific parsers can be reintroduced here
// without creating another persistence pipeline.
export function registerParser(parser: SourceParser) {
  void parser;
}

export interface IngestResult {
  added: number;
  skipped: number;
  failedSources: string[];
  lastUpdated: string;
}

/** Bounded full-ingest fallback. The tiered worker is the primary path. */
export async function runIngest(): Promise<IngestResult> {
  const sources = await prisma.source.findMany({ where: { enabled: true } });
  const results = await Promise.all(
    sources.map((source) => runSourceIngest(source as WireSource)),
  );

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
