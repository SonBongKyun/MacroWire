"use client";

import { useState, useEffect, useMemo } from "react";
import type { PortfolioPrice, PortfolioAsset } from "@/hooks/usePortfolio";
import { PriceChart, MiniSparkline } from "@/components/PriceChart";
import { usePriceAlerts } from "@/hooks/usePriceAlerts";
import { usePortfolioPnL } from "@/hooks/usePortfolioPnL";

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

function formatPnL(value: number): string {
  const prefix = value >= 0 ? "+" : "";
  return prefix + value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ── Shared styles ── */
const sectionHeaderStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: "#8C8C91",
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  borderBottom: "1px solid #2C2D34",
  paddingBottom: 8,
  marginBottom: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const thStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  color: "#8C8C91",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  padding: "10px 0",
  borderBottom: "1px solid #2C2D34",
};

const inputStyle: React.CSSProperties = {
  padding: "6px 10px",
  fontSize: 11,
  backgroundColor: "transparent",
  border: "1px solid #2C2D34",
  borderRadius: 2,
  color: "#EBEBEB",
  outline: "none",
};

const goldBtnStyle: React.CSSProperties = {
  padding: "6px 14px",
  fontSize: 10,
  fontWeight: 700,
  backgroundColor: "#C9A96E",
  color: "#0D0E12",
  border: "none",
  borderRadius: 2,
  cursor: "pointer",
};

