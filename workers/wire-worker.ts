import { prisma } from "../src/lib/db/prisma";
import { seedSources } from "../src/lib/db/seed";
import { pollSourceAndRecordHealth, type WireSource } from "../src/lib/ingest/sourceIngest";
import { WireWorker, createSourceCatalogueLoader } from "../src/lib/ingest/wireWorker";
import { nextPollAt } from "../src/lib/ingest/sourceTiers";

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
}

const loadSources = createSourceCatalogueLoader({
  // Reconcile tiers and explicit retire flags once when the worker starts.
  // seedSources never re-enables a source disabled by the owner.
  seed: seedSources,
  load: async () => prisma.source.findMany({ where: { enabled: true } }) as Promise<WireSource[]>,
  refreshMs: positiveInteger(process.env.WIRE_SOURCE_REFRESH_MS, 60_000),
});

async function pollSource(source: WireSource) {
  const result = await pollSourceAndRecordHealth(source);
  const failures = result.failed ? (source.consecutiveFailures ?? 0) + 1 : 0;
  // Keep the in-memory schedule current between catalogue refreshes. Health
  // remains durable in Postgres, but the one-second loop no longer rereads the
  // whole Source table merely to learn this timestamp.
  source.consecutiveFailures = failures;
  source.nextFetchAt = nextPollAt(source.tier, new Date(), failures);
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
