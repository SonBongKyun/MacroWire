import assert from "node:assert/strict";
import test from "node:test";
import { summarizeWorkerHealth } from "../src/lib/ingest/workerHealth";

test("reports unconfigured worker health without triggering ingestion", () => {
  assert.equal(summarizeWorkerHealth([]).status, "unconfigured");
});

test("reports stale and degraded T0/T1 sources honestly", () => {
  const now = new Date("2026-08-11T12:00:00Z");
  const stale = summarizeWorkerHealth([{ name: "Federal Reserve", tier: "T0", lastSuccessAt: null, lastFailureAt: null, consecutiveFailures: 0, lastLatencyMs: null }], now);
  assert.equal(stale.status, "stale");

  const degraded = summarizeWorkerHealth([
    { name: "Federal Reserve", tier: "T0", lastSuccessAt: new Date("2026-08-11T11:59:30Z"), lastFailureAt: null, consecutiveFailures: 0, lastLatencyMs: 200 },
    { name: "CNBC Breaking", tier: "T1", lastSuccessAt: new Date("2026-08-11T11:59:30Z"), lastFailureAt: now, consecutiveFailures: 1, lastLatencyMs: 10_000 },
  ], now);
  assert.equal(degraded.status, "degraded");
  assert.deepEqual(degraded.failedSources, ["CNBC Breaking"]);
});
