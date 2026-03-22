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

  const defaultMarketItems: MarketItem[] = [
    { symbol: "USDKRW=X", label: "USD/KRW", price: 0, change: 0, changePct: 0 },
    { symbol: "^KS11", label: "KOSPI", price: 0, change: 0, changePct: 0 },
    { symbol: "^GSPC", label: "S&P 500", price: 0, change: 0, changePct: 0 },
    { symbol: "CL=F", label: "WTI", price: 0, change: 0, changePct: 0 },
  ];

  const marketItems = marketData.length > 0 ? marketData : defaultMarketItems;

  return (
    <div className="overflow-y-auto h-full">
      <div className="markets-container space-y-8">

        {/* ── Section 1: Major Market Indicators ── */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--accent-surface)]">
              <svg className="w-4 h-4 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </span>
            <h2 className="section-label text-[13px]">주요 시장 지표</h2>
            {marketLoading && (
              <span className="ml-auto text-[9px] text-[var(--muted)] animate-pulse font-medium">
                업데이트 중...
              </span>
            )}
          </div>

          <div className="grid grid-cols-4 gap-3">
            {marketItems.map((item) => {
              const isUp = item.changePct >= 0;
              const borderColor = isUp ? "var(--success)" : "var(--danger)";
              return (
                <div
                  key={item.symbol}
                  className="relative bg-[var(--surface)] border border-[var(--border-subtle)] rounded-lg p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-px group overflow-hidden"
                >
                  {/* Colored left border accent */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
                    style={{ backgroundColor: item.price > 0 ? borderColor : "var(--border-subtle)" }}
                  />

                  <div className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5 pl-2">
                    {item.label}
                  </div>
                  <div className="text-2xl font-extrabold text-[var(--foreground-bright)] tabular-nums leading-tight pl-2">
                    {item.price > 0 ? formatPrice(item.price, item.symbol) : "--"}
                  </div>
                  <div className="flex items-center gap-2 mt-2 pl-2">
                    <span
                      className={`text-[12px] font-bold tabular-nums ${
                        isUp ? "text-[var(--success)]" : "text-[var(--danger)]"
                      }`}
                    >
                      {isUp ? "+" : ""}
                      {item.change.toFixed(2)}
                    </span>
                    <span
                      className={`inline-flex items-center gap-0.5 text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-[var(--radius-xs)] ${
                        isUp
                          ? "bg-[var(--success)]/10 text-[var(--success)]"
                          : "bg-[var(--danger)]/10 text-[var(--danger)]"
                      }`}
                    >
                      {/* Arrow icon */}
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        {isUp ? (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        )}
                      </svg>
                      {isUp ? "+" : ""}
                      {item.changePct.toFixed(2)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Section 2: Portfolio ── */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--gold-surface)]">
              <svg className="w-4 h-4 text-[var(--gold)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </span>
            <h2 className="section-label text-[13px]">내 포트폴리오</h2>

            <div className="ml-auto flex items-center gap-2">
              {portfolioLoading && (
                <span className="text-[9px] text-[var(--muted)] animate-pulse font-medium">
                  로딩...
                </span>
              )}
              <button
                onClick={onRefreshPrices}
                className="metal-btn flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold text-[var(--muted)] hover:text-[var(--foreground)]"
                title="새로고침"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                새로고침
              </button>
              <button
                onClick={() => setShowAddForm(true)}
                className="metal-btn flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold text-[var(--accent)] hover:bg-[var(--accent-surface)]"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                종목 추가
              </button>
            </div>
          </div>

          <div className="bg-[var(--surface)] rounded-lg border border-[var(--border-subtle)] overflow-hidden shadow-sm">
            <table className="portfolio-table">
              <thead>
                <tr>
                  <th className="text-left">종목명</th>
                  <th className="text-left">심볼</th>
                  <th className="text-right">현재가</th>
                  <th className="text-right">변동</th>
                  <th className="text-right">변동%</th>
                  <th className="text-center">스파크라인</th>
                  <th className="text-center" style={{ width: 48 }}>삭제</th>
                </tr>
              </thead>
              <tbody>
                {portfolioPrices.length > 0 ? (
                  portfolioPrices.map((p) => {
                    const isUp = p.changePct >= 0;
                    const changeColor = isUp ? "var(--success)" : "var(--danger)";
                    return (
                      <tr key={p.symbol}>
                        <td className="font-semibold text-[var(--foreground-bright)]">
                          {p.label}
                        </td>
                        <td className="text-[var(--muted)] font-mono text-[10px]">
                          {p.symbol}
                        </td>
                        <td className="text-right font-bold tabular-nums text-[var(--foreground-bright)]">
                          {formatPrice(p.price, p.symbol)}
                        </td>
                        <td className="text-right tabular-nums font-semibold" style={{ color: changeColor }}>
                          {isUp ? "+" : ""}{p.change.toFixed(2)}
                        </td>
                        <td className="text-right tabular-nums font-bold" style={{ color: changeColor }}>
                          <span className="inline-flex items-center gap-0.5">
                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              {isUp ? (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                              ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                              )}
                            </svg>
                            {isUp ? "+" : ""}{p.changePct.toFixed(2)}%
                          </span>
                        </td>
                        <td className="text-center">
                          <div className="flex justify-center">
                            <Sparkline data={p.sparkline} color={changeColor} />
                          </div>
                        </td>
                        <td className="text-center">
                          <button
                            onClick={() => onRemoveAsset(p.symbol)}
                            className="inline-flex items-center justify-center w-6 h-6 rounded-md text-[var(--muted)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-all"
                            title="삭제"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center" style={{ padding: "40px 16px" }}>
                      <div className="flex flex-col items-center gap-3">
                        {portfolioLoading ? (
                          <>
                            <svg className="w-8 h-8 text-[var(--muted)] animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            <span className="text-[11px] text-[var(--muted)]">데이터를 불러오는 중...</span>
                          </>
                        ) : (
                          <>
                            <div className="w-12 h-12 rounded-xl bg-[var(--surface-active)] flex items-center justify-center">
                              <svg className="w-6 h-6 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                              </svg>
                            </div>
                            <div className="text-center">
                              <p className="text-[12px] font-semibold text-[var(--foreground-secondary)]">
                                종목을 추가하세요
                              </p>
                              <p className="text-[10px] text-[var(--muted)] mt-0.5">
                                아래 인기 종목에서 선택하거나 직접 추가할 수 있습니다
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Add asset form */}
          {showAddForm && (
            <div className="mt-3 bg-[var(--surface)] p-3 rounded-lg border border-[var(--accent)]/30 shadow-sm">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customSymbol}
                  onChange={(e) => setCustomSymbol(e.target.value)}
                  placeholder="심볼 (예: AAPL)"
                  className="flex-1 px-3 py-2 text-[11px] bg-[var(--surface-active)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)] transition-colors"
                />
                <input
                  type="text"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  placeholder="종목명 (예: Apple)"
                  className="flex-1 px-3 py-2 text-[11px] bg-[var(--surface-active)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)] transition-colors"
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddCustom(); }}
                />
                <button
                  onClick={handleAddCustom}
                  className="px-4 py-2 text-[10px] font-bold bg-[var(--accent)] text-white rounded-[var(--radius-sm)] hover:opacity-90 transition-opacity"
                >
                  추가
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-2 text-[10px] font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ── Section 3: Popular Symbols ── */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--accent-surface)]">
              <svg className="w-4 h-4 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </span>
            <h2 className="section-label text-[13px]">인기 종목</h2>
          </div>

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
                  className={`metal-btn px-3 py-2.5 text-center transition-all ${
                    alreadyAdded
                      ? "opacity-40 cursor-not-allowed"
                      : "hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--accent-surface)] cursor-pointer"
                  }`}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-[11px] font-bold text-[var(--foreground)]">{s.label}</span>
                    {alreadyAdded && (
                      <svg className="w-3 h-3 text-[var(--success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
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
