/**
 * Research notes — the bridge between deep reading and the wire.
 *
 * The desk is fast and shallow by design. The material that actually moves a
 * view arrives from somewhere else: a KCIF issue paper, an Investing.com
 * analysis piece, a bank's outlook. Those are slow artefacts, and reading one
 * changes how the next two weeks of headlines should be read.
 *
 * A note records that shift. Its tags and keywords become a tracking axis, and
 * every article that arrives afterwards is matched against it, so the note
 * accumulates the story that followed. Neither the source nor a plain wire does
 * this.
 *
 * Matching is a pure function over article fields the app already stores —
 * nothing here fetches, scrapes, or reproduces anything from the source. The
 * URL on a note is the reader's own bookmark.
 */

import type { Article } from "../../types";

export interface ResearchNote {
  id: string;
  /** "국제금융센터 8/1 이슈분석: 엔캐리 청산 리스크" */
  title: string;
  /** Where it came from, free text: 국제금융센터, Investing.com, 자체 메모… */
  origin: string;
  /** The reader's own link back to the material. Never fetched. */
  url?: string;
  /** What the reader took away from it. */
  body: string;
  /** Tracking axis drawn from the tag vocabulary. */
  tags: string[];
  /** Extra terms the tagger has no rule for: 엔캐리, 베센트, 역레포… */
  keywords: string[];
  createdAt: string;
  /** Tracking stops here; a view has a shelf life. */
  watchUntil: string;
  archivedAt: string | null;
}

export type NoteDraft = Omit<
  ResearchNote,
  "id" | "createdAt" | "watchUntil" | "archivedAt"
> & { watchDays?: number };

export const DEFAULT_WATCH_DAYS = 30;

export interface NoteMatch {
  noteId: string;
  /** Why it matched, for display: ["#금리", "엔캐리"]. */
  reasons: string[];
  /** Tag hits are a weaker signal than a distinctive keyword. */
  score: number;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

/** Keywords shorter than this match too much to be useful. */
const MIN_KEYWORD_LENGTH = 2;

export function createNote(draft: NoteDraft, now = new Date()): ResearchNote {
  const watchDays = draft.watchDays ?? DEFAULT_WATCH_DAYS;
  return {
    id: `note-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    title: draft.title.trim(),
    origin: draft.origin.trim(),
    url: draft.url?.trim() || undefined,
    body: draft.body.trim(),
    tags: [...new Set(draft.tags.map((t) => t.trim()).filter(Boolean))],
    keywords: [
      ...new Set(
        draft.keywords
          .map((k) => k.trim())
          .filter((k) => k.length >= MIN_KEYWORD_LENGTH)
      ),
    ],
    createdAt: now.toISOString(),
    watchUntil: new Date(now.getTime() + watchDays * 86_400_000).toISOString(),
    archivedAt: null,
  };
}

export function isNoteActive(note: ResearchNote, now = new Date()): boolean {
  if (note.archivedAt) return false;
  return new Date(note.watchUntil).getTime() > now.getTime();
}

/**
 * Score one article against one note.
 *
 * A shared tag says the article is in the same neighbourhood; a keyword hit in
 * the headline says it is about the same thing. Keywords are therefore worth
 * more, and a keyword found only in the summary is worth less than one in the
 * title.
 */
export function matchNote(article: Article, note: ResearchNote): NoteMatch | null {
  const reasons: string[] = [];
  let score = 0;

  const articleTags = new Set(article.tags.map(normalize));
  for (const tag of note.tags) {
    if (articleTags.has(normalize(tag))) {
      reasons.push(`#${tag}`);
      score += 2;
    }
  }

  const title = normalize(article.title);
  const summary = normalize(article.summary || "");
  for (const keyword of note.keywords) {
    const needle = normalize(keyword);
    if (title.includes(needle)) {
      reasons.push(keyword);
      score += 5;
    } else if (summary.includes(needle)) {
      reasons.push(keyword);
      score += 3;
    }
  }

  if (score === 0) return null;
  return { noteId: note.id, reasons, score };
}

/** Every active note an article speaks to, strongest first. */
export function matchArticle(
  article: Article,
  notes: ResearchNote[],
  now = new Date()
): NoteMatch[] {
  return notes
    .filter((note) => isNoteActive(note, now))
    .map((note) => matchNote(article, note))
    .filter((m): m is NoteMatch => m !== null)
    .sort((a, b) => b.score - a.score);
}

/**
 * How far back a note reaches on the day it is written.
 *
 * A note is written in response to something, and the wire usually already
 * carries the headlines that prompted it. Without a lookback a fresh note shows
 * an empty list, which reads as broken.
 */
export const NOTE_LOOKBACK_HOURS = 48;

/** Every article that speaks to one note, most recent first. */
export function articlesForNote(
  note: ResearchNote,
  articles: Article[]
): Array<{ article: Article; match: NoteMatch }> {
  const since =
    new Date(note.createdAt).getTime() - NOTE_LOOKBACK_HOURS * 3_600_000;
  return articles
    .filter((a) => new Date(a.publishedAt).getTime() >= since)
    .map((article) => {
      const match = matchNote(article, note);
      return match ? { article, match } : null;
    })
    .filter((v): v is { article: Article; match: NoteMatch } => v !== null)
    .sort(
      (a, b) =>
        new Date(b.article.publishedAt).getTime() -
        new Date(a.article.publishedAt).getTime()
    );
}

/**
 * Notification rules implied by the active notes.
 *
 * Watchlist keywords and notification rules used to be maintained by hand,
 * separately from anything explaining why they mattered. A note already says
 * what is being tracked and until when, so the rules are derived from it and
 * expire with it.
 */
export function derivedAlertTerms(
  notes: ResearchNote[],
  now = new Date()
): Array<{ type: "tag" | "keyword"; value: string; noteId: string }> {
  const seen = new Set<string>();
  const out: Array<{ type: "tag" | "keyword"; value: string; noteId: string }> = [];
  for (const note of notes.filter((n) => isNoteActive(n, now))) {
    for (const tag of note.tags) {
      const key = `tag:${normalize(tag)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ type: "tag", value: tag, noteId: note.id });
    }
    for (const keyword of note.keywords) {
      const key = `keyword:${normalize(keyword)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ type: "keyword", value: keyword, noteId: note.id });
    }
  }
  return out;
}
