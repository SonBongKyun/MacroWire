"use client";

import { useState, useEffect, useCallback } from "react";
import type { Quote } from "@/lib/market/quote";
import { useVisibleInterval } from "@/hooks/useVisibleInterval";
import {
  DEFAULT_PORTFOLIO_ASSETS,
  normalizePortfolioAsset,
  parsePortfolioStore,
  type PortfolioAsset,
  type PortfolioStore,
} from "@/lib/personalization/deskPreferences";

export type { PortfolioAsset, PortfolioStore } from "@/lib/personalization/deskPreferences";
export type PortfolioPrice = Quote;

const STORAGE_KEY = "macro-wire-portfolio";
const PRICE_CACHE_KEY = "macro-wire-portfolio-prices";
const QUOTE_BATCH_SIZE = 24;
const LOCAL_PORTFOLIO_LIMIT = 48;

function defaultStore(): PortfolioStore {
  return { assets: DEFAULT_PORTFOLIO_ASSETS.map((asset) => ({ ...asset })) };
}

function load(): PortfolioStore {
  if (typeof window === "undefined") return defaultStore();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return parsePortfolioStore(JSON.parse(raw));
  } catch {}
  return defaultStore();
}

function persist(store: PortfolioStore) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {}
}

interface ServerPayload {
  store?: unknown;
  limit?: unknown;
}

export function usePortfolio() {
  const [store, setStore] = useState<PortfolioStore>(defaultStore());
  const [prices, setPrices] = useState<PortfolioPrice[]>([]);
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState(LOCAL_PORTFOLIO_LIMIT);
  const [serverBacked, setServerBacked] = useState(false);

  const applyServerPayload = useCallback((payload: ServerPayload) => {
    const next = parsePortfolioStore(payload.store, { defaultWhenMissing: true });
    const nextLimit = typeof payload.limit === "number" && payload.limit > 0
      ? payload.limit
      : LOCAL_PORTFOLIO_LIMIT;
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
        const res = await fetch("/api/account/portfolio", { cache: "no-store" });
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
      const res = await fetch("/api/account/portfolio", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        applyServerPayload(await res.json() as ServerPayload);
        return;
      }
      const current = await fetch("/api/account/portfolio", { cache: "no-store" });
      if (current.ok) applyServerPayload(await current.json() as ServerPayload);
    } catch {
      // Preserve local state during transient account/API failures.
    }
  }, [applyServerPayload, serverBacked]);

  const addAsset = useCallback((raw: Omit<PortfolioAsset, "addedAt">) => {
    const asset = normalizePortfolioAsset(raw);
    if (!asset || store.assets.some((item) => item.symbol === asset.symbol)) return;
    if (store.assets.length >= limit) return;

    const next: PortfolioStore = {
      assets: [...store.assets, { ...asset, addedAt: new Date().toISOString() }],
    };
    setStore(next);
    persist(next);
    void reconcileServer("POST", { asset });
  }, [limit, reconcileServer, store]);

  const removeAsset = useCallback((symbol: string) => {
    const normalized = symbol.trim();
    if (!normalized) return;
    const next: PortfolioStore = { assets: store.assets.filter((asset) => asset.symbol !== normalized) };
    setStore(next);
    persist(next);
    void reconcileServer("DELETE", { symbol: normalized });
  }, [reconcileServer, store]);

  const fetchPrices = useCallback(async () => {
    if (store.assets.length === 0) {
      setPrices([]);
      return;
    }
    setLoading(true);
    try {
      const collected: PortfolioPrice[] = [];
      for (let i = 0; i < store.assets.length; i += QUOTE_BATCH_SIZE) {
        const symbols = store.assets
          .slice(i, i + QUOTE_BATCH_SIZE)
          .map((asset) => asset.symbol)
          .join(",");
        const res = await fetch(`/api/portfolio?symbols=${encodeURIComponent(symbols)}`);
        if (!res.ok) throw new Error(`Portfolio request failed (${res.status})`);
        const data = await res.json();
        if (Array.isArray(data)) collected.push(...data);
      }
      setPrices(collected);
      try {
        localStorage.setItem(PRICE_CACHE_KEY, JSON.stringify({ data: collected, ts: Date.now() }));
      } catch {}
    } catch (err) {
      console.error("Portfolio fetch failed:", err);
      try {
        const cached = localStorage.getItem(PRICE_CACHE_KEY);
        if (cached) {
          const { data } = JSON.parse(cached);
          if (Array.isArray(data)) setPrices(data);
        }
      } catch {}
    } finally {
      setLoading(false);
    }
  }, [store.assets]);

  useEffect(() => {
    void fetchPrices();
  }, [fetchPrices]);

  useVisibleInterval(fetchPrices, 5 * 60 * 1000);

  return {
    store,
    prices,
    loading,
    addAsset,
    removeAsset,
    fetchPrices,
    limit,
    serverBacked,
  };
}
