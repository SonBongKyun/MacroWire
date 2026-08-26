import { prisma } from "../src/lib/db/prisma";
import { seedSources } from "../src/lib/db/seed";
import { pollSourceAndRecordHealth, type WireSource } from "../src/lib/ingest/sourceIngest";
import { WireWorker, createSourceCatalogueLoader } from "../src/lib/ingest/wireWorker";
import { nextPollAt } from "../src/lib/ingest/sourceTiers";
import { backfillRecentEvents, linkNewArticlesToEvents } from "../src/lib/events/eventGraph";

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
}

const loadSources = createSourceCatalogueLoader({
  seed: seedSources,
  load: async () => prisma.source.findMany({ where: { enabled: true } }) as Promise<WireSource[]>,
  refreshMs: positiveInteger(process.env.WIRE_SOURCE_REFRESH_MS, 60_000),
});

let backfillCounter = 0;
async function pollSource(source: WireSource) {
  const result = await pollSourceAndRecordHealth(source);
  const failures = result.failed ? (source.consecutiveFailures ?? 0) + 1 : 0;
  source.consecutiveFailures = failures;
  source.feedEtag = result.etag ?? source.feedEtag ?? null;
  source.feedLastModified = result.lastModified ?? source.feedLastModified ?? null;
  source.lastRetryAfterMs = result.retryAfterMs ?? null;
  const scheduled = nextPollAt(source.tier, new Date(), failures);
  source.nextFetchAt = result.retryAfterMs && result.retryAfterMs > 0
    ? new Date(Math.max(scheduled.getTime(), Date.now() + result.retryAfterMs))
    : scheduled;

  if (result.newArticles.length > 0) {
    await linkNewArticlesToEvents(result.newArticles);
    // Backfill is intentionally bounded and infrequent so a new product layer
    // cannot steal capacity from the primary wire loop.
    backfillCounter += result.newArticles.length;
    if (backfillCounter >= 20) {
      backfillCounter = 0;
      try {
        await backfillRecentEvents(20, 48);
      } catch (error) {
        console.error("[event] bounded backfill failed", error);
      }
    }
  }
  return result;
}

const worker = new WireWorker({
  loadSources,
  pollSource,
  concurrency: positiveInteger(process.env.WIRE_WORKER_CONCURRENCY, 4),
  loopIntervalMs: positiveInteger(process.env.WIRE_LOOP_INTERVAL_MS, 1_000),
});

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.info(`[wire] ${signal} received; draining active fetches`);
  await worker.stop();
  await prisma.$disconnect();
}

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));

worker.run().catch(async (error) => {
  console.error("[wire] fatal worker error", error);
  await prisma.$disconnect();
  process.exitCode = 1;
});
