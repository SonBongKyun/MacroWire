"use client";

import { useState, useEffect } from "react";

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

export function MarketTicker() {
  const [items, setItems] = useState<MarketItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMarket = async () => {
      try {
        const res = await fetch("/api/market");
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) setItems(data);
      } catch {
        /* silently ignore */
      } finally {
        setLoading(false);
      }
    };

    fetchMarket();
    const interval = setInterval(fetchMarket, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-5 px-4 h-8 bg-[var(--background)] shrink-0">
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
    <div className="flex items-center px-4 h-8 shrink-0 overflow-hidden select-none ticker-shimmer">
      <div className="flex items-center gap-4">
        {items.map((item, idx) => {
          const isUp = item.change >= 0;
          const color = isUp ? "var(--success)" : "var(--danger)";
          const arrow = isUp ? "▲" : "▼";

          return (
            <div key={item.symbol} className="flex items-center gap-1.5 shrink-0 ticker-item group cursor-default">
              {idx > 0 && (
                <span className="text-[var(--border)] mr-1">·</span>
              )}
              <span className="text-[9px] font-bold text-[var(--muted)] tracking-wider group-hover:text-[var(--foreground-secondary)] transition-colors">
                {item.label}
              </span>
              <span className="text-[10px] font-bold tabular-nums text-[var(--foreground-bright)]">
                {formatPrice(item.label, item.price)}
              </span>
              <span
                className="text-[9px] font-bold tabular-nums flex items-center gap-0.5 px-1.5 py-0.5 rounded-full"
                style={{ color, backgroundColor: `${isUp ? 'rgba(90,158,126,0.1)' : 'rgba(199,80,80,0.1)'}` }}
              >
                <span className="text-[7px] leading-none">{arrow}</span>
                {Math.abs(item.changePct).toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
      <div className="ml-auto flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)] stat-dot-live" />
        <span className="text-[8px] text-[var(--success)] tracking-wider font-bold">
          MARKET
        </span>
      </div>
    </div>
  );
}
