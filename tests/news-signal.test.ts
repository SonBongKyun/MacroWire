import assert from "node:assert/strict";
import test from "node:test";
import type { Article } from "../src/types";
import {
  classifyArticleSignal,
  isMacroSignal,
} from "../src/lib/news/signal";

function article(overrides: Partial<Article>): Article {
  return {
    id: "article-1",
    sourceId: "source-1",
    sourceName: "Reuters",
    title: "",
    url: "https://example.com/article",
    publishedAt: "2026-07-28T00:00:00.000Z",
    summary: null,
    tags: [],
    isRead: false,
    isSaved: false,
    createdAt: "2026-07-28T00:00:00.000Z",
    ...overrides,
  };
}

test("ranks central-bank policy as a critical macro signal", () => {
  const signal = classifyArticleSignal(article({
    sourceName: "Federal Reserve",
    title: "Fed holds interest rates steady as inflation cools",
    tags: ["미국", "연준", "금리"],
  }));

  assert.equal(signal.tier, "critical");
  assert.ok(signal.score >= 70);
  assert.ok(signal.reasons.includes("통화정책"));
});

test("recognizes an FX move as an important signal without relying on tags", () => {
  const signal = classifyArticleSignal(article({
    title: "원·달러 환율 장중 1,420원 돌파",
  }));

  assert.equal(signal.tier, "important");
  assert.ok(signal.reasons.includes("금융시장"));
});

test("does not promote sports news carrying an ambiguous 경기 tag", () => {
  const signal = classifyArticleSignal(article({
    sourceName: "연합뉴스 속보",
    title: "프로야구 경기종료, 홈런 두 방으로 역전 우승",
    tags: ["속보", "경기", "한국"],
  }));

  assert.equal(signal.tier, "general");
  assert.equal(isMacroSignal(article({
    title: "축구 대표팀 감독, 월드컵 경기 선수 명단 발표",
    tags: ["경기"],
  })), false);
});

test("keeps macro breaking news while filtering entertainment breaking news", () => {
  const macro = classifyArticleSignal(article({
    sourceName: "연합뉴스 속보",
    title: "한국은행 기준금리 동결, 환율 변동성 주시",
    tags: ["속보", "금리", "환율"],
  }));
  const entertainment = classifyArticleSignal(article({
    sourceName: "연합뉴스 속보",
    title: "인기 걸그룹 음악방송 1위",
    tags: ["속보", "한국"],
  }));

  assert.equal(macro.isBreaking, true);
  assert.equal(macro.tier, "critical");
  assert.equal(entertainment.tier, "general");
});
