import assert from "node:assert/strict";
import test from "node:test";
import { PLANS } from "../src/lib/billing/plans";
import {
  articleRangeStart,
  isSourceTierAllowed,
  normalizeArticleRange,
  resolveArticleRange,
} from "../src/lib/billing/entitlements";

test("normalizes unknown article ranges to the safe 24h default", () => {
  assert.equal(normalizeArticleRange(null), "24h");
  assert.equal(normalizeArticleRange("garbage"), "24h");
  assert.equal(normalizeArticleRange("7d"), "7d");
  assert.equal(normalizeArticleRange("30d"), "30d");
});

test("FREE article history is clamped to 24 hours", () => {
  assert.deepEqual(resolveArticleRange("30d", PLANS.free), {
    requestedRange: "30d",
    effectiveRange: "24h",
    restricted: true,
  });
  assert.deepEqual(resolveArticleRange("7d", PLANS.free), {
    requestedRange: "7d",
    effectiveRange: "24h",
    restricted: true,
  });
});

test("PRO and ELITE can use the full 30-day news window", () => {
  assert.equal(resolveArticleRange("30d", PLANS.pro).effectiveRange, "30d");
  assert.equal(resolveArticleRange("30d", PLANS.elite).effectiveRange, "30d");
});

test("FREE excludes T3 community/analysis sources while paid plans keep them", () => {
  assert.equal(isSourceTierAllowed("T0", PLANS.free), true);
  assert.equal(isSourceTierAllowed("T1", PLANS.free), true);
  assert.equal(isSourceTierAllowed("T2", PLANS.free), true);
  assert.equal(isSourceTierAllowed("T3", PLANS.free), false);
  assert.equal(isSourceTierAllowed("T3", PLANS.pro), true);
});

test("range start is deterministic from the supplied clock", () => {
  const now = new Date("2026-08-26T00:00:00.000Z");
  assert.equal(articleRangeStart("24h", now).toISOString(), "2026-08-25T00:00:00.000Z");
  assert.equal(articleRangeStart("7d", now).toISOString(), "2026-08-19T00:00:00.000Z");
  assert.equal(articleRangeStart("30d", now).toISOString(), "2026-07-27T00:00:00.000Z");
});
