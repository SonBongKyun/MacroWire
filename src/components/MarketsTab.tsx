"use client";

import { useState, useEffect } from "react";
import type { PortfolioPrice, PortfolioAsset } from "@/hooks/usePortfolio";

interface MarketsTabProps {
  portfolioPrices: PortfolioPrice[];
  portfolioAssets: PortfolioAsset[];
  portfolioLoading: boolean;
  onAddAsset: (asset: Omit<PortfolioAsset, "addedAt">) => void;
  onRemoveAsset: (symbol: string) => void;
  onRefreshPrices: () => void;
}

interface MarketItem {
  symbol: string;
  label: string;
  price: number;
  change: number;
  changePct: number;
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
  const w = 80;
  const h = 24;
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

export function MarketsTab({
  portfolioPrices,
  portfolioAssets,
  portfolioLoading,
  onAddAsset,
  onRemoveAsset,
  onRefreshPrices,
}: MarketsTabProps) {
  const [marketData, setMarketData] = useState<MarketItem[]>([]);
  const [marketLoading, setMarketLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [customSymbol, setCustomSymbol] = useState("");
  const [customLabel, setCustomLabel] = useState("");

  const existingSymbols = new Set(portfolioAssets.map((a) => a.symbol));

  useEffect(() => {
    let cancelled = false;
    async function fetchMarket() {
      setMarketLoading(true);
      try {
        const res = await fetch("/api/market");
        if (res.ok && !cancelled) {
          const data = await res.json();
          setMarketData(data);
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) setMarketLoading(false);
      }
    }
    fetchMarket();
    const id = setInterval(fetchMarket, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const handleAddCustom = () => {
    if (!customSymbol.trim() || !customLabel.trim()) return;
    onAddAsset({ symbol: customSymbol.trim().toUpperCase(), label: customLabel.trim(), type: "stock" });
    setCustomSymbol("");
    setCustomLabel("");
    setShowAddForm(false);
  };

  return (
    <div className="overflow-y-auto h-full">
      <div className="max-w-[1400px] mx-auto p-5 space-y-6">
        {/* Section 1: Major Market Indicators */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[14px] font-bold text-[var(--foreground-bright)] tracking-[-0.01em]">
              주요 시장 지표
            </h2>
            {marketLoading && (
              <span className="text-[9px] text-[var(--muted)] animate-pulse">
                업데이트 중...
              </span>
            )}
          </div>
          <div className="grid grid-cols-4 gap-3">
            {(marketData.length > 0 ? marketData : [
              { symbol: "USDKRW=X", label: "USD/KRW", price: 0, change: 0, changePct: 0 },
              { symbol: "^KS11", label: "KOSPI", price: 0, change: 0, changePct: 0 },
              { symbol: "^GSPC", label: "S&P 500", price: 0, change: 0, changePct: 0 },
              { symbol: "CL=F", label: "WTI", price: 0, change: 0, changePct: 0 },
            ]).map((item) => {
              const isUp = item.changePct >= 0;
              return (
                <div
                  key={item.symbol}
                  className="glass-card p-4 rounded-[var(--radius-md)] border border-[var(--border-subtle)]"
                >
                  <div className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
                    {item.label}
                  </div>
                  <div className="text-[22px] font-extrabold text-[var(--foreground-bright)] tabular-nums leading-tight">
                    {item.price > 0 ? formatPrice(item.price, item.symbol) : "--"}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span
                      className={`text-[12px] font-bold tabular-nums ${
                        isUp ? "text-[var(--success)]" : "text-[var(--danger)]"
                      }`}
                    >
                      {isUp ? "+" : ""}
                      {item.change.toFixed(2)}
                    </span>
                    <span
                      className={`text-[11px] font-bold tabular-nums px-1.5 py-0.5 rounded-[var(--radius-xs)] ${
                        isUp
                          ? "bg-[var(--success)]/10 text-[var(--success)]"
                          : "bg-[var(--danger)]/10 text-[var(--danger)]"
                      }`}
                    >
                      {isUp ? "+" : ""}
                      {item.changePct.toFixed(2)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 2: Portfolio Table */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[14px] font-bold text-[var(--foreground-bright)] tracking-[-0.01em]">
              내 포트폴리오
            </h2>
            <div className="flex items-center gap-2">
              {portfolioLoading && (
                <span className="text-[9px] text-[var(--muted)] animate-pulse">
                  로딩...
                </span>
              )}
              <button
                onClick={onRefreshPrices}
                className="text-[10px] font-semibold text-[var(--accent)] hover:underline"
              >
                새로고침
              </button>
            </div>
          </div>

          <div className="glass-card rounded-[var(--radius-md)] border border-[var(--border-subtle)] overflow-hidden">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-[9px] text-[var(--muted)] uppercase tracking-wider border-b border-[var(--border)]">
                  <th className="text-left px-4 py-2.5 font-semibold">종목명</th>
                  <th className="text-left px-3 py-2.5 font-semibold">심볼</th>
                  <th className="text-right px-3 py-2.5 font-semibold">현재가</th>
                  <th className="text-right px-3 py-2.5 font-semibold">변동</th>
                  <th className="text-right px-3 py-2.5 font-semibold">변동%</th>
                  <th className="text-center px-3 py-2.5 font-semibold">스파크라인</th>
                  <th className="text-center px-3 py-2.5 font-semibold w-12">삭제</th>
                </tr>
              </thead>
              <tbody>
                {portfolioPrices.length > 0 ? (
                  portfolioPrices.map((p) => {
                    const isUp = p.changePct >= 0;
                    const changeColor = isUp ? "var(--success)" : "var(--danger)";
                    return (
                      <tr
                        key={p.symbol}
                        className="border-b border-[var(--border-subtle)] hover:bg-[var(--surface-hover)] transition-colors"
                      >
                        <td className="px-4 py-2.5 font-semibold text-[var(--foreground-bright)]">
                          {p.label}
                        </td>
                        <td className="px-3 py-2.5 text-[var(--muted)] font-mono text-[10px]">
                          {p.symbol}
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold tabular-nums text-[var(--foreground-bright)]">
                          {formatPrice(p.price, p.symbol)}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums font-semibold" style={{ color: changeColor }}>
                          {isUp ? "+" : ""}{p.change.toFixed(2)}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums font-bold" style={{ color: changeColor }}>
                          {isUp ? "+" : ""}{p.changePct.toFixed(2)}%
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <div className="flex justify-center">
                            <Sparkline data={p.sparkline} color={changeColor} />
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <button
                            onClick={() => onRemoveAsset(p.symbol)}
                            className="text-[var(--muted)] hover:text-[var(--danger)] transition-colors"
                            title="삭제"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-[var(--muted)] text-[11px]">
                      {portfolioLoading ? "데이터를 불러오는 중..." : "포트폴리오가 비어 있습니다. 종목을 추가해 주세요."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Add asset button / form */}
          <div className="mt-3">
            {showAddForm ? (
              <div className="glass-card p-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customSymbol}
                    onChange={(e) => setCustomSymbol(e.target.value)}
                    placeholder="심볼 (예: AAPL)"
                    className="flex-1 px-2.5 py-1.5 text-[11px] bg-[var(--surface-active)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]"
                  />
                  <input
                    type="text"
                    value={customLabel}
                    onChange={(e) => setCustomLabel(e.target.value)}
                    placeholder="종목명 (예: Apple)"
                    className="flex-1 px-2.5 py-1.5 text-[11px] bg-[var(--surface-active)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]"
                  />
                  <button
                    onClick={handleAddCustom}
                    className="px-3 py-1.5 text-[10px] font-bold bg-[var(--accent)] text-white rounded-[var(--radius-sm)] hover:opacity-90 transition-opacity"
                  >
                    추가
                  </button>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="px-2 py-1.5 text-[10px] text-[var(--muted)] hover:text-[var(--foreground)]"
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddForm(true)}
                className="text-[10px] font-semibold text-[var(--accent)] hover:underline"
              >
                + 직접 종목 추가
              </button>
            )}
          </div>
        </section>

        {/* Section 3: Popular Symbols */}
        <section>
          <h2 className="text-[14px] font-bold text-[var(--foreground-bright)] tracking-[-0.01em] mb-3">
            인기 종목 추가
          </h2>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {POPULAR_SYMBOLS.map((s) => {
              const alreadyAdded = existingSymbols.has(s.symbol);
              return (
                <button
                  key={s.symbol}
                  onClick={() => {
                    if (!alreadyAdded) onAddAsset(s);
                  }}
                  disabled={alreadyAdded}
                  className={`px-3 py-2 text-[10px] font-semibold rounded-[var(--radius-sm)] border transition-all text-center ${
                    alreadyAdded
                      ? "border-[var(--border-subtle)] text-[var(--muted)] opacity-50 cursor-not-allowed"
                      : "border-[var(--border-subtle)] text-[var(--foreground)] hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--accent-surface)] cursor-pointer"
                  }`}
                >
                  <div className="font-bold">{s.label}</div>
                  <div className="text-[8px] text-[var(--muted)] mt-0.5 font-mono">{s.symbol}</div>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
