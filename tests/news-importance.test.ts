import assert from "node:assert/strict";
import test from "node:test";
import { classifyNewsImportance, type ImportanceInput } from "../src/lib/news/importance";

const now = new Date("2026-08-11T12:00:00.000Z");

function article(overrides: Partial<ImportanceInput> = {}): ImportanceInput {
  return {
    title: "Federal Reserve holds interest rates steady",
    summary: null,
    tags: ["속보", "연준", "금리"],
    sourceName: "Federal Reserve",
    sourceTier: "T0",
    publishedAt: "2026-08-11T11:55:00.000Z",
    ...overrides,
  };
}

test("keeps concrete central-bank decisions above the high-signal alert line", () => {
  const importance = classifyNewsImportance(article(), now.getTime());

  assert.equal(importance.tier, "critical");
  assert.ok(importance.score >= 70);
});

test("demotes incidental property tags on general political breaking news", () => {
  const importance = classifyNewsImportance(article({
    title: "청, '무단 증축' 논란 춘추관장 징계 후 면직",
    tags: ["속보", "부동산"],
    sourceName: "연합뉴스 속보",
    sourceTier: "T1",
  }), now.getTime());

  assert.equal(importance.tier, "general");
  assert.ok(importance.score < 38);
});

test("demotes party rhetoric carrying only a broad fiscal tag", () => {
  const importance = classifyNewsImportance(article({
    title: "국힘, 세제개편안 비판…사과하고 원점 재검토하라",
    tags: ["속보", "재정"],
    sourceName: "연합뉴스 속보",
    sourceTier: "T1",
  }), now.getTime());

  assert.equal(importance.tier, "general");
  assert.ok(importance.score < 38);
});

test("keeps specific housing-market and fiscal actions above the Discord line", () => {
  const housing = classifyNewsImportance(article({
    title: "서울 주택가격 급등, 주택담보대출 증가세 확대",
    tags: ["속보", "부동산", "가계부채"],
    sourceName: "연합뉴스 속보",
    sourceTier: "T1",
  }), now.getTime());
  const fiscal = classifyNewsImportance(article({
    title: "정부, 경기 대응 위해 30조원 추경 예산안 발표",
    tags: ["속보", "재정"],
    sourceName: "연합뉴스 속보",
    sourceTier: "T1",
  }), now.getTime());

  assert.ok(housing.score >= 55);
  assert.ok(fiscal.score >= 55);
});
