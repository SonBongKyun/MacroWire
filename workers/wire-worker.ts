import { prisma } from "../src/lib/db/prisma";
import { seedSources } from "../src/lib/db/seed";
import { pollSourceAndRecordHealth, type WireSource } from "../src/lib/ingest/sourceIngest";
import { WireWorker } from "../src/lib/ingest/wireWorker";

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
}

async function loadSources(): Promise<WireSource[]> {
  let sources = await prisma.source.findMany({ where: { enabled: true } });
  if (sources.length === 0) {
    await seedSources();
    sources = await prisma.source.findMany({ where: { enabled: true } });
  }
  return sources as WireSource[];
}

const worker = new WireWorker({
  loadSources,
  pollSource: pollSourceAndRecordHealth,
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
