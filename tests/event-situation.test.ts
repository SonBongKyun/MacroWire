import assert from "node:assert/strict";
import test from "node:test";
import {
  buildEventIntelligence,
  deriveLatestUpdate,
  extractExplicitFacts,
  scoreEventConfirmation,
  scoreEventPriority,
  scoreSourceQuality,
} from "../src/lib/events/eventIntelligence";

const NOW = new Date("2026-08-28T00:00:00Z");
const ago = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000);

const fedBase = {
  title: "Federal Reserve cuts rates",
  tags: ["금리", "연준"],
  regions: ["US"],
  marketChannels: ["rates", "fx", "equities"],
  coverageCount: 1,
  importanceScore: 70,
  primarySourceName: "Reuters",
  officialSourceName: null,
};

test("explicit fact extraction keeps market-sized values but ignores bare numbers", () => {
  const facts = extractExplicitFacts("Fed cut 25bp to 4.50% in 2026; balance sheet was $6.7 trillion.");
  assert.ok(facts.some((fact) => fact.toLowerCase().includes("25bp")));
  assert.ok(facts.some((fact) => fact.includes("4.50%")));
  assert.ok(facts.some((fact) => fact.toLowerCase().includes("$6.7 trillion")));
  assert.ok(!facts.some((fact) => fact === "2026"));
});

test("latest update identifies a genuinely new percentage as new fact", () => {
  const update = deriveLatestUpdate([
    { title: "Fed cuts rates by 25bp", sourceName: "Reuters", sourceTier: "T1", publishedAt: ago(12), tags: ["금리", "연준"] },
    { title: "Fed cuts rates by 25bp to 4.50%", sourceName: "Bloomberg", sourceTier: "T1", publishedAt: ago(2), tags: ["금리", "연준"] },
  ]);
  assert.equal(update?.kind, "new_fact");
  assert.ok(update?.newFacts.includes("4.50%"));
  assert.ok(!update?.newFacts.some((fact) => fact.toLowerCase().includes("25bp")));
});

test("a new outlet without new facts is classified as confirmation", () => {
  const update = deriveLatestUpdate([
    { title: "BOK raises policy rate", sourceName: "Reuters", sourceTier: "T1", publishedAt: ago(10), tags: ["금리"] },
    { title: "BOK raises policy rate", sourceName: "Bloomberg", sourceTier: "T1", publishedAt: ago(1), tags: ["금리"] },
  ]);
  assert.equal(update?.kind, "confirmation");
});

test("same outlet follow-up without new facts is classified as follow-up", () => {
  const update = deriveLatestUpdate([
    { title: "OPEC keeps output policy unchanged", sourceName: "Reuters", sourceTier: "T1", publishedAt: ago(20), tags: ["에너지"] },
    { title: "OPEC keeps output policy unchanged after meeting", sourceName: "Reuters", sourceTier: "T1", publishedAt: ago(2), tags: ["에너지"] },
  ]);
  assert.equal(update?.kind, "follow_up");
});

test("official and top-tier independent sources produce stronger confirmation", () => {
  const single = [
    { title: "Fed decision", sourceName: "Blog mirror", sourceTier: "T3" as const, publishedAt: ago(2), tags: ["금리"] },
  ];
  const confirmed = [
    { title: "Fed decision", sourceName: "Federal Reserve", sourceTier: "T0" as const, publishedAt: ago(4), tags: ["금리"] },
    { title: "Fed decision", sourceName: "Reuters", sourceTier: "T1" as const, publishedAt: ago(3), tags: ["금리"] },
    { title: "Fed decision", sourceName: "Bloomberg", sourceTier: "T1" as const, publishedAt: ago(2), tags: ["금리"] },
  ];
  assert.ok(scoreSourceQuality(confirmed) > scoreSourceQuality(single));
  assert.ok(
    scoreEventConfirmation({ officialSourceName: "Federal Reserve" }, confirmed)
      > scoreEventConfirmation({ officialSourceName: null }, single),
  );
});

test("fresh single-source event starts as flash", () => {
  const result = buildEventIntelligence({
    ...fedBase,
    firstSeenAt: ago(3),
    latestPublishedAt: ago(2),
  }, [
    { title: "Fed signals emergency meeting", sourceName: "Reuters", sourceTier: "T1", publishedAt: ago(2), importanceScore: 70, tags: ["금리", "연준"] },
  ], NOW.getTime());
  assert.equal(result.lifecycle, "flash");
});

