import { prisma } from "../db/prisma";
import { seedSources } from "../db/seed";
import { runSourceIngest, type NewWireArticle, type WireSource } from "./sourceIngest";
import { FALLBACK_TIERS } from "./sourceTiers";
import { deliverDiscordAlerts } from "../alerts/discord";

export type NewBreakingArticle = NewWireArticle;

export interface BreakingIngestResult {
  added: number;
  failedSources: number;
  sourceCount: number;
  lastUpdated: string;
  newArticles: NewBreakingArticle[];
}

/**
 * Best-effort T0/T1 fallback used by GitHub Actions.
 *
 * The long-running worker is the primary ingest path. This bounded run shares
 * the same normalization and URL dedup logic so a delayed fallback cannot
 * create a competing data model or duplicate rows.
 */
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

  const results = await Promise.all(
    sources.map((source) => runSourceIngest(source as WireSource)),
  );
  const allNewArticles = results
    .flatMap((result) => result.newArticles)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  await deliverDiscordAlerts(allNewArticles);
  const newArticles = allNewArticles.slice(0, 10);

  return {
    added: results.reduce((sum, result) => sum + result.added, 0),
    failedSources: results.filter((result) => result.failed).length,
    sourceCount: sources.length,
    lastUpdated: new Date().toISOString(),
    newArticles,
  };
}
