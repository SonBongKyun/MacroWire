"use client";

import { useState, useCallback, useEffect } from "react";

export interface ArticleNote {
  articleId: string;
  text: string;
  highlights: string[];
  updatedAt: string;
}

interface NotesStore {
  [articleId: string]: ArticleNote;
}

const STORAGE_KEY = "ryzm-finance-notes";

function loadStore(): NotesStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function persistStore(store: NotesStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function useArticleNotes() {
  const [store, setStore] = useState<NotesStore>(loadStore);

  // Migrate old per-article keys on first load
  useEffect(() => {
    if (typeof window === "undefined") return;
    const migrated: NotesStore = { ...store };
    let changed = false;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("ryzm-finance-notes-") && key !== STORAGE_KEY) {
        const articleId = key.replace("ryzm-finance-notes-", "");
        const text = localStorage.getItem(key) || "";
        if (text && !migrated[articleId]) {
          migrated[articleId] = {
            articleId,
            text,
            highlights: [],
            updatedAt: new Date().toISOString(),
          };
          changed = true;
        }
        localStorage.removeItem(key);
      }
    }
    if (changed) {
      setStore(migrated);
      persistStore(migrated);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const saveNote = useCallback((articleId: string, text: string) => {
    setStore((prev) => {
      const existing = prev[articleId];
      const next = {
        ...prev,
        [articleId]: {
          articleId,
          text,
          highlights: existing?.highlights || [],
          updatedAt: new Date().toISOString(),
        },
      };
      if (!text && (!existing?.highlights || existing.highlights.length === 0)) {
        delete next[articleId];
      }
      persistStore(next);
      return next;
    });
  }, []);

  const getNote = useCallback(
    (articleId: string): ArticleNote | null => {
      return store[articleId] || null;
    },
    [store]
  );

  const getAllNotes = useCallback((): ArticleNote[] => {
    return Object.values(store).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [store]);

  const deleteNote = useCallback((articleId: string) => {
    setStore((prev) => {
      const next = { ...prev };
      delete next[articleId];
      persistStore(next);
      return next;
    });
  }, []);

  const addHighlight = useCallback((articleId: string, highlight: string) => {
    setStore((prev) => {
      const existing = prev[articleId] || {
        articleId,
        text: "",
        highlights: [],
        updatedAt: new Date().toISOString(),
      };
      if (existing.highlights.includes(highlight)) return prev;
      const next = {
        ...prev,
        [articleId]: {
          ...existing,
          highlights: [...existing.highlights, highlight],
          updatedAt: new Date().toISOString(),
        },
      };
      persistStore(next);
      return next;
    });
  }, []);

  const removeHighlight = useCallback((articleId: string, highlight: string) => {
    setStore((prev) => {
      const existing = prev[articleId];
      if (!existing) return prev;
      const highlights = existing.highlights.filter((h) => h !== highlight);
      const next = { ...prev };
      if (!existing.text && highlights.length === 0) {
        delete next[articleId];
      } else {
        next[articleId] = { ...existing, highlights, updatedAt: new Date().toISOString() };
      }
      persistStore(next);
      return next;
    });
  }, []);

  return { store, saveNote, getNote, getAllNotes, deleteNote, addHighlight, removeHighlight };
}
