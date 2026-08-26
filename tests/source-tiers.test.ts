import assert from "node:assert/strict";
import test from "node:test";
import {
  failureBackoffMs,
  getTierSchedules,
  inferSourceTier,
  isFallbackTier,
  nextPollAt,
} from "../src/lib/ingest/sourceTiers";

test("assigns official, breaking, market, and background sources to distinct tiers", () => {
  assert.equal(inferSourceTier({ name: "Federal Reserve", category: "정책" }), "T0");
  assert.equal(inferSourceTier({ name: "Bloomberg Markets", category: "글로벌" }), "T1");
  assert.equal(inferSourceTier({ name: "MarketWatch Markets", category: "글로벌" }), "T2");
  assert.equal(inferSourceTier({ name: "Hacker News", category: "커뮤니티" }), "T3");
});

test("uses faster cadence for breaking sources than market and background feeds", () => {
  const schedules = getTierSchedules({});
  assert.ok(schedules.T1.intervalMs < schedules.T2.intervalMs);
  assert.ok(schedules.T2.intervalMs < schedules.T3.intervalMs);
  assert.equal(
    nextPollAt("T1", new Date(0), 0, schedules, () => 0.5).getTime(),
    schedules.T1.intervalMs,
  );
});

test("backs off repeated failures without exceeding the cap", () => {
  const first = failureBackoffMs("T1", 1, getTierSchedules({}));
  const fourth = failureBackoffMs("T1", 4, getTierSchedules({}));
  assert.ok(fourth > first);
  assert.ok(failureBackoffMs("T1", 99, getTierSchedules({})) <= 30 * 60_000);
});

test("limits the scheduled fallback to T0 and T1", () => {
  assert.equal(isFallbackTier("T0"), true);
  assert.equal(isFallbackTier("T1"), true);
  assert.equal(isFallbackTier("T2"), false);
  assert.equal(isFallbackTier("T3"), false);
});
