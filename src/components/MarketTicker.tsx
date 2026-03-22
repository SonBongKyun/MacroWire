"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface MarketItem {
  symbol: string;
  label: string;
  price: number;
  change: number;
  changePct: number;
}

function formatPrice(label: string, price: number): string {
  if (label === "WTI") return `$${price.toFixed(2)}`;
  if (label === "USD/KRW") return price.toFixed(2);
  return price.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
}

function getMarketStatus(): { open: boolean; label: string } {
  const now = new Date();
  const kst = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  const day = kst.getDay();
  const hour = kst.getHours();
  const minute = kst.getMinutes();
  const timeVal = hour * 60 + minute;
  const isWeekday = day >= 1 && day <= 5;
  const isOpen = isWeekday && timeVal >= 540 && timeVal < 930; // 9:00 ~ 15:30
  return { open: isOpen, label: isOpen ? "시장 열림" : "시장 마감" };
}

export function MarketTicker() {
  const [items, setItems] = useState<MarketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tickClasses, setTickClasses] = useState<Record<string, string>>({});
  const prevPrices = useRef<Record<string, number>>({});
  const [marketStatus, setMarketStatus] = useState(getMarketStatus);

  const fetchMarket = useCallback(async () => {
    try {
      const res = await fetch("/api/market");
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        // Determine tick direction per item
        const newTickClasses: Record<string, string> = {};
        for (const item of data) {
          const prev = prevPrices.current[item.symbol];
          if (prev !== undefined && prev !== item.price) {
            newTickClasses[item.symbol] = item.price > prev ? "tick-up" : "tick-down";
          }
        }
        // Save current prices
        const prices: Record<string, number> = {};
        for (const item of data) {
          prices[item.symbol] = item.price;
        }
        prevPrices.current = prices;

        setTickClasses(newTickClasses);
        setItems(data);

        // Clear tick classes after animation
        if (Object.keys(newTickClasses).length > 0) {
          setTimeout(() => setTickClasses({}), 850);
        }
      }
    } catch {
      /* silently ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMarket();
    const interval = setInterval(fetchMarket, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchMarket]);

  // Update market status every minute
  useEffect(() => {
    const interval = setInterval(() => setMarketStatus(getMarketStatus()), 60_000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-5 px-4 h-9 bg-[var(--background)] shrink-0">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="skeleton w-12 h-3 rounded" />
            <div className="skeleton w-16 h-3 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="flex items-center px-4 h-9 shrink-0 overflow-hidden select-none ticker-shimmer">
      {/* Live indicator + market status */}
      <div className="flex items-center gap-1.5 mr-3 shrink-0">
        <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)] stat-dot-live" />
        <span className="text-[8px] text-[var(--success)] tracking-[0.12em] font-bold uppercase font-mono">
          LIVE
        </span>
        <span className="text-[8px] text-[var(--border-strong)] mx-0.5">|</span>
        <span className={`text-[8px] font-bold tracking-wider font-mono ${marketStatus.open ? "text-[var(--success)]" : "text-[var(--muted)]"}`}>
          {marketStatus.label}
        </span>
      </div>

      <span className="text-[8px] text-[var(--border-strong)] mr-3">|</span>

      {/* Market items */}
      <div className="flex items-center gap-4">
        {items.map((item, idx) => {
          const isUp = item.change >= 0;
          const color = isUp ? "#22c55e" : "#ef4444";
          const arrow = isUp ? "\u25B2" : "\u25BC";
          const tickClass = tickClasses[item.symbol] || "";

          return (
            <div
              key={item.symbol}
              className={`flex items-center gap-1.5 shrink-0 ticker-item group cursor-default px-1 ${tickClass}`}
            >
              {idx > 0 && (
                <span className="text-[var(--border)] mr-1 text-[8px]">|</span>
              )}
              <span className="text-[9px] font-bold text-[var(--muted)] tracking-wider group-hover:text-[var(--foreground-secondary)] transition-colors">
                {item.label}
              </span>
              <span className="text-[10px] font-bold tabular-nums text-[var(--foreground-bright)] font-mono">
                {formatPrice(item.label, item.price)}
              </span>
              <span
                className="text-[9px] font-bold tabular-nums font-mono"
                style={{ color }}
              >
                {arrow}{Math.abs(item.changePct).toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
