import assert from "node:assert/strict";
import test from "node:test";
import type { Article } from "../src/types";
import {
  articlesForNote,
  createNote,
  derivedAlertTerms,
  isNoteActive,
  matchArticle,
  matchNote,
  type ResearchNote,
} from "../src/lib/research/notes";

function article(overrides: Partial<Article>): Article {
  return {
    id: "a1",
    sourceId: "s1",
    sourceName: "Investing 채권",
    title: "",
    url: "https://example.com/a1",
    publishedAt: "2026-08-05T00:00:00.000Z",
    summary: null,
    tags: [],
    isRead: false,
    isSaved: false,
    createdAt: "2026-08-05T00:00:00.000Z",
    ...overrides,
  };
}

const NOW = new Date("2026-08-01T00:00:00.000Z");

function note(overrides: Partial<Parameters<typeof createNote>[0]> = {}): ResearchNote {
  return createNote(
    {
      title: "국제금융센터 8/1 이슈분석: 엔캐리 청산 리스크",
      origin: "국제금융센터",
      body: "엔 약세가 되돌려질 경우 캐리 청산이 글로벌 유동성에 미치는 영향",
      tags: ["환율", "일본"],
      keywords: ["엔캐리", "캐리 트레이드"],
      ...overrides,
    },
    NOW
  );
}

test("a note becomes a tracking axis with a shelf life", () => {
  const n = note();
  assert.ok(n.id.startsWith("note-"));
  assert.equal(n.archivedAt, null);
  assert.ok(isNoteActive(n, NOW));

  // 30 days by default, then it stops tracking on its own.
  assert.ok(!isNoteActive(n, new Date("2026-09-05T00:00:00.000Z")));
  assert.ok(isNoteActive(n, new Date("2026-08-29T00:00:00.000Z")));
});

test("archiving stops tracking regardless of the window", () => {
  const n = { ...note(), archivedAt: NOW.toISOString() };
  assert.ok(!isNoteActive(n, NOW));
});

test("a keyword in the headline outranks a shared tag", () => {
  const n = note();

  const tagOnly = matchNote(article({ title: "달러 강세 지속", tags: ["환율"] }), n);
  const keywordInTitle = matchNote(
    article({ title: "엔캐리 청산 우려에 아시아 증시 출렁", tags: [] }),
    n
  );

  assert.ok(tagOnly && keywordInTitle);
  assert.ok(
    keywordInTitle.score > tagOnly.score,
    "a headline about the actual subject should beat a neighbourhood tag"
  );
  assert.deepEqual(keywordInTitle.reasons, ["엔캐리"]);
});

test("a keyword found only in the summary counts for less than one in the title", () => {
  const n = note();
  const inTitle = matchNote(article({ title: "엔캐리 되돌림 본격화" }), n);
  const inSummary = matchNote(
    article({ title: "아시아 시장 동향", summary: "엔캐리 포지션이 축소되고 있다" }),
    n
  );
  assert.ok(inTitle && inSummary);
  assert.ok(inTitle.score > inSummary.score);
});

test("an unrelated article matches nothing", () => {
  assert.equal(matchNote(article({ title: "프로야구 개막전 매진", tags: ["경기"] }), note()), null);
});

test("matching skips notes whose window has closed", () => {
  const fresh = note();
  const stale = createNote(
    { title: "오래된 노트", origin: "메모", body: "", tags: ["환율"], keywords: [], watchDays: 1 },
    NOW
  );
  const later = new Date("2026-08-10T00:00:00.000Z");
  const matches = matchArticle(article({ title: "엔캐리 청산", tags: ["환율"] }), [fresh, stale], later);
  assert.deepEqual(matches.map((m) => m.noteId), [fresh.id]);
});

test("a note reaches back far enough to catch what prompted it", () => {
  const n = note(); // written 2026-08-01
  const longAgo = article({ id: "old", title: "엔캐리 사전 경고", publishedAt: "2026-07-20T00:00:00.000Z" });
  // The headline that prompted the note, from the day before it was written.
  const prompting = article({ id: "prompt", title: "엔캐리 청산 조짐", publishedAt: "2026-07-31T06:00:00.000Z" });
  const after = article({ id: "new", title: "엔캐리 청산 가속", publishedAt: "2026-08-04T00:00:00.000Z" });

  const collected = articlesForNote(n, [longAgo, prompting, after]);
  assert.deepEqual(
    collected.map((c) => c.article.id),
    ["new", "prompt"],
    "a fresh note should not look empty just because the news came first"
  );
});

test("a note's collection is newest first", () => {
  const n = note();
  const collected = articlesForNote(n, [
    article({ id: "mid", title: "엔캐리 관련", publishedAt: "2026-08-03T00:00:00.000Z" }),
    article({ id: "late", title: "엔캐리 확산", publishedAt: "2026-08-09T00:00:00.000Z" }),
    article({ id: "early", title: "엔캐리 조짐", publishedAt: "2026-08-02T00:00:00.000Z" }),
  ]);
  assert.deepEqual(collected.map((c) => c.article.id), ["late", "mid", "early"]);
});

test("alert terms are derived from active notes and deduplicated", () => {
  const a = note();
  const b = note({ title: "다른 노트", tags: ["환율", "금리"], keywords: ["엔캐리", "역레포"] });
  const terms = derivedAlertTerms([a, b], NOW);

  const values = terms.map((t) => `${t.type}:${t.value}`);
  assert.equal(new Set(values).size, values.length, "no duplicates across notes");
  assert.ok(values.includes("tag:환율"));
  assert.ok(values.includes("tag:금리"));
  assert.ok(values.includes("keyword:역레포"));
});

test("alert terms expire with their note", () => {
  const n = createNote(
    { title: "단기 추적", origin: "메모", body: "", tags: ["금리"], keywords: [], watchDays: 2 },
    NOW
  );
  assert.equal(derivedAlertTerms([n], NOW).length, 1);
  assert.equal(derivedAlertTerms([n], new Date("2026-08-10T00:00:00.000Z")).length, 0);
});

test("one-character keywords are dropped as too broad", () => {
  const n = note({ keywords: ["금", "엔캐리"] });
  assert.deepEqual(n.keywords, ["엔캐리"]);
});
