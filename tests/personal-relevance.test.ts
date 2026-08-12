import assert from "node:assert/strict";
import test from "node:test";
import type { Article } from "../src/types";
import {
  DEFAULT_PERSONAL_RELEVANCE_PROFILE,
  extractPersonalContext,
  scorePersonalRelevance,
  type PersonalInteraction,
} from "../src/lib/personalization/relevance";

function article(overrides: Partial<Article> = {}): Article {
  return {
    id: "article-1",
    sourceId: "source-1",
    sourceName: "Example Wire",
    sourceTier: "T1",
    title: "Federal Reserve keeps rates steady as Treasury yields rise",
    url: "https://example.com/article-1",
    publishedAt: "2026-08-12T08:00:00.000Z",
    summary: null,
    tags: ["연준", "금리"],
    importanceTier: "critical",
    importanceScore: 80,
    importanceReasons: ["통화정책"],
    isRead: false,
    isSaved: false,
    createdAt: "2026-08-12T08:00:00.000Z",
    ...overrides,
  };
}

const now = new Date("2026-08-12T09:00:00.000Z").getTime();

test("scores high-preference topics above low-preference topics without changing importance", () => {
  const rates = article();
  const crypto = article({
    id: "crypto",
    title: "Bitcoin trading volume rises",
    tags: ["크립토"],
    importanceScore: 80,
  });
  const ratesScore = scorePersonalRelevance(rates, { now });
  const cryptoScore = scorePersonalRelevance(crypto, { now });

  assert.ok(ratesScore.score > cryptoScore.score);
  assert.equal(rates.importanceScore, crypto.importanceScore, "general importance stays independent");
  assert.equal(ratesScore.isHigh, true);
  assert.match(ratesScore.reasons.join(" "), /Rates|Fed/);
});

test("multiple relevant topics produce a short explainable reason list", () => {
  const result = scorePersonalRelevance(article({
    title: "Fed rates push the dollar higher as Korean semiconductor exports accelerate",
    tags: ["연준", "금리", "환율", "반도체", "수출입"],
  }), { now });
  assert.ok(result.topics.length >= 3);
  assert.ok(result.reasons.length >= 1 && result.reasons.length <= 3);
  assert.equal(result.isHigh, true);
});

test("saved and opened interactions lift related stories but stay capped", () => {
  const candidate = article({ id: "candidate", isSaved: false, isRead: false });
  const baseline = scorePersonalRelevance(candidate, { now });
  const interactions: PersonalInteraction[] = [
    {
      articleId: "older-fed-story",
      type: "saved",
      at: "2026-08-12T07:00:00.000Z",
      topics: ["rates", "fed"],
      assets: ["US2Y", "US10Y"],
    },
    {
      articleId: "another-fed-story",
      type: "opened",
      at: "2026-08-12T07:30:00.000Z",
      topics: ["rates"],
      assets: ["US2Y"],
    },
  ];
  const learned = scorePersonalRelevance(candidate, { now, interactions });
  assert.ok(learned.score > baseline.score);
  assert.ok(learned.factors.interactionHistory <= 10);
});

test("a dismissed story records negative feedback separately from importance", () => {
  const candidate = article({ id: "dismissed-candidate" });
  const baseline = scorePersonalRelevance(candidate, { now });
  const dismissed = scorePersonalRelevance(candidate, {
    now,
    interactions: [{
      articleId: candidate.id,
      type: "dismissed",
      at: "2026-08-12T08:30:00.000Z",
      topics: ["rates", "fed"],
      assets: ["US2Y", "US10Y"],
    }],
  });

  assert.ok(dismissed.score < baseline.score);
  assert.equal(candidate.importanceScore, 80);
});

test("asset relevance maps policy, oil, semiconductors, Korea FX, and crypto deterministically", () => {
  assert.deepEqual(
    extractPersonalContext(article()).assets.filter((asset) => ["US2Y", "US10Y", "DXY", "SOX"].includes(asset)).sort(),
    ["DXY", "SOX", "US10Y", "US2Y"],
  );
  assert.ok(extractPersonalContext(article({ title: "WTI rises as OPEC supply tightens", tags: ["에너지"] })).assets.includes("WTI"));
  assert.ok(extractPersonalContext(article({ title: "Nvidia leads semiconductor capex", tags: ["반도체"] })).assets.includes("SOXL"));
  assert.ok(extractPersonalContext(article({ title: "원달러 환율 급등", tags: ["환율", "한국"] })).assets.includes("USD/KRW"));
  assert.ok(extractPersonalContext(article({ title: "Bitcoin ETF inflows rise", tags: ["크립토"] })).assets.includes("BTC"));
});

test("the initial profile remains explicit data, not scoring constants", () => {
  assert.equal(DEFAULT_PERSONAL_RELEVANCE_PROFILE.topicWeights.rates, 10);
  assert.equal(DEFAULT_PERSONAL_RELEVANCE_PROFILE.topicWeights.crypto, 4);
  assert.ok(DEFAULT_PERSONAL_RELEVANCE_PROFILE.followedAssets.includes("SOX"));
});
