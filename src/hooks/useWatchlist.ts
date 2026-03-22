"use client";

import { useState, useEffect, useCallback } from "react";

export interface WatchlistItem {
  keyword: string;
  createdAt: string;
}

export interface WatchlistStore {
  items: WatchlistItem[];
}

const STORAGE_KEY = "ryzm-finance-watchlist";

function load(): WatchlistStore {
  if (typeof window === "undefined") return { items: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { items: [] };
}

function persist(store: WatchlistStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function useWatchlist() {
  const [store, setStore] = useState<WatchlistStore>({ items: [] });

  useEffect(() => {
    setStore(load());
  }, []);

  const addKeyword = useCallback((keyword: string) => {
    setStore((prev) => {
      if (prev.items.some((i) => i.keyword === keyword)) return prev;
      const next = { items: [...prev.items, { keyword, createdAt: new Date().toISOString() }] };
      persist(next);
      return next;
    });
  }, []);

  const removeKeyword = useCallback((keyword: string) => {
    setStore((prev) => {
      const next = { items: prev.items.filter((i) => i.keyword !== keyword) };
      persist(next);
      return next;
    });
  }, []);

  return { store, addKeyword, removeKeyword };
}
