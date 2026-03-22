"use client";

import { useState } from "react";
import type { PortfolioPrice, PortfolioAsset } from "@/hooks/usePortfolio";

interface PortfolioPanelProps {
  prices: PortfolioPrice[];
  assets: PortfolioAsset[];
  loading: boolean;
  onAddAsset: (asset: Omit<PortfolioAsset, "addedAt">) => void;
  onRemoveAsset: (symbol: string) => void;
  onRefresh: () => void;
}

const POPULAR_SYMBOLS = [
  { symbol: "005930.KS", label: "삼성전자", type: "stock" as const },
  { symbol: "000660.KS", label: "SK하이닉스", type: "stock" as const },
  { symbol: "035420.KS", label: "NAVER", type: "stock" as const },
  { symbol: "035720.KS", label: "카카오", type: "stock" as const },
  { symbol: "AAPL", label: "Apple", type: "stock" as const },
  { symbol: "NVDA", label: "NVIDIA", type: "stock" as const },
  { symbol: "MSFT", label: "Microsoft", type: "stock" as const },
  { symbol: "TSLA", label: "Tesla", type: "stock" as const },
  { symbol: "BTC-USD", label: "Bitcoin", type: "crypto" as const },
  { symbol: "ETH-USD", label: "Ethereum", type: "crypto" as const },
  { symbol: "GC=F", label: "Gold", type: "commodity" as const },
  { symbol: "CL=F", label: "WTI Oil", type: "commodity" as const },
  { symbol: "^KS11", label: "KOSPI", type: "index" as const },
  { symbol: "^GSPC", label: "S&P 500", type: "index" as const },
  { symbol: "^IXIC", label: "NASDAQ", type: "index" as const },
  { symbol: "USDKRW=X", label: "USD/KRW", type: "fx" as const },
];

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 60;
  const h = 20;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  });
  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatPrice(price: number, symbol: string): string {
  if (symbol.includes("KRW") || symbol.includes(".KS")) {
    return price >= 1000
      ? price.toLocaleString("ko-KR", { maximumFractionDigits: 0 })
      : price.toFixed(2);
  }
  return price >= 100
    ? price.toLocaleString("en-US", { maximumFractionDigits: 2 })
    : price.toFixed(4);
}

export function PortfolioPanel({ prices, assets, loading, onAddAsset, onRemoveAsset, onRefresh }: PortfolioPanelProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [customSymbol, setCustomSymbol] = useState("");
  const [customLabel, setCustomLabel] = useState("");

  const existingSymbols = new Set(assets.map((a) => a.symbol));

  const totalChange = prices.reduce((sum, p) => sum + p.changePct, 0);
  const avgChange = prices.length > 0 ? totalChange / prices.length : 0;

  return (
    <div className="glass-modal w-96 max-h-[600px] overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
        <h3 className="text-[12px] font-bold text-[var(--foreground-bright)] flex items-center gap-2">
          <div className="w-5 h-5 rounded-[var(--radius-xs)] bg-[var(--gold)] flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          포트폴리오
          {prices.length > 0 && (
            <span className={`text-[10px] font-bold ${avgChange >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
              {avgChange >= 0 ? "+" : ""}{avgChange.toFixed(2)}%
            </span>
          )}
        </h3>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onRefresh}
            className={`metal-btn w-6 h-6 flex items-center justify-center ${loading ? "animate-spin" : ""}`}
            disabled={loading}
          >
            <svg className="w-3 h-3 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {prices.length === 0 && !loading ? (
          <div className="text-center py-8">
            <div className="empty-state-icon mx-auto mb-3">
              <svg className="w-6 h-6 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <p className="text-[10px] text-[var(--muted)]">가격 데이터를 불러오는 중...</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {prices.map((item) => (
              <div
                key={item.symbol}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--surface-hover)] transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-bold text-[var(--foreground-bright)] truncate">
                    {item.label}
                  </div>
                  <div className="text-[9px] text-[var(--muted)] font-medium">{item.symbol}</div>
                </div>
                <Sparkline
                  data={item.sparkline}
                  color={item.changePct >= 0 ? "var(--success)" : "var(--danger)"}
                />
                <div className="text-right shrink-0">
                  <div className="text-[11px] font-bold tabular-nums text-[var(--foreground-bright)]">
                    {formatPrice(item.price, item.symbol)}
                  </div>
                  <div className={`text-[9px] font-bold tabular-nums ${
                    item.changePct >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"
                  }`}>
                    {item.changePct >= 0 ? "+" : ""}{item.changePct.toFixed(2)}%
                  </div>
                </div>
                <button
                  onClick={() => onRemoveAsset(item.symbol)}
                  className="text-[var(--muted)] hover:text-[var(--danger)] opacity-0 group-hover:opacity-100 transition-all text-xs shrink-0"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        {loading && prices.length === 0 && (
          <div className="p-4 space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton h-10 w-full" />
            ))}
          </div>
        )}
      </div>

      {/* Add asset */}
      <div className="border-t border-[var(--border)] p-3">
        {showAdd ? (
          <div className="space-y-2">
            <div className="text-[9px] font-bold text-[var(--muted)] tracking-wider uppercase mb-1">인기 종목</div>
            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
              {POPULAR_SYMBOLS.filter((s) => !existingSymbols.has(s.symbol)).map((s) => (
                <button
                  key={s.symbol}
                  onClick={() => onAddAsset(s)}
                  className="metal-btn px-2 py-1 text-[9px] font-medium text-[var(--foreground-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)]"
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="text-[9px] font-bold text-[var(--muted)] tracking-wider uppercase mt-2">직접 입력</div>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={customSymbol}
                onChange={(e) => setCustomSymbol(e.target.value.toUpperCase())}
                placeholder="심볼 (예: AAPL)"
                className="flex-1 px-2 py-1.5 text-[10px] rounded-[var(--radius-sm)] bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
              />
              <input
                type="text"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="이름"
                className="flex-1 px-2 py-1.5 text-[10px] rounded-[var(--radius-sm)] bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => {
                  if (customSymbol.trim()) {
                    onAddAsset({ symbol: customSymbol.trim(), label: customLabel.trim() || customSymbol.trim(), type: "stock" });
                    setCustomSymbol("");
                    setCustomLabel("");
                  }
                }}
                className="flex-1 btn-primary px-2 py-1.5 text-[10px] font-bold"
              >
                추가
              </button>
              <button onClick={() => setShowAdd(false)} className="metal-btn px-2.5 py-1.5 text-[10px]">
                닫기
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAdd(true)}
            className="w-full metal-btn px-3 py-2 text-[10px] font-semibold text-[var(--gold)] flex items-center justify-center gap-1.5"
          >
            <span>+</span> 종목 추가
          </button>
        )}
      </div>
    </div>
  );
}
