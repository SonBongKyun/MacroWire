import { getTierSchedules, type WireSourceTier } from "./sourceTiers";

export interface SourceHealthSnapshot {
  name: string;
  tier: WireSourceTier;
  lastSuccessAt: Date | null;
  lastFailureAt: Date | null;
  consecutiveFailures: number;
  lastLatencyMs: number | null;
}

export type WorkerHealthStatus = "healthy" | "degraded" | "stale" | "unconfigured";

export function summarizeWorkerHealth(
  sources: SourceHealthSnapshot[],
  now = new Date(),
) {
  if (sources.length === 0) {
    return { status: "unconfigured" as const, sourceCount: 0, healthySources: 0, staleSources: [] as string[], failedSources: [] as string[] };
  }

  const schedules = getTierSchedules();
  const staleSources: string[] = [];
  const failedSources: string[] = [];

  for (const source of sources) {
    const staleAfterMs = Math.max(schedules[source.tier].intervalMs * 4, 2 * 60_000);
    if (!source.lastSuccessAt || now.getTime() - source.lastSuccessAt.getTime() > staleAfterMs) {
      staleSources.push(source.name);
    }
    if (source.consecutiveFailures > 0) failedSources.push(source.name);
  }

  const healthySources = sources.length - staleSources.length;
  const status: WorkerHealthStatus = healthySources === 0
    ? "stale"
    : failedSources.length > 0 || staleSources.length > 0
      ? "degraded"
      : "healthy";

  return { status, sourceCount: sources.length, healthySources, staleSources, failedSources };
}
