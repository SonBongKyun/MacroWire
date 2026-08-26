"use client";

import { useState, useEffect, useCallback } from "react";
import {
  normalizeWatchlistKeyword,
  parseWatchlistStore,
  type WatchlistStore,
} from "@/lib/personalization/deskPreferences";

export type { WatchlistItem, WatchlistStore } from "@/lib/personalization/deskPreferences";

const STORAGE_KEY = "macro-wire-watchlist";

function load(): WatchlistStore {
  if (typeof window === "undefined") return { items: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return parseWatchlistStore(JSON.parse(raw));
  } catch {}
  return { items: [] };
}

function persist(store: WatchlistStore) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {}
}

interface ServerPayload {
  store?: unknown;
  limit?: unknown;
}

export function useWatchlist() {
  const [store, setStore] = useState<WatchlistStore>({ items: [] });
  const [limit, setLimit] = useState(Number.POSITIVE_INFINITY);
  const [serverBacked, setServerBacked] = useState(false);

  const applyServerPayload = useCallback((payload: ServerPayload) => {
    const next = parseWatchlistStore(payload.store);
    const nextLimit = typeof payload.limit === "number" && payload.limit > 0
      ? payload.limit
      : Number.POSITIVE_INFINITY;
    setStore(next);
    setLimit(nextLimit);
    setServerBacked(true);
    persist(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const local = load();
    setStore(local);

    void (async () => {
      try {
        const res = await fetch("/api/account/watchlist", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const payload = await res.json() as ServerPayload;
        if (!cancelled) applyServerPayload(payload);
      } catch {
        // Clerk-less/self-hosted mode intentionally remains local-only.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [applyServerPayload]);

  const reconcileServer = useCallback(async (
    method: "POST" | "DELETE",
    body: Record<string, unknown>,
  ) => {
    if (!serverBacked) return;
    try {
      const res = await fetch("/api/account/watchlist", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        applyServerPayload(await res.json() as ServerPayload);
        return;
      }
      // A tier change or concurrent edit can invalidate an optimistic update.
      const current = await fetch("/api/account/watchlist", { cache: "no-store" });
      if (current.ok) applyServerPayload(await current.json() as ServerPayload);
    } catch {
      // Keep the local copy available during a transient account/API outage.
    }
  }, [applyServerPayload, serverBacked]);

  const addKeyword = useCallback((raw: string) => {
    const keyword = normalizeWatchlistKeyword(raw);
    if (!keyword || store.items.some((item) => item.keyword === keyword)) return;
    if (store.items.length >= limit) return;

    const next: WatchlistStore = {
      items: [...store.items, { keyword, createdAt: new Date().toISOString() }],
    };
    setStore(next);
    persist(next);
    void reconcileServer("POST", { keyword });
  }, [limit, reconcileServer, store]);

  const removeKeyword = useCallback((raw: string) => {
    const keyword = normalizeWatchlistKeyword(raw);
    if (!keyword) return;
    const next: WatchlistStore = { items: store.items.filter((item) => item.keyword !== keyword) };
    setStore(next);
    persist(next);
    void reconcileServer("DELETE", { keyword });
  }, [reconcileServer, store]);

  return { store, addKeyword, removeKeyword, limit, serverBacked };
}
