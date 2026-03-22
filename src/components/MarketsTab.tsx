"use client";

import { useState, useEffect, useMemo } from "react";
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
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

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
    <div className="overflow-y-auto h-full" style={{ backgroundColor: "#0D0D0F" }}>
      <div style={{ padding: "24px 24px 40px", maxWidth: 960, margin: "0 auto" }}>

        {/* ── Section 1: Market Indicators ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 32 }}>
          {marketLoading && marketData.length === 0
            ? [1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  style={{
                    border: "1px solid #2D2D32",
                    borderRadius: 2,
                    padding: "14px 16px",
                  }}
                >
                  <div className="skeleton" style={{ height: 10, width: "50%", marginBottom: 10, borderRadius: 2 }} />
                  <div className="skeleton" style={{ height: 22, width: "70%", marginBottom: 8, borderRadius: 2 }} />
                  <div className="skeleton" style={{ height: 12, width: "40%", borderRadius: 2 }} />
                </div>
              ))
            : marketItems.map((item) => {
                const isUp = item.changePct >= 0;
                return (
                  <div
                    key={item.symbol}
                    style={{
                      border: "1px solid #2D2D32",
                      borderRadius: 2,
                      padding: "14px 16px",
                    }}
                  >
                    <div style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: "#8C8C91",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      marginBottom: 6,
                    }}>
                      {item.label}
                    </div>
                    <div style={{
                      fontSize: 20,
                      fontWeight: 700,
                      fontFamily: "var(--font-mono)",
                      color: "#EBEBEB",
                      lineHeight: 1.2,
                      marginBottom: 4,
                    }}>
                      {item.price > 0 ? formatPrice(item.price, item.symbol) : "--"}
                    </div>
                    <div style={{
                      fontSize: 12,
                      fontWeight: 600,
                      fontFamily: "var(--font-mono)",
                      color: isUp ? "#16a34a" : "#dc2626",
                    }}>
                      {item.price > 0 ? `${isUp ? "+" : ""}${item.changePct.toFixed(2)}%` : ""}
                    </div>
                  </div>
                );
              })
          }
        </div>

        {/* ── Section 2: Portfolio Table ── */}
        <div style={{ marginBottom: 32 }}>
          {/* Section title */}
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#8C8C91",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            borderBottom: "1px solid #2D2D32",
            paddingBottom: 8,
            marginBottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <span>PORTFOLIO</span>
            {portfolioLoading && (
              <span style={{ fontSize: 9, color: "#8C8C91", fontWeight: 400, textTransform: "none" }} className="animate-pulse">
                로딩...
              </span>
            )}
          </div>

          {/* Table */}
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", fontSize: 10, fontWeight: 600, color: "#8C8C91", textTransform: "uppercase", letterSpacing: "0.04em", padding: "10px 0", borderBottom: "1px solid #2D2D32" }}>종목명</th>
                <th style={{ textAlign: "left", fontSize: 10, fontWeight: 600, color: "#8C8C91", textTransform: "uppercase", letterSpacing: "0.04em", padding: "10px 0", borderBottom: "1px solid #2D2D32" }}>심볼</th>
                <th style={{ textAlign: "right", fontSize: 10, fontWeight: 600, color: "#8C8C91", textTransform: "uppercase", letterSpacing: "0.04em", padding: "10px 0", borderBottom: "1px solid #2D2D32" }}>현재가</th>
                <th style={{ textAlign: "right", fontSize: 10, fontWeight: 600, color: "#8C8C91", textTransform: "uppercase", letterSpacing: "0.04em", padding: "10px 0", borderBottom: "1px solid #2D2D32" }}>변동</th>
                <th style={{ textAlign: "right", fontSize: 10, fontWeight: 600, color: "#8C8C91", textTransform: "uppercase", letterSpacing: "0.04em", padding: "10px 0", borderBottom: "1px solid #2D2D32" }}>변동%</th>
                <th style={{ width: 32, borderBottom: "1px solid #2D2D32" }} />
              </tr>
            </thead>
            <tbody>
              {portfolioPrices.length > 0 ? (
                portfolioPrices.map((p) => {
                  const isUp = p.changePct >= 0;
                  const changeColor = isUp ? "#16a34a" : "#dc2626";
                  const isHovered = hoveredRow === p.symbol;
                  return (
                    <tr
                      key={p.symbol}
                      onMouseEnter={() => setHoveredRow(p.symbol)}
                      onMouseLeave={() => setHoveredRow(null)}
                      style={{
                        backgroundColor: isHovered ? "rgba(235,235,235,0.03)" : "transparent",
                        transition: "background-color 0.1s",
                      }}
                    >
                      <td style={{ padding: "8px 0", fontSize: 13, fontWeight: 500, color: "#EBEBEB", borderBottom: "1px solid #2D2D32" }}>
                        {p.label}
                      </td>
                      <td style={{ padding: "8px 0", fontSize: 10, fontFamily: "var(--font-mono)", color: "#8C8C91", borderBottom: "1px solid #2D2D32" }}>
                        {p.symbol}
                      </td>
                      <td style={{ padding: "8px 0", textAlign: "right", fontSize: 13, fontWeight: 600, fontFamily: "var(--font-mono)", color: "#EBEBEB", borderBottom: "1px solid #2D2D32" }}>
                        {formatPrice(p.price, p.symbol)}
                      </td>
                      <td style={{ padding: "8px 0", textAlign: "right", fontSize: 13, fontFamily: "var(--font-mono)", fontWeight: 500, color: changeColor, borderBottom: "1px solid #2D2D32" }}>
                        {isUp ? "+" : ""}{p.change.toFixed(2)}
                      </td>
                      <td style={{ padding: "8px 0", textAlign: "right", fontSize: 13, fontFamily: "var(--font-mono)", fontWeight: 600, color: changeColor, borderBottom: "1px solid #2D2D32" }}>
                        {isUp ? "+" : ""}{p.changePct.toFixed(2)}%
                      </td>
                      <td style={{ padding: "8px 0", textAlign: "center", borderBottom: "1px solid #2D2D32", width: 32 }}>
                        <button
                          onClick={() => onRemoveAsset(p.symbol)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "#8C8C91",
                            fontSize: 12,
                            fontFamily: "var(--font-mono)",
                            opacity: isHovered ? 1 : 0,
                            transition: "opacity 0.1s",
                            padding: "2px 4px",
                          }}
                          title="삭제"
                        >
                          x
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} style={{ padding: "40px 0", textAlign: "center" }}>
                    {portfolioLoading ? (
                      <span style={{ fontSize: 11, color: "#8C8C91" }} className="animate-pulse">데이터를 불러오는 중...</span>
                    ) : (
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#EBEBEB" }}>포트폴리오에 종목을 추가하세요</p>
                        <p style={{ fontSize: 11, color: "#8C8C91", marginTop: 4 }}>아래 인기 종목에서 바로 추가할 수 있습니다</p>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Add button */}
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 500,
                color: "#C9A96E",
                padding: "10px 0",
                display: "block",
              }}
            >
              + 종목 추가
            </button>
          ) : (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 0",
            }}>
              <input
                type="text"
                value={customSymbol}
                onChange={(e) => setCustomSymbol(e.target.value)}
                placeholder="심볼 (예: AAPL)"
                style={{
                  flex: 1,
                  padding: "6px 10px",
                  fontSize: 11,
                  backgroundColor: "transparent",
                  border: "1px solid #2D2D32",
                  borderRadius: 2,
                  color: "#EBEBEB",
                  outline: "none",
                }}
              />
              <input
                type="text"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="종목명 (예: Apple)"
                style={{
                  flex: 1,
                  padding: "6px 10px",
                  fontSize: 11,
                  backgroundColor: "transparent",
                  border: "1px solid #2D2D32",
                  borderRadius: 2,
                  color: "#EBEBEB",
                  outline: "none",
                }}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddCustom(); }}
              />
              <button
                onClick={handleAddCustom}
                style={{
                  padding: "6px 14px",
                  fontSize: 10,
                  fontWeight: 700,
                  backgroundColor: "#C9A96E",
                  color: "#0D0D0F",
                  border: "none",
                  borderRadius: 2,
                  cursor: "pointer",
                }}
              >
                추가
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                style={{
                  padding: "6px 10px",
                  fontSize: 10,
                  color: "#8C8C91",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                취소
              </button>
            </div>
          )}
        </div>

        {/* ── Section 3: Popular Symbols ── */}
        <div>
          {/* Section title */}
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#8C8C91",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            borderBottom: "1px solid #2D2D32",
            paddingBottom: 8,
            marginBottom: 12,
          }}>
            POPULAR
          </div>

          {/* Simple text list */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px" }}>
            {POPULAR_SYMBOLS.map((s) => {
              const alreadyAdded = existingSymbols.has(s.symbol);
              return (
                <button
                  key={s.symbol}
                  onClick={() => {
                    if (!alreadyAdded) onAddAsset(s);
                  }}
                  disabled={alreadyAdded}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: alreadyAdded ? "default" : "pointer",
                    padding: "4px 0",
                    fontSize: 12,
                    fontWeight: 500,
                    color: alreadyAdded ? "#8C8C91" : "#EBEBEB",
                    opacity: alreadyAdded ? 0.5 : 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  {s.label}
                  {alreadyAdded && (
                    <svg style={{ width: 10, height: 10, color: "#16a34a" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
