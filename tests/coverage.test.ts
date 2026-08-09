import assert from "node:assert/strict";
import test from "node:test";
import type { Article } from "../src/types";
import { computeCoverage } from "../src/lib/clustering/coverage";

let seq = 0;
function article(overrides: Partial<Article>): Article {
  seq++;
  return {
    id: `a${seq}`,
    sourceId: "s1",
    sourceName: "연합인포맥스",
    title: "",
    url: `https://example.com/${seq}`,
    publishedAt: "2026-08-09T09:00:00.000Z",
    summary: null,
    tags: ["금리"],
    isRead: false,
    isSaved: false,
    createdAt: "2026-08-09T09:00:00.000Z",
    ...overrides,
  };
}

test("two outlets on the same story corroborate each other", () => {
  const a = article({ sourceName: "연합인포맥스", title: "연준 기준금리 25bp 인하 결정" });
  const b = article({ sourceName: "Reuters", title: "연준 기준금리 인하 25bp 단행" });

  const cov = computeCoverage([a, b]);
  assert.equal(cov.get(a.id)?.outlets, 2);
  assert.equal(cov.get(b.id)?.outlets, 2, "both sides of the pair carry the same count");
  assert.deepEqual(cov.get(a.id)?.names.sort(), ["Reuters", "연합인포맥스"]);
});

test("one newsroom filing three times is still one newsroom", () => {
  // An update, a correction and a roundup from the same desk is not
  // corroboration, which is the trap counting articles would fall into.
  const same = [
    article({ sourceName: "연합인포맥스", title: "연준 기준금리 25bp 인하 결정" }),
    article({ sourceName: "연합인포맥스", title: "연준 기준금리 인하 25bp 확정" }),
    article({ sourceName: "연합인포맥스", title: "연준 기준금리 25bp 인하 종합" }),
  ];
  assert.equal(computeCoverage(same).size, 0);
});

test("unrelated stories are not merged", () => {
  const rates = article({ sourceName: "연합인포맥스", title: "연준 기준금리 25bp 인하 결정" });
  const oil = article({ sourceName: "Reuters", title: "브렌트유 배럴당 84달러 상승", tags: ["에너지"] });
  assert.equal(computeCoverage([rates, oil]).size, 0);
});

test("a shared tag alone is not enough without shared wording", () => {
  const a = article({ sourceName: "연합인포맥스", title: "연준 기준금리 25bp 인하 결정" });
  const b = article({ sourceName: "Reuters", title: "국고채 발행 계획 발표" });
  assert.equal(computeCoverage([a, b]).size, 0, "same tag, nothing else in common");
});

test("filings more than six hours apart are separate events", () => {
  const morning = article({
    sourceName: "연합인포맥스",
    title: "연준 기준금리 25bp 인하 결정",
    publishedAt: "2026-08-09T01:00:00.000Z",
  });
  const evening = article({
    sourceName: "Reuters",
    title: "연준 기준금리 25bp 인하 결정",
    publishedAt: "2026-08-09T12:00:00.000Z",
  });
  assert.equal(computeCoverage([morning, evening]).size, 0);
});

test("a wider story reports every outlet on it", () => {
  const group = ["연합인포맥스", "Reuters", "Bloomberg Markets", "CNBC Economy"].map((sourceName) =>
    article({ sourceName, title: "연준 기준금리 25bp 인하 결정" })
  );
  const cov = computeCoverage(group);
  for (const a of group) {
    assert.equal(cov.get(a.id)?.outlets, 4);
  }
  assert.equal(new Set(cov.get(group[0].id)!.names).size, 4, "names are deduplicated");
});

test("duplicate outlets inside a wider story do not inflate the count", () => {
  const group = [
    article({ sourceName: "연합인포맥스", title: "연준 기준금리 25bp 인하 결정" }),
    article({ sourceName: "연합인포맥스", title: "연준 기준금리 25bp 인하 종합" }),
    article({ sourceName: "Reuters", title: "연준 기준금리 25bp 인하 단행" }),
  ];
  const cov = computeCoverage(group);
  assert.equal(cov.get(group[0].id)?.outlets, 2, "three articles, two newsrooms");
});

test("articles with no corroboration are absent, so callers can skip them", () => {
  const lone = article({ sourceName: "연합인포맥스", title: "서울 아파트 매매가 3주 연속 둔화", tags: ["부동산"] });
  const other = article({ sourceName: "Reuters", title: "연준 기준금리 25bp 인하 결정" });
  const cov = computeCoverage([lone, other]);
  assert.equal(cov.has(lone.id), false);
  assert.equal(cov.size, 0);
});

test("an empty or single-article list is handled", () => {
  assert.equal(computeCoverage([]).size, 0);
  assert.equal(computeCoverage([article({})]).size, 0);
});

/*
 * The cases below are real false positives observed on production after the
 * first release: English headlines matched on "of", "as", "to" and "hit"
 * because the stop-word list was Korean-only.
 */

test("English headlines do not match on function words", () => {
  const hongKong = article({
    sourceName: "South China Morning Post",
    title: "8% of owners at fire-hit Hong Kong estate yet to accept buy-back as deadline nears",
    tags: ["중국"],
  });
  const israel = article({
    sourceName: "CNBC Top News",
    title: "Matter of pure force: US, Israeli physical presence as leverage",
    tags: ["중국"],
  });
  assert.equal(
    computeCoverage([hongKong, israel]).size,
    0,
    'shared "of" and "as" is not a shared story'
  );
});

test("a three-letter overlap is not corroboration", () => {
  const fire = article({
    sourceName: "South China Morning Post",
    title: "8% of owners at fire-hit Hong Kong estate yet to accept buy-back",
    tags: ["중국"],
  });
  const typhoon = article({
    sourceName: "CNBC Top News",
    title: "Typhoon Dolphin set to hit China's eastern coast",
    tags: ["중국"],
  });
  assert.equal(computeCoverage([fire, typhoon]).size, 0, '"hit" and "to" is coincidence');
});

test("a common country name alone does not group unrelated stories", () => {
  const typhoon = article({
    sourceName: "CNBC Top News",
    title: "Typhoon Dolphin set to hit China's eastern coast",
    tags: ["중국"],
  });
  const brain = article({
    sourceName: "South China Morning Post",
    title: "China races to develop brain-computer interface technology",
    tags: ["중국"],
  });
  assert.equal(computeCoverage([typhoon, brain]).size, 0);
});

test("genuine English corroboration still registers", () => {
  const a = article({
    sourceName: "Reuters",
    title: "Federal Reserve cuts benchmark interest rate by 25 basis points",
    tags: ["연준"],
  });
  const b = article({
    sourceName: "Bloomberg Markets",
    title: "Federal Reserve delivers quarter-point interest rate cut",
    tags: ["연준"],
  });
  const cov = computeCoverage([a, b]);
  assert.equal(cov.get(a.id)?.outlets, 2, "real shared subject matter should still group");
});

test("keyword matching ignores case", () => {
  const a = article({ sourceName: "Reuters", title: "FEDERAL RESERVE cuts INTEREST rate", tags: ["연준"] });
  const b = article({ sourceName: "CNBC Economy", title: "Federal Reserve trims interest rate", tags: ["연준"] });
  assert.equal(computeCoverage([a, b]).get(a.id)?.outlets, 2);
});
