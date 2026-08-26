import assert from "node:assert/strict";
import test from "node:test";
import { nextPollAt, pollJitterMs } from "../src/lib/ingest/sourceTiers";

test("poll jitter stays within eight percent of cadence", () => {
  assert.equal(pollJitterMs(100_000, () => 0), -8_000);
  assert.equal(pollJitterMs(100_000, () => 0.5), 0);
  assert.equal(pollJitterMs(100_000, () => 1), 8_000);
});

test("failed polls use backoff without random jitter", () => {
  const schedules = {
    T0: { intervalMs: 10_000, timeoutMs: 1_000, retryAttempts: 1 },
    T1: { intervalMs: 10_000, timeoutMs: 1_000, retryAttempts: 1 },
    T2: { intervalMs: 10_000, timeoutMs: 1_000, retryAttempts: 1 },
    T3: { intervalMs: 10_000, timeoutMs: 1_000, retryAttempts: 1 },
  };
  const start = new Date("2026-08-26T00:00:00Z");
  const next = nextPollAt("T2", start, 2, schedules, () => 1);
  assert.equal(next.getTime() - start.getTime(), 20_000);
});
