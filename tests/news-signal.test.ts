import assert from "node:assert/strict";
import test from "node:test";
import type { Article } from "../src/types";
import {
  classifyArticleSignal,
  isBreakingArticle,
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

test("uses one strict breaking rule for stored wire articles", () => {
  assert.equal(isBreakingArticle(article({
    sourceName: "Bloomberg Markets",
    sourceTier: "T1",
    title: "Company reports quarterly earnings",
    importanceScore: 64,
    importanceTier: "major",
  })), false);
  assert.equal(isBreakingArticle(article({
    sourceName: "Federal Reserve",
    sourceTier: "T0",
    title: "Federal Reserve issues policy decision",
    importanceScore: 74,
    importanceTier: "critical",
  })), true);
  assert.equal(isBreakingArticle(article({
    sourceName: "CNBC Breaking",
    sourceTier: "T1",
    title: "Breaking CPI release",
    tags: ["속보", "물가"],
    importanceScore: 45,
    importanceTier: "major",
  })), true);
});

test("does not trust broad AI or geopolitics tags without textual evidence", () => {
  const corporate = classifyArticleSignal(article({
    sourceName: "CNBC Breaking",
    title: "Coca-Cola is about to report earnings. Here's what to expect",
    tags: ["속보", "AI"],
  }));
  const crime = classifyArticleSignal(article({
    sourceName: "연합뉴스 속보",
    title: "'자수하러 왔는데요' 관심도 매뉴얼도 없는 경찰",
    tags: ["속보", "지정학"],
  }));

  assert.equal(corporate.tier, "general");
  assert.equal(crime.tier, "general");
});

test("requires market impact or a major escalation for geopolitical alerts", () => {
  const militaryHardware = classifyArticleSignal(article({
    sourceName: "연합뉴스 속보",
    title: "레이저무기·초음속미사일 무장, 상륙전력 과시",
    tags: ["속보", "지정학"],
  }));
  const marketImpact = classifyArticleSignal(article({
    sourceName: "Bloomberg Markets",
    title: "Iran conflict sends oil higher and pressures global stock markets",
    tags: ["속보", "지정학", "에너지"],
  }));
  const majorEscalation = classifyArticleSignal(article({
    sourceName: "연합뉴스 속보",
    title: "인접국 침공으로 전쟁 발발",
    tags: ["속보", "지정학"],
  }));

  assert.equal(militaryHardware.tier, "general");
  assert.notEqual(marketImpact.tier, "general");
  assert.notEqual(majorEscalation.tier, "general");
});

test("keeps AI and semiconductor stories when the title contains market evidence", () => {
  const signal = classifyArticleSignal(article({
    title: "AI hardware stocks plunge on semiconductor export restrictions",
    tags: ["AI", "반도체"],
  }));

  assert.notEqual(signal.tier, "general");
  assert.ok(signal.reasons.includes("AI 산업"));
});

test("commodity headlines beyond oil and gas now register", () => {
  // The 원자재 tag and the precious-metal text signal were added when the
  // Investing 원자재 feed landed almost entirely untagged.
  const grain = classifyArticleSignal(article({
    sourceName: "Investing 원자재",
    title: "시카고 밀, 3개월 만에 월간 첫 상승",
    tags: ["원자재"],
  }));
  assert.ok(grain.score > 4, `expected a score above the floor, got ${grain.score}`);
  assert.ok(grain.reasons.includes("원자재"));

  const gold = classifyArticleSignal(article({
    sourceName: "Investing 원자재",
    title: "국제 금값 온스당 4,100달러 돌파",
    tags: ["원자재"],
  }));
  assert.equal(gold.tier, "important");
});

test("equity moves alone stay general, but promote when a macro cause is present", () => {
  const equityOnly = classifyArticleSignal(article({
    sourceName: "Investing 분석",
    title: "연이틀 서킷브레이커 발동된 증시 : 개인의 투매가 나온 폭락장",
    tags: ["증시"],
  }));
  assert.equal(equityOnly.tier, "general", "an equity selloff on its own is market colour");

  const withCause = classifyArticleSignal(article({
    sourceName: "Investing 분석",
    title: "국채 금리 급등에 증시 급락…연준 인하 기대 후퇴",
    tags: ["증시", "금리"],
  }));
  assert.notEqual(withCause.tier, "general", "a rates-driven selloff is a macro signal");
});
