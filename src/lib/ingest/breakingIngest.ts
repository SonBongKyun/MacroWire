import { prisma } from "../db/prisma";
import { seedSources } from "../db/seed";
import { pollSourceAndRecordHealth, type NewWireArticle, type WireSource } from "./sourceIngest";
import { FALLBACK_TIERS } from "./sourceTiers";
import { linkNewArticlesToEvents } from "../events/eventGraph";

export type NewBreakingArticle = NewWireArticle;

export interface BreakingIngestResult {
  added: number;
  failedSources: number;
  sourceCount: number;
  lastUpdated: string;
  newArticles: NewBreakingArticle[];
}

export async function runBreakingIngest(): Promise<BreakingIngestResult> {
  let sources = await prisma.source.findMany({
    where: { enabled: true, tier: { in: [...FALLBACK_TIERS] } },
  });

  if (sources.length === 0) {
    await seedSources();
    sources = await prisma.source.findMany({
      where: { enabled: true, tier: { in: [...FALLBACK_TIERS] } },
    });
  }

  // The fallback uses the same health-recording wrapper as the long-running
  // worker. This keeps /api/health honest when GitHub Actions is temporarily
  // carrying the wire. pollSourceAndRecordHealth also owns per-source Discord
  // delivery, so there is deliberately no second aggregate alert call here.
  const results = await Promise.all(
    sources.map((source) => pollSourceAndRecordHealth(source as WireSource)),
  );
  const allNewArticles = results
    .flatMap((result) => result.newArticles)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  await linkNewArticlesToEvents(allNewArticles);
  const newArticles = allNewArticles.slice(0, 10);

  return {
    added: results.reduce((sum, result) => sum + result.added, 0),
    failedSources: results.filter((result) => result.failed).length,
    sourceCount: sources.length,
    lastUpdated: new Date().toISOString(),
    newArticles,
  };
}
