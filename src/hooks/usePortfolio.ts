"use client";

import { useState, useEffect, useCallback } from "react";

export interface PortfolioAsset {
  symbol: string;
  label: string;
  type: "stock" | "crypto" | "fx" | "commodity" | "index";
  addedAt: string;
}

export interface PortfolioPrice {
  symbol: string;
  label: string;
  price: number;
  change: number;
  changePct: number;
  sparkline: number[];
}

export interface PortfolioStore {
  assets: PortfolioAsset[];
}

const STORAGE_KEY = "ryzm-finance-portfolio";
const PRICE_CACHE_KEY = "ryzm-finance-portfolio-prices";

const DEFAULT_ASSETS: PortfolioAsset[] = [
  { symbol: "005930.KS", label: "삼성전자", type: "stock", addedAt: "" },
  { symbol: "000660.KS", label: "SK하이닉스", type: "stock", addedAt: "" },
  { symbol: "BTC-USD", label: "Bitcoin", type: "crypto", addedAt: "" },
  { symbol: "GC=F", label: "Gold", type: "commodity", addedAt: "" },
  { symbol: "^KS11", label: "KOSPI", type: "index", addedAt: "" },
  { symbol: "^GSPC", label: "S&P 500", type: "index", addedAt: "" },
];

function load(): PortfolioStore {
  if (typeof window === "undefined") return { assets: DEFAULT_ASSETS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.assets && parsed.assets.length > 0) return parsed;
    }
  } catch {}
  return { assets: DEFAULT_ASSETS };
}

function persist(store: PortfolioStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function usePortfolio() {
  const [store, setStore] = useState<PortfolioStore>({ assets: DEFAULT_ASSETS });
  const [prices, setPrices] = useState<PortfolioPrice[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setStore(load());
  }, []);

  const addAsset = useCallback((asset: Omit<PortfolioAsset, "addedAt">) => {
    setStore((prev) => {
      if (prev.assets.some((a) => a.symbol === asset.symbol)) return prev;
      const next = { assets: [...prev.assets, { ...asset, addedAt: new Date().toISOString() }] };
      persist(next);
      return next;
    });
  }, []);

  const removeAsset = useCallback((symbol: string) => {
    setStore((prev) => {
      const next = { assets: prev.assets.filter((a) => a.symbol !== symbol) };
      persist(next);
      return next;
    });
  }, []);

  const fetchPrices = useCallback(async () => {
    if (store.assets.length === 0) return;
    setLoading(true);
    try {
      const symbols = store.assets.map((a) => a.symbol).join(",");
      const res = await fetch(`/api/portfolio?symbols=${encodeURIComponent(symbols)}`);
      if (res.ok) {
        const data = await res.json();
        setPrices(data);
        localStorage.setItem(PRICE_CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
      }
    } catch (err) {
      console.error("Portfolio fetch failed:", err);
      // Try cache
      try {
        const cached = localStorage.getItem(PRICE_CACHE_KEY);
        if (cached) {
          const { data } = JSON.parse(cached);
          setPrices(data);
        }
      } catch {}
    } finally {
      setLoading(false);
    }
  }, [store.assets]);

  // Auto-fetch on mount and when assets change
  useEffect(() => {
    fetchPrices();
    const id = setInterval(fetchPrices, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchPrices]);

  return { store, prices, loading, addAsset, removeAsset, fetchPrices };
}
