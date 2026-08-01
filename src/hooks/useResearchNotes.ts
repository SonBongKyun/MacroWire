"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createNote,
  isNoteActive,
  type NoteDraft,
  type ResearchNote,
} from "@/lib/research/notes";

const STORAGE_KEY = "macro-wire-research-notes";
/** The memo panel this replaces. Read once, then left alone. */
const LEGACY_MEMO_KEY = "macro-wire-memos";

interface LegacyMemo {
  id: string;
  text: string;
  tags: string[];
  linkedArticleIds: string[];
  createdAt: string;
}

/**
 * Carry the old quick memos over the first time notes load.
 *
 * A memo had no title, origin or watch window, so the first line becomes the
 * title and the rest the body. Migrated notes are archived on arrival: they
 * were written without a tracking window in mind, and silently turning old
 * memos into live alert axes would be a surprise.
 */
function migrateLegacyMemos(): ResearchNote[] {
  try {
    const raw = localStorage.getItem(LEGACY_MEMO_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { memos?: LegacyMemo[] };
    const memos = parsed?.memos ?? [];
    return memos.map((memo) => {
      const [firstLine, ...rest] = memo.text.split("\n");
      const created = new Date(memo.createdAt || Date.now());
      return {
        ...createNote(
          {
            title: firstLine.slice(0, 80) || "(제목 없는 메모)",
            origin: "이전 메모",
            body: rest.join("\n").trim(),
            tags: memo.tags ?? [],
            keywords: [],
          },
          created
        ),
        id: `note-legacy-${memo.id}`,
        archivedAt: created.toISOString(),
      };
    });
  } catch {
    return [];
  }
}

function load(): ResearchNote[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ResearchNote[];
  } catch {
    /* fall through to migration */
  }
  const migrated = migrateLegacyMemos();
  if (migrated.length > 0) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
  }
  return migrated;
}

function persist(notes: ResearchNote[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

export function useResearchNotes() {
  const [notes, setNotes] = useState<ResearchNote[]>([]);
  // Resolved after mount; localStorage does not exist on the server.
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNotes(load());
    setNow(new Date());
  }, []);

  const update = useCallback((next: ResearchNote[]) => {
    setNotes(next);
    persist(next);
  }, []);

  const addNote = useCallback(
    (draft: NoteDraft) => {
      const note = createNote(draft);
      update([note, ...notes]);
      return note;
    },
    [notes, update]
  );

  const archiveNote = useCallback(
    (id: string) =>
      update(
        notes.map((n) =>
          n.id === id
            ? { ...n, archivedAt: n.archivedAt ? null : new Date().toISOString() }
            : n
        )
      ),
    [notes, update]
  );

  const removeNote = useCallback(
    (id: string) => update(notes.filter((n) => n.id !== id)),
    [notes, update]
  );

  const extendNote = useCallback(
    (id: string, days: number) =>
      update(
        notes.map((n) =>
          n.id === id
            ? {
                ...n,
                watchUntil: new Date(
                  Math.max(Date.now(), new Date(n.watchUntil).getTime()) +
                    days * 86_400_000
                ).toISOString(),
                archivedAt: null,
              }
            : n
        )
      ),
    [notes, update]
  );

  const active = useMemo(
    () => (now ? notes.filter((n) => isNoteActive(n, now)) : []),
    [notes, now]
  );

  return { notes, active, addNote, archiveNote, removeNote, extendNote };
}
