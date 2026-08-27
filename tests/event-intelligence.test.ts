import assert from "node:assert/strict";
import test from "node:test";
import {
  EVENT_MATCH_THRESHOLD,
  buildEventIntelligence,
  dedupeEventArticles,
  eventSimilarityV2,
  inferMarketImpacts,
  normalizeEventHeadline,
} from "../src/lib/events/eventIntelligence";

test("normalizes wire suffix and punctuation for duplicate headlines", () => {
  assert.equal(
    normalizeEventHeadline("Fed Cuts Rates by 25bp — Reuters"),
    normalizeEventHeadline("Fed cuts rates by 25bp | Reuters"),
  );
});

test("event V2 matches bilingual headlines through canonical macro anchors", () => {
  const score = eventSimilarityV2(
    { title: "Federal Reserve cuts rates by 25 basis points", tags: ["금리", "연준"] },
    { title: "연준, 기준금리 25bp 인하", tags: ["금리", "연준"] },
  );
  assert.ok(score >= EVENT_MATCH_THRESHOLD);
});

test("event V2 rejects different named entities sharing a generic market tag", () => {
  assert.equal(
    eventSimilarityV2(
      { title: "Nvidia raises guidance after AI demand surge", tags: ["증시", "AI"] },
      { title: "Samsung Electronics expands chip investment", tags: ["증시", "AI"] },
    ),
    0,
  );
});

test("Hormuz supply disruption maps to upward energy pressure", () => {
  const impacts = inferMarketImpacts({
    title: "Hormuz shipping disruption raises oil supply fears",
    tags: ["에너지", "유가"],
    marketChannels: ["energy"],
  });
  const energy = impacts.find((impact) => impact.channel === "energy");
  assert.equal(energy?.direction, "up");
  assert.ok((energy?.score ?? 0) >= 80);
});

test("event desk score rewards independent sources, official confirmation and breadth", () => {
  const intelligence = buildEventIntelligence({
    title: "Bank of Korea raises policy rate",
    tags: ["금리", "한국은행"],
    regions: ["KR"],
    marketChannels: ["rates", "fx", "equities"],
    latestPublishedAt: new Date(),
    coverageCount: 3,
    importanceScore: 65,
    primarySourceName: "Bank of Korea",
    officialSourceName: "Bank of Korea",
  }, [
    { title: "Bank of Korea raises policy rate", sourceName: "Bank of Korea", sourceTier: "T0", publishedAt: new Date(), importanceScore: 65, tags: ["금리", "한국은행"] },
    { title: "BOK hikes rate as inflation pressure persists", sourceName: "Reuters", sourceTier: "T1", publishedAt: new Date(), importanceScore: 60, tags: ["금리", "한국은행"] },
    { title: "한국은행, 기준금리 인상", sourceName: "연합뉴스", sourceTier: "T1", publishedAt: new Date(), importanceScore: 61, tags: ["금리", "한국은행"] },
  ]);

  assert.ok(intelligence.deskScore >= 90);
  assert.equal(intelligence.confidence, "high");
  assert.equal(intelligence.distinctSources, 3);
  assert.ok(intelligence.importanceReasons.includes("공식 소스 확인"));
});

test("evidence list removes same-source duplicate rows", () => {
  const deduped = dedupeEventArticles([
    { id: "1", title: "Fed cuts rates", sourceName: "Reuters", sourceTier: "T1", publishedAt: new Date(), tags: ["금리"] },
    { id: "2", title: "Fed cuts rates", sourceName: "Reuters", sourceTier: "T1", publishedAt: new Date(), tags: ["금리"] },
    { id: "3", title: "Fed cuts rates", sourceName: "Bloomberg", sourceTier: "T1", publishedAt: new Date(), tags: ["금리"] },
  ]);
  assert.equal(deduped.length, 2);
});