test("independent reporting moves an event to developing before strong confirmation", () => {
  const result = buildEventIntelligence({
    ...fedBase,
    coverageCount: 2,
    firstSeenAt: ago(25),
    latestPublishedAt: ago(3),
  }, [
    { title: "Fed discusses policy shift", sourceName: "Reuters", sourceTier: "T1", publishedAt: ago(20), importanceScore: 70, tags: ["금리", "연준"] },
    { title: "Fed discusses policy shift", sourceName: "FT", sourceTier: "T2", publishedAt: ago(3), importanceScore: 62, tags: ["금리", "연준"] },
  ], NOW.getTime());
  assert.equal(result.lifecycle, "developing");
});

test("official plus independent coverage becomes confirmed", () => {
  const result = buildEventIntelligence({
    ...fedBase,
    coverageCount: 2,
    officialSourceName: "Federal Reserve",
    primarySourceName: "Federal Reserve",
    firstSeenAt: ago(30),
    latestPublishedAt: ago(2),
  }, [
    { title: "Federal Reserve cuts rates by 25bp", sourceName: "Federal Reserve", sourceTier: "T0", publishedAt: ago(5), importanceScore: 75, tags: ["금리", "연준"] },
    { title: "Fed cuts rates by 25bp", sourceName: "Reuters", sourceTier: "T1", publishedAt: ago(2), importanceScore: 72, tags: ["금리", "연준"] },
  ], NOW.getTime());
  assert.equal(result.lifecycle, "confirmed");
  assert.equal(result.confidence, "high");
});

test("an event with no recent update cools even if its desk score stays high", () => {
  const event = {
    ...fedBase,
    coverageCount: 3,
    officialSourceName: "Federal Reserve",
    firstSeenAt: ago(360),
    latestPublishedAt: ago(240),
  };
  const evidence = [
    { title: "Federal Reserve cuts rates", sourceName: "Federal Reserve", sourceTier: "T0" as const, publishedAt: ago(300), importanceScore: 75, tags: ["금리", "연준"] },
    { title: "Fed cuts rates", sourceName: "Reuters", sourceTier: "T1" as const, publishedAt: ago(260), importanceScore: 72, tags: ["금리", "연준"] },
    { title: "Fed cuts rates", sourceName: "Bloomberg", sourceTier: "T1" as const, publishedAt: ago(240), importanceScore: 72, tags: ["금리", "연준"] },
  ];
  const result = buildEventIntelligence(event, evidence, NOW.getTime());
  assert.equal(result.lifecycle, "cooling");
  assert.ok(result.deskScore >= 85);
  assert.ok(result.pulseScore < result.deskScore);
});

test("desk score is stable across time while pulse decays with freshness", () => {
  const event = {
    ...fedBase,
    coverageCount: 2,
    firstSeenAt: ago(15),
    latestPublishedAt: ago(2),
  };
  const evidence = [
    { title: "Fed cuts rates by 25bp", sourceName: "Reuters", sourceTier: "T1" as const, publishedAt: ago(5), importanceScore: 70, tags: ["금리", "연준"] },
    { title: "Fed cuts rates by 25bp", sourceName: "Bloomberg", sourceTier: "T1" as const, publishedAt: ago(2), importanceScore: 70, tags: ["금리", "연준"] },
  ];
  const fresh = buildEventIntelligence(event, evidence, NOW.getTime());
  const later = buildEventIntelligence(event, evidence, NOW.getTime() + 5 * 60 * 60_000);
  assert.equal(fresh.deskScore, later.deskScore);
  assert.ok(fresh.pulseScore > later.pulseScore);
});

test("scoreEventPriority no longer changes with wall clock time", () => {
  const event = {
    coverageCount: 3,
    importanceScore: 64,
    officialSourceName: "Bank of Korea",
    latestPublishedAt: NOW,
    marketChannels: ["rates", "fx"],
  };
  const now = scoreEventPriority(event, 3, NOW.getTime());
  const tomorrow = scoreEventPriority(event, 3, NOW.getTime() + 24 * 60 * 60_000);
  assert.deepEqual(now, tomorrow);
});