const cancelBtnStyle: React.CSSProperties = {
  padding: "6px 10px",
  fontSize: 10,
  color: "#8C8C91",
  background: "none",
  border: "none",
  cursor: "pointer",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: "none",
  WebkitAppearance: "none",
  paddingRight: 24,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8'%3E%3Cpath fill='%238C8C91' d='M0 2l4 4 4-4z'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 8px center",
};

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
  const [selectedChartIdx, setSelectedChartIdx] = useState(0);

  // Alert state
  const { alerts, addAlert, removeAlert, toggleAlert, checkAlerts } = usePriceAlerts();
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [alertSymbol, setAlertSymbol] = useState("");
  const [alertPrice, setAlertPrice] = useState("");
  const [alertDirection, setAlertDirection] = useState<"above" | "below">("above");

  // Position P&L state
  const { positions, addPosition, removePosition, computePnL } = usePortfolioPnL();
  const [showPositionForm, setShowPositionForm] = useState(false);
  const [posSymbol, setPosSymbol] = useState("");
  const [posQuantity, setPosQuantity] = useState("");
  const [posAvgCost, setPosAvgCost] = useState("");

  const existingSymbols = new Set(portfolioAssets.map((a) => a.symbol));

  // Generate fake sparkline from price & changePct for visual purposes
  const fakeSparkline = useMemo(() => {
    return (price: number, changePct: number): number[] => {
      if (!price) return [];
      const startPrice = price / (1 + changePct / 100);
      const steps = 24;
      const result: number[] = [startPrice];
      const diff = price - startPrice;
      for (let i = 1; i < steps; i++) {
        const progress = i / (steps - 1);
        const noise = (Math.sin(i * 2.7 + changePct) * 0.3 + Math.cos(i * 1.3) * 0.2) * Math.abs(diff) * 0.5;
        result.push(startPrice + diff * progress + noise);
      }
      result.push(price);
      return result;
    };
  }, []);

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

  // Check alerts when prices update
  useEffect(() => {
    if (portfolioPrices.length > 0) {
      checkAlerts(portfolioPrices.map((p) => ({ symbol: p.symbol, price: p.price })));
    }
  }, [portfolioPrices, checkAlerts]);

  // Compute P&L from current prices
  const pnlData = useMemo(() => {
    if (positions.length === 0 || portfolioPrices.length === 0) {
      return { items: [], totalValue: 0, totalCost: 0, totalPnL: 0, totalReturnPct: 0 };
    }
    return computePnL(portfolioPrices.map((p) => ({ symbol: p.symbol, price: p.price })));
  }, [positions, portfolioPrices, computePnL]);

  const handleAddCustom = () => {
    if (!customSymbol.trim() || !customLabel.trim()) return;
    onAddAsset({ symbol: customSymbol.trim().toUpperCase(), label: customLabel.trim(), type: "stock" });
    setCustomSymbol("");
    setCustomLabel("");
    setShowAddForm(false);
  };

  const handleAddAlert = () => {
    if (!alertSymbol || !alertPrice) return;
    const asset = portfolioAssets.find((a) => a.symbol === alertSymbol);
    if (!asset) return;
    addAlert({
      symbol: alertSymbol,
      label: asset.label,
      targetPrice: parseFloat(alertPrice),
      direction: alertDirection,
    });
    setAlertSymbol("");
    setAlertPrice("");
    setAlertDirection("above");
    setShowAlertForm(false);
  };

  const handleAddPosition = () => {
    if (!posSymbol || !posQuantity || !posAvgCost) return;
    const asset = portfolioAssets.find((a) => a.symbol === posSymbol);
    if (!asset) return;
    addPosition({
      symbol: posSymbol,
      label: asset.label,
      quantity: parseFloat(posQuantity),
      avgCost: parseFloat(posAvgCost),
    });
    setPosSymbol("");
    setPosQuantity("");
    setPosAvgCost("");
    setShowPositionForm(false);
  };

  const defaultMarketItems: MarketItem[] = [
    { symbol: "USDKRW=X", label: "USD/KRW", price: 0, change: 0, changePct: 0 },
    { symbol: "^KS11", label: "KOSPI", price: 0, change: 0, changePct: 0 },
    { symbol: "^GSPC", label: "S&P 500", price: 0, change: 0, changePct: 0 },
    { symbol: "CL=F", label: "WTI", price: 0, change: 0, changePct: 0 },
  ];

  const marketItems = marketData.length > 0 ? marketData : defaultMarketItems;

  return (
    <div className="overflow-y-auto h-full" style={{ backgroundColor: "#0D0E12" }}>
      <div style={{ padding: "24px 24px 40px", maxWidth: 960, margin: "0 auto" }}>

        {/* ── Section 1: Market Indicators ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 32 }}>
          {marketLoading && marketData.length === 0
            ? [1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  style={{
                    border: "1px solid #2C2D34",
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
                      border: "1px solid #2C2D34",
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
                    {item.price > 0 && (
                      <div style={{ marginTop: 6 }}>
                        <MiniSparkline
                          data={fakeSparkline(item.price, item.changePct)}
                          width={120}
                          height={36}
                          change={item.changePct}
                        />
                      </div>
                    )}
                  </div>
                );
              })
          }
        </div>

        {/* ── Section 1.5: Price Chart ── */}
        {portfolioPrices.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#8C8C91",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              borderBottom: "1px solid #2C2D34",
              paddingBottom: 8,
              marginBottom: 12,
              fontFamily: "var(--font-mono)",
            }}>
              PRICE CHART
            </div>

            {/* Asset selector */}
            <div style={{ display: "flex", gap: 0, marginBottom: 12, borderBottom: "1px solid #2C2D34" }}>
              {portfolioPrices.map((p, idx) => (
                <button
                  key={p.symbol}
                  onClick={() => setSelectedChartIdx(idx)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "6px 12px",
                    fontSize: 10,
                    fontWeight: 600,
                    fontFamily: "var(--font-mono)",
                    color: idx === selectedChartIdx ? "#C9A96E" : "#8C8C91",
                    borderBottom: idx === selectedChartIdx ? "2px solid #C9A96E" : "2px solid transparent",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    marginBottom: -1,
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Chart */}
            {portfolioPrices[selectedChartIdx] && (
              <PriceChart
                data={
                  portfolioPrices[selectedChartIdx].sparkline.length >= 2
                    ? portfolioPrices[selectedChartIdx].sparkline
                    : fakeSparkline(
                        portfolioPrices[selectedChartIdx].price,
                        portfolioPrices[selectedChartIdx].changePct
                      )
                }
                height={180}
                change={portfolioPrices[selectedChartIdx].changePct}
                label={portfolioPrices[selectedChartIdx].label}
              />
            )}
          </div>
        )}

        {/* ── Section 2: Portfolio Table ── */}
        <div style={{ marginBottom: 32 }}>
          <div style={sectionHeaderStyle}>
            <span>PORTFOLIO</span>
            {portfolioLoading && (
              <span style={{ fontSize: 9, color: "#8C8C91", fontWeight: 400, textTransform: "none" }} className="animate-pulse">
                로딩...
              </span>
            )}
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, textAlign: "left" }}>종목명</th>
                <th style={{ ...thStyle, textAlign: "left" }}>심볼</th>
                <th style={{ ...thStyle, textAlign: "right" }}>현재가</th>
                <th style={{ ...thStyle, textAlign: "right" }}>변동</th>
                <th style={{ ...thStyle, textAlign: "right" }}>변동%</th>
                <th style={{ width: 32, borderBottom: "1px solid #2C2D34" }} />
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
                        transition: "background-color 0.15s",
                      }}
                    >
                      <td style={{ padding: "8px 0", fontSize: 13, fontWeight: 500, color: "#EBEBEB", borderBottom: "1px solid #2C2D34" }}>
                        {p.label}
                      </td>
                      <td style={{ padding: "8px 0", fontSize: 10, fontFamily: "var(--font-mono)", color: "#8C8C91", borderBottom: "1px solid #2C2D34" }}>
                        {p.symbol}
                      </td>
                      <td style={{ padding: "8px 0", textAlign: "right", fontSize: 13, fontWeight: 600, fontFamily: "var(--font-mono)", color: "#EBEBEB", borderBottom: "1px solid #2C2D34" }}>
                        {formatPrice(p.price, p.symbol)}
                      </td>
                      <td style={{ padding: "8px 0", textAlign: "right", fontSize: 13, fontFamily: "var(--font-mono)", fontWeight: 500, color: changeColor, borderBottom: "1px solid #2C2D34" }}>
                        {isUp ? "+" : ""}{p.change.toFixed(2)}
                      </td>
                      <td style={{ padding: "8px 0", textAlign: "right", fontSize: 13, fontFamily: "var(--font-mono)", fontWeight: 600, color: changeColor, borderBottom: "1px solid #2C2D34" }}>
                        {isUp ? "+" : ""}{p.changePct.toFixed(2)}%
                      </td>
                      <td style={{ padding: "8px 0", textAlign: "center", borderBottom: "1px solid #2C2D34", width: 32 }}>
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
                            transition: "opacity 0.15s",
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
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 0" }}>
              <input
                type="text"
                value={customSymbol}
                onChange={(e) => setCustomSymbol(e.target.value)}
                placeholder="심볼 (예: AAPL)"
                style={{ ...inputStyle, flex: 1 }}
              />
              <input
                type="text"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="종목명 (예: Apple)"
                style={{ ...inputStyle, flex: 1 }}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddCustom(); }}
              />
              <button onClick={handleAddCustom} style={goldBtnStyle}>추가</button>
              <button onClick={() => setShowAddForm(false)} style={cancelBtnStyle}>취소</button>
            </div>
          )}
        </div>

        {/* ── Section 3: Alerts ── */}
        <div style={{ marginBottom: 32 }}>
          <div style={sectionHeaderStyle}>
            <span>ALERTS</span>
            <span style={{ fontSize: 9, color: "#8C8C91", fontWeight: 400, textTransform: "none" }}>
              {alerts.filter((a) => a.active && !a.triggeredAt).length} active
            </span>
          </div>

          {alerts.length > 0 ? (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, textAlign: "left" }}>종목</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>목표가</th>
                  <th style={{ ...thStyle, textAlign: "center" }}>방향</th>
                  <th style={{ ...thStyle, textAlign: "center" }}>상태</th>
                  <th style={{ width: 60, borderBottom: "1px solid #2C2D34" }} />
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert) => {
                  const isTriggered = !!alert.triggeredAt;
                  const rowColor = isTriggered ? "#C9A96E" : alert.active ? "#EBEBEB" : "#8C8C91";
                  return (
                    <tr key={alert.id}>
                      <td style={{
                        padding: "8px 0",
                        fontSize: 13,
                        fontWeight: 500,
                        color: rowColor,
                        borderBottom: "1px solid #2C2D34",
                      }}>
                        {alert.label}
                        <span style={{ marginLeft: 6, fontSize: 10, fontFamily: "var(--font-mono)", color: "#8C8C91" }}>
                          {alert.symbol}
                        </span>
                      </td>
                      <td style={{
                        padding: "8px 0",
                        textAlign: "right",
                        fontSize: 13,
                        fontWeight: 600,
                        fontFamily: "var(--font-mono)",
                        color: rowColor,
                        borderBottom: "1px solid #2C2D34",
                      }}>
                        {formatPrice(alert.targetPrice, alert.symbol)}
                      </td>
                      <td style={{
                        padding: "8px 0",
                        textAlign: "center",
                        fontSize: 13,
                        fontFamily: "var(--font-mono)",
                        fontWeight: 600,
                        color: alert.direction === "above" ? "#16a34a" : "#dc2626",
                        borderBottom: "1px solid #2C2D34",
                      }}>
                        {alert.direction === "above" ? "▲" : "▼"}
                      </td>
                      <td style={{
                        padding: "8px 0",
                        textAlign: "center",
                        fontSize: 10,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        color: isTriggered ? "#C9A96E" : alert.active ? "#16a34a" : "#8C8C91",
                        borderBottom: "1px solid #2C2D34",
                      }}>
                        {isTriggered ? "TRIGGERED" : alert.active ? "ACTIVE" : "OFF"}
                      </td>
                      <td style={{ padding: "8px 0", textAlign: "right", borderBottom: "1px solid #2C2D34", width: 60, whiteSpace: "nowrap" }}>
                        {!isTriggered && (
                          <button
                            onClick={() => toggleAlert(alert.id)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "#8C8C91",
                              fontSize: 10,
                              fontFamily: "var(--font-mono)",
                              padding: "2px 4px",
                              marginRight: 2,
                            }}
                            title={alert.active ? "비활성화" : "활성화"}
                          >
                            {alert.active ? "off" : "on"}
                          </button>
                        )}
                        <button
                          onClick={() => removeAlert(alert.id)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "#8C8C91",
                            fontSize: 12,
                            fontFamily: "var(--font-mono)",
                            padding: "2px 4px",
                          }}
                          title="삭제"
                        >
                          x
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: "24px 0", textAlign: "center" }}>
              <p style={{ fontSize: 12, color: "#8C8C91" }}>설정된 알림이 없습니다</p>
            </div>
          )}

          {!showAlertForm ? (
            <button
              onClick={() => {
                if (portfolioAssets.length > 0) setAlertSymbol(portfolioAssets[0].symbol);
                setShowAlertForm(true);
              }}
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
              + 알림 추가
            </button>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 0" }}>
              <select
                value={alertSymbol}
                onChange={(e) => setAlertSymbol(e.target.value)}
                style={{ ...selectStyle, flex: 1 }}
              >
                {portfolioAssets.map((a) => (
                  <option key={a.symbol} value={a.symbol} style={{ backgroundColor: "#0D0E12", color: "#EBEBEB" }}>
                    {a.label}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={alertPrice}
                onChange={(e) => setAlertPrice(e.target.value)}
                placeholder="목표가"
                style={{ ...inputStyle, width: 120 }}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddAlert(); }}
              />
              <select
                value={alertDirection}
                onChange={(e) => setAlertDirection(e.target.value as "above" | "below")}
                style={{ ...selectStyle, width: 80 }}
              >
                <option value="above" style={{ backgroundColor: "#0D0E12", color: "#EBEBEB" }}>▲ 이상</option>
                <option value="below" style={{ backgroundColor: "#0D0E12", color: "#EBEBEB" }}>▼ 이하</option>
              </select>
              <button onClick={handleAddAlert} style={goldBtnStyle}>추가</button>
              <button onClick={() => setShowAlertForm(false)} style={cancelBtnStyle}>취소</button>
            </div>
          )}
        </div>

        {/* ── Section 4: Positions P&L ── */}
        <div style={{ marginBottom: 32 }}>
          <div style={sectionHeaderStyle}>
            <span>POSITIONS</span>
            {pnlData.items.length > 0 && (
              <span style={{
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                fontWeight: 600,
                color: pnlData.totalPnL >= 0 ? "#16a34a" : "#dc2626",
                textTransform: "none",
              }}>
                {formatPnL(pnlData.totalPnL)}
              </span>
            )}
          </div>

          {pnlData.items.length > 0 ? (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, textAlign: "left" }}>종목명</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>수량</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>평균단가</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>현재가</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>손익</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>손익%</th>
                  <th style={{ width: 32, borderBottom: "1px solid #2C2D34" }} />
                </tr>
              </thead>
              <tbody>
                {pnlData.items.map((item) => {
                  const pnlColor = item.pnl >= 0 ? "#16a34a" : "#dc2626";
                  return (
                    <tr key={item.symbol}>
                      <td style={{ padding: "8px 0", fontSize: 13, fontWeight: 500, color: "#EBEBEB", borderBottom: "1px solid #2C2D34" }}>
                        {item.label}
                        <span style={{ marginLeft: 6, fontSize: 10, fontFamily: "var(--font-mono)", color: "#8C8C91" }}>
                          {item.symbol}
                        </span>
                      </td>
                      <td style={{ padding: "8px 0", textAlign: "right", fontSize: 13, fontFamily: "var(--font-mono)", color: "#EBEBEB", borderBottom: "1px solid #2C2D34" }}>
                        {item.quantity.toLocaleString()}
                      </td>
                      <td style={{ padding: "8px 0", textAlign: "right", fontSize: 13, fontFamily: "var(--font-mono)", color: "#8C8C91", borderBottom: "1px solid #2C2D34" }}>
                        {formatPrice(item.avgCost, item.symbol)}
                      </td>
                      <td style={{ padding: "8px 0", textAlign: "right", fontSize: 13, fontWeight: 600, fontFamily: "var(--font-mono)", color: "#EBEBEB", borderBottom: "1px solid #2C2D34" }}>
                        {item.currentPrice > 0 ? formatPrice(item.currentPrice, item.symbol) : "--"}
                      </td>
                      <td style={{ padding: "8px 0", textAlign: "right", fontSize: 13, fontWeight: 600, fontFamily: "var(--font-mono)", color: pnlColor, borderBottom: "1px solid #2C2D34" }}>
                        {formatPnL(item.pnl)}
                      </td>
                      <td style={{ padding: "8px 0", textAlign: "right", fontSize: 13, fontWeight: 600, fontFamily: "var(--font-mono)", color: pnlColor, borderBottom: "1px solid #2C2D34" }}>
                        {item.pnl >= 0 ? "+" : ""}{item.pnlPct.toFixed(2)}%
                      </td>
                      <td style={{ padding: "8px 0", textAlign: "center", borderBottom: "1px solid #2C2D34", width: 32 }}>
                        <button
                          onClick={() => removePosition(item.symbol)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "#8C8C91",
                            fontSize: 12,
                            fontFamily: "var(--font-mono)",
                            padding: "2px 4px",
                          }}
                          title="삭제"
                        >
                          x
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {/* Total row */}
                <tr>
                  <td style={{ padding: "10px 0", fontSize: 12, fontWeight: 700, color: "#EBEBEB", borderTop: "1px solid #2C2D34" }}>
                    TOTAL
                  </td>
                  <td style={{ borderTop: "1px solid #2C2D34" }} />
                  <td style={{ padding: "10px 0", textAlign: "right", fontSize: 12, fontFamily: "var(--font-mono)", color: "#8C8C91", borderTop: "1px solid #2C2D34" }}>
                    {pnlData.totalCost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: "10px 0", textAlign: "right", fontSize: 12, fontWeight: 600, fontFamily: "var(--font-mono)", color: "#EBEBEB", borderTop: "1px solid #2C2D34" }}>
                    {pnlData.totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td style={{
                    padding: "10px 0",
                    textAlign: "right",
                    fontSize: 12,
                    fontWeight: 700,
                    fontFamily: "var(--font-mono)",
                    color: pnlData.totalPnL >= 0 ? "#16a34a" : "#dc2626",
                    borderTop: "1px solid #2C2D34",
                  }}>
                    {formatPnL(pnlData.totalPnL)}
                  </td>
                  <td style={{
                    padding: "10px 0",
                    textAlign: "right",
                    fontSize: 12,
                    fontWeight: 700,
                    fontFamily: "var(--font-mono)",
                    color: pnlData.totalReturnPct >= 0 ? "#16a34a" : "#dc2626",
                    borderTop: "1px solid #2C2D34",
                  }}>
                    {pnlData.totalReturnPct >= 0 ? "+" : ""}{pnlData.totalReturnPct.toFixed(2)}%
                  </td>
                  <td style={{ borderTop: "1px solid #2C2D34" }} />
                </tr>
              </tbody>
            </table>
          ) : (
            <div style={{ padding: "24px 0", textAlign: "center" }}>
              <p style={{ fontSize: 12, color: "#8C8C91" }}>등록된 포지션이 없습니다</p>
            </div>
          )}

          {!showPositionForm ? (
            <button
              onClick={() => {
                if (portfolioAssets.length > 0) setPosSymbol(portfolioAssets[0].symbol);
                setShowPositionForm(true);
              }}
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
              + 포지션 추가
            </button>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 0" }}>
              <select
                value={posSymbol}
                onChange={(e) => setPosSymbol(e.target.value)}
                style={{ ...selectStyle, flex: 1 }}
              >
                {portfolioAssets.map((a) => (
                  <option key={a.symbol} value={a.symbol} style={{ backgroundColor: "#0D0E12", color: "#EBEBEB" }}>
                    {a.label}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={posQuantity}
                onChange={(e) => setPosQuantity(e.target.value)}
                placeholder="수량"
                style={{ ...inputStyle, width: 100 }}
              />
              <input
                type="number"
                value={posAvgCost}
                onChange={(e) => setPosAvgCost(e.target.value)}
                placeholder="평균단가"
                style={{ ...inputStyle, width: 120 }}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddPosition(); }}
              />
              <button onClick={handleAddPosition} style={goldBtnStyle}>추가</button>
              <button onClick={() => setShowPositionForm(false)} style={cancelBtnStyle}>취소</button>
            </div>
          )}
        </div>

        {/* ── Section 5: Popular Symbols ── */}
        <div>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#8C8C91",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            borderBottom: "1px solid #2C2D34",
            paddingBottom: 8,
            marginBottom: 12,
          }}>
            POPULAR
          </div>

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
