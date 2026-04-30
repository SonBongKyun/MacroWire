"use client";

import { useState, useMemo, useCallback } from "react";
import type { PortfolioPrice, PortfolioAsset } from "@/hooks/usePortfolio";

interface PortfolioTabProps {
  portfolioPrices: PortfolioPrice[];
  portfolioAssets: PortfolioAsset[];
  onAddAsset: (asset: Omit<PortfolioAsset, "addedAt">) => void;
  onRemoveAsset: (symbol: string) => void;
  onRefreshPrices: () => void;
  loading: boolean;
}

type SortKey = "label" | "price" | "change" | "changePct" | "value" | "weight";
type SortDir = "asc" | "desc";

// Local storage keys for portfolio-specific data
const HOLDINGS_KEY = "ryzm-portfolio-holdings";
const ALERTS_KEY = "ryzm-portfolio-alerts";
const NOTES_KEY = "ryzm-portfolio-notes";

interface Holding {
  symbol: string;
  quantity: number;
  avgCost: number;
}

interface PriceAlert {
  id: string;
  symbol: string;
  label: string;
  targetPrice: number;
  direction: "above" | "below";
  active: boolean;
}

interface AssetNote {
  symbol: string;
  text: string;
  updatedAt: string;
}

function loadHoldings(): Holding[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HOLDINGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadAlerts(): PriceAlert[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ALERTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadNotes(): AssetNote[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function formatNumber(n: number, decimals = 0): string {
  return n.toLocaleString("ko-KR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function PortfolioTab({
  portfolioPrices,
  portfolioAssets,
  onRefreshPrices,
  loading,
}: PortfolioTabProps) {
  const [holdings, setHoldings] = useState<Holding[]>(loadHoldings);
  const [alerts, setAlerts] = useState<PriceAlert[]>(loadAlerts);
  const [notes, setNotes] = useState<AssetNote[]>(loadNotes);
  const [sortKey, setSortKey] = useState<SortKey>("label");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Persist helpers
  const persistHoldings = useCallback((h: Holding[]) => {
    setHoldings(h);
    localStorage.setItem(HOLDINGS_KEY, JSON.stringify(h));
  }, []);

  const persistAlerts = useCallback((a: PriceAlert[]) => {
    setAlerts(a);
    localStorage.setItem(ALERTS_KEY, JSON.stringify(a));
  }, []);

  const persistNotes = useCallback((n: AssetNote[]) => {
    setNotes(n);
    localStorage.setItem(NOTES_KEY, JSON.stringify(n));
  }, []);

  // Merged data: price + holding
  const rows = useMemo(() => {
    return portfolioPrices.map((p) => {
      const holding = holdings.find((h) => h.symbol === p.symbol);
      const quantity = holding?.quantity || 0;
      const avgCost = holding?.avgCost || 0;
      const currentValue = quantity * p.price;
      const costBasis = quantity * avgCost;
      const pnl = currentValue - costBasis;
      const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
      return {
        ...p,
        quantity,
        avgCost,
        currentValue,
        costBasis,
        pnl,
        pnlPct,
      };
    });
  }, [portfolioPrices, holdings]);

  const totalValue = rows.reduce((sum, r) => sum + r.currentValue, 0);
  const totalCost = rows.reduce((sum, r) => sum + r.costBasis, 0);
  const totalPnl = totalValue - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  // Day change based on changePct
  const dayChange = rows.reduce((sum, r) => {
    if (r.quantity > 0 && r.changePct !== 0) {
      const prevValue = r.currentValue / (1 + r.changePct / 100);
      return sum + (r.currentValue - prevValue);
    }
    return sum;
  }, 0);
  const dayChangePct = totalValue > 0 && dayChange !== 0 ? (dayChange / (totalValue - dayChange)) * 100 : 0;

  // Sorting
  const sortedRows = useMemo(() => {
    const sorted = [...rows];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "label":
          cmp = a.label.localeCompare(b.label, "ko");
          break;
        case "price":
          cmp = a.price - b.price;
          break;
        case "change":
          cmp = a.pnl - b.pnl;
          break;
        case "changePct":
          cmp = a.pnlPct - b.pnlPct;
          break;
        case "value":
          cmp = a.currentValue - b.currentValue;
          break;
        case "weight":
          cmp =
            (totalValue > 0 ? a.currentValue / totalValue : 0) -
            (totalValue > 0 ? b.currentValue / totalValue : 0);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [rows, sortKey, sortDir, totalValue]);

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("desc");
      }
    },
    [sortKey]
  );

  // Allocation data for pie chart
  const allocation = useMemo(() => {
    if (totalValue === 0) return portfolioPrices.map((p) => ({ label: p.label, pct: 100 / portfolioPrices.length }));
    return rows
      .filter((r) => r.currentValue > 0)
      .map((r) => ({
        label: r.label,
        pct: (r.currentValue / totalValue) * 100,
      }))
      .sort((a, b) => b.pct - a.pct);
  }, [rows, totalValue, portfolioPrices]);

  const pieColors = ["#C9A96E", "#8B7A4E", "#5E5332", "#A0C4FF", "#6B8FAD", "#4A6375", "#FF8C8C", "#AD6B6B"];

  // Holdings edit
  const [editingSymbol, setEditingSymbol] = useState<string | null>(null);
  const [editQty, setEditQty] = useState("");
  const [editCost, setEditCost] = useState("");

  const startEdit = useCallback(
    (symbol: string) => {
      const h = holdings.find((x) => x.symbol === symbol);
      setEditingSymbol(symbol);
      setEditQty(h ? String(h.quantity) : "");
      setEditCost(h ? String(h.avgCost) : "");
    },
    [holdings]
  );

  const saveEdit = useCallback(() => {
    if (!editingSymbol) return;
    const qty = parseFloat(editQty) || 0;
    const cost = parseFloat(editCost) || 0;
    const existing = holdings.filter((h) => h.symbol !== editingSymbol);
    if (qty > 0) {
      persistHoldings([...existing, { symbol: editingSymbol, quantity: qty, avgCost: cost }]);
    } else {
      persistHoldings(existing);
    }
    setEditingSymbol(null);
  }, [editingSymbol, editQty, editCost, holdings, persistHoldings]);

  // Notes
  const updateNote = useCallback(
    (symbol: string, text: string) => {
      const existing = notes.filter((n) => n.symbol !== symbol);
      if (text.trim()) {
        persistNotes([...existing, { symbol, text, updatedAt: new Date().toISOString() }]);
      } else {
        persistNotes(existing);
      }
    },
    [notes, persistNotes]
  );

  // Alert management
  const [newAlertSymbol, setNewAlertSymbol] = useState("");
  const [newAlertPrice, setNewAlertPrice] = useState("");
  const [newAlertDir, setNewAlertDir] = useState<"above" | "below">("above");

  const addAlert = useCallback(() => {
    if (!newAlertSymbol || !newAlertPrice) return;
    const asset = portfolioAssets.find((a) => a.symbol === newAlertSymbol);
    const alert: PriceAlert = {
      id: Date.now().toString(),
      symbol: newAlertSymbol,
      label: asset?.label || newAlertSymbol,
      targetPrice: parseFloat(newAlertPrice) || 0,
      direction: newAlertDir,
      active: true,
    };
    persistAlerts([...alerts, alert]);
    setNewAlertSymbol("");
    setNewAlertPrice("");
  }, [newAlertSymbol, newAlertPrice, newAlertDir, alerts, portfolioAssets, persistAlerts]);

  const removeAlert = useCallback(
    (id: string) => {
      persistAlerts(alerts.filter((a) => a.id !== id));
    },
    [alerts, persistAlerts]
  );

  const sortArrow = (key: SortKey) => {
    if (sortKey !== key) return null;
    return (
      <span style={{ marginLeft: 2, fontSize: 8, color: "#C9A96E" }}>
        {sortDir === "asc" ? "\u25B2" : "\u25BC"}
      </span>
    );
  };

  const colHeaderStyle = (key: SortKey): React.CSSProperties => ({
    fontSize: 9,
    fontWeight: 700,
    color: sortKey === key ? "#C9A96E" : "#8C8C91",
    letterSpacing: "0.06em",
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top strip: Portfolio Summary */}
      <div
        style={{
          padding: "16px 24px",
          borderBottom: "1px solid #2C2D34",
          display: "flex",
          alignItems: "center",
          gap: 32,
        }}
      >
        <div>
          <div
            className="font-heading"
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: "#8C8C91",
              letterSpacing: "0.1em",
              marginBottom: 4,
            }}
          >
            PORTFOLIO VALUE
          </div>
          <div
            className="font-mono"
            style={{ fontSize: 28, fontWeight: 700, color: "#C9A96E", lineHeight: 1 }}
          >
            {totalValue > 0 ? formatNumber(totalValue) : "--"}
          </div>
        </div>
        <div style={{ borderLeft: "1px solid #2C2D34", paddingLeft: 24 }}>
          <div
            className="font-heading"
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: "#8C8C91",
              letterSpacing: "0.1em",
              marginBottom: 4,
            }}
          >
            TOTAL P&L
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span
              className="font-mono"
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: totalPnl >= 0 ? "#4ADE80" : "#F87171",
              }}
            >
              {totalPnl >= 0 ? "+" : ""}
              {formatNumber(totalPnl)}
            </span>
            <span
              className="font-mono"
              style={{
                fontSize: 12,
                color: totalPnlPct >= 0 ? "#4ADE80" : "#F87171",
              }}
            >
              ({totalPnlPct >= 0 ? "+" : ""}
              {totalPnlPct.toFixed(2)}%)
            </span>
          </div>
        </div>
        <div style={{ borderLeft: "1px solid #2C2D34", paddingLeft: 24 }}>
          <div
            className="font-heading"
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: "#8C8C91",
              letterSpacing: "0.1em",
              marginBottom: 4,
            }}
          >
            DAY CHANGE
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span
              className="font-mono"
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: dayChange >= 0 ? "#4ADE80" : "#F87171",
              }}
            >
              {dayChange >= 0 ? "+" : ""}
              {formatNumber(dayChange)}
            </span>
            <span
              className="font-mono"
              style={{
                fontSize: 12,
                color: dayChangePct >= 0 ? "#4ADE80" : "#F87171",
              }}
            >
              ({dayChangePct >= 0 ? "+" : ""}
              {dayChangePct.toFixed(2)}%)
            </span>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <button
          onClick={onRefreshPrices}
          disabled={loading}
          style={{
            padding: "6px 14px",
            fontSize: 10,
            fontWeight: 600,
            color: loading ? "#8C8C91" : "#C9A96E",
            border: "1px solid",
            borderColor: loading ? "#2C2D34" : "#C9A96E",
            background: "transparent",
            cursor: loading ? "wait" : "pointer",
            fontFamily: "var(--font-heading)",
            letterSpacing: "0.06em",
            transition: "all 0.15s",
          }}
        >
          {loading ? "..." : "REFRESH"}
        </button>
      </div>

      {/* Main content */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "65% 35%",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        {/* Left column: Holdings Table */}
        <div
          style={{
            borderRight: "1px solid #2C2D34",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: "12px 20px 8px",
              borderBottom: "1px solid #2C2D34",
            }}
          >
            <span
              className="font-heading"
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: "#8C8C91",
                letterSpacing: "0.1em",
              }}
            >
              HOLDINGS
            </span>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 11,
              }}
            >
              <thead>
                <tr style={{ borderBottom: "1px solid #2C2D34" }}>
                  <th
                    style={{ ...colHeaderStyle("label"), padding: "8px 12px", textAlign: "left" }}
                    onClick={() => handleSort("label")}
                  >
                    종목명{sortArrow("label")}
                  </th>
                  <th
                    style={{ ...colHeaderStyle("label"), padding: "8px 8px", textAlign: "right" }}
                  >
                    수량
                  </th>
                  <th
                    style={{ ...colHeaderStyle("label"), padding: "8px 8px", textAlign: "right" }}
                  >
                    평균단가
                  </th>
                  <th
                    style={{ ...colHeaderStyle("price"), padding: "8px 8px", textAlign: "right" }}
                    onClick={() => handleSort("price")}
                  >
                    현재가{sortArrow("price")}
                  </th>
                  <th
                    style={{ ...colHeaderStyle("value"), padding: "8px 8px", textAlign: "right" }}
                    onClick={() => handleSort("value")}
                  >
                    평가금액{sortArrow("value")}
                  </th>
                  <th
                    style={{ ...colHeaderStyle("changePct"), padding: "8px 8px", textAlign: "right" }}
                    onClick={() => handleSort("changePct")}
                  >
                    손익(%){sortArrow("changePct")}
                  </th>
                  <th
                    style={{ ...colHeaderStyle("weight"), padding: "8px 12px", textAlign: "right" }}
                    onClick={() => handleSort("weight")}
                  >
                    비중(%){sortArrow("weight")}
                  </th>
                  <th style={{ padding: "8px 8px", width: 40 }} />
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row) => {
                  const weight = totalValue > 0 ? (row.currentValue / totalValue) * 100 : 0;
                  const isEditing = editingSymbol === row.symbol;
                  return (
                    <tr
                      key={row.symbol}
                      style={{
                        borderBottom: "1px solid #1B1C22",
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <td style={{ padding: "8px 12px", color: "#EBEBEB", fontWeight: 600 }}>
                        <div>{row.label}</div>
                        <div style={{ fontSize: 9, color: "#8C8C91", fontFamily: "var(--font-mono)" }}>
                          {row.symbol}
                        </div>
                      </td>
                      <td style={{ padding: "8px 8px", textAlign: "right" }}>
                        {isEditing ? (
                          <input
                            type="number"
                            value={editQty}
                            onChange={(e) => setEditQty(e.target.value)}
                            style={{
                              width: 60,
                              fontSize: 10,
                              padding: "2px 4px",
                              background: "#1B1C22",
                              border: "1px solid #C9A96E",
                              color: "#EBEBEB",
                              textAlign: "right",
                              fontFamily: "var(--font-mono)",
                            }}
                          />
                        ) : (
                          <span className="font-mono" style={{ color: "#EBEBEB" }}>
                            {row.quantity > 0 ? formatNumber(row.quantity, 2) : "--"}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "8px 8px", textAlign: "right" }}>
                        {isEditing ? (
                          <input
                            type="number"
                            value={editCost}
                            onChange={(e) => setEditCost(e.target.value)}
                            style={{
                              width: 70,
                              fontSize: 10,
                              padding: "2px 4px",
                              background: "#1B1C22",
                              border: "1px solid #C9A96E",
                              color: "#EBEBEB",
                              textAlign: "right",
                              fontFamily: "var(--font-mono)",
                            }}
                          />
                        ) : (
                          <span className="font-mono" style={{ color: "#EBEBEB" }}>
                            {row.avgCost > 0 ? formatNumber(row.avgCost) : "--"}
                          </span>
                        )}
                      </td>
                      <td
                        className="font-mono"
                        style={{ padding: "8px 8px", textAlign: "right", color: "#EBEBEB" }}
                      >
                        {formatNumber(row.price, 2)}
                      </td>
                      <td
                        className="font-mono"
                        style={{ padding: "8px 8px", textAlign: "right", color: "#EBEBEB" }}
                      >
                        {row.currentValue > 0 ? formatNumber(row.currentValue) : "--"}
                      </td>
                      <td
                        className="font-mono"
                        style={{
                          padding: "8px 8px",
                          textAlign: "right",
                          color: row.pnl >= 0 ? "#4ADE80" : "#F87171",
                        }}
                      >
                        {row.quantity > 0 ? (
                          <>
                            <div>
                              {row.pnl >= 0 ? "+" : ""}
                              {formatNumber(row.pnl)}
                            </div>
                            <div style={{ fontSize: 9 }}>
                              ({row.pnlPct >= 0 ? "+" : ""}
                              {row.pnlPct.toFixed(2)}%)
                            </div>
                          </>
                        ) : (
                          <span style={{ color: "#8C8C91" }}>--</span>
                        )}
                      </td>
                      <td
                        className="font-mono"
                        style={{ padding: "8px 12px", textAlign: "right", color: "#8C8C91" }}
                      >
                        {row.currentValue > 0 ? weight.toFixed(1) + "%" : "--"}
                      </td>
                      <td style={{ padding: "8px 8px", textAlign: "center" }}>
                        {isEditing ? (
                          <button
                            onClick={saveEdit}
                            style={{
                              fontSize: 9,
                              color: "#C9A96E",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              fontWeight: 700,
                            }}
                          >
                            SAVE
                          </button>
                        ) : (
                          <button
                            onClick={() => startEdit(row.symbol)}
                            style={{
                              fontSize: 9,
                              color: "#8C8C91",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                            }}
                            title="수량/단가 편집"
                          >
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 12 12"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.2"
                            >
                              <path d="M8.5 1.5l2 2L4 10H2v-2l6.5-6.5z" />
                            </svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {/* Total Row */}
                {sortedRows.length > 0 && (
                  <tr
                    style={{
                      borderTop: "2px solid #2C2D34",
                      background: "rgba(201,169,110,0.03)",
                    }}
                  >
                    <td
                      style={{
                        padding: "10px 12px",
                        fontWeight: 700,
                        color: "#C9A96E",
                        fontSize: 11,
                      }}
                    >
                      TOTAL
                    </td>
                    <td colSpan={3} />
                    <td
                      className="font-mono"
                      style={{
                        padding: "10px 8px",
                        textAlign: "right",
                        fontWeight: 700,
                        color: "#C9A96E",
                      }}
                    >
                      {totalValue > 0 ? formatNumber(totalValue) : "--"}
                    </td>
                    <td
                      className="font-mono"
                      style={{
                        padding: "10px 8px",
                        textAlign: "right",
                        fontWeight: 700,
                        color: totalPnl >= 0 ? "#4ADE80" : "#F87171",
                      }}
                    >
                      {totalCost > 0 ? (
                        <>
                          <div>
                            {totalPnl >= 0 ? "+" : ""}
                            {formatNumber(totalPnl)}
                          </div>
                          <div style={{ fontSize: 9 }}>
                            ({totalPnlPct >= 0 ? "+" : ""}
                            {totalPnlPct.toFixed(2)}%)
                          </div>
                        </>
                      ) : (
                        "--"
                      )}
                    </td>
                    <td
                      className="font-mono"
                      style={{
                        padding: "10px 12px",
                        textAlign: "right",
                        color: "#C9A96E",
                        fontWeight: 700,
                      }}
                    >
                      100%
                    </td>
                    <td />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column */}
        <div
          style={{
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ flex: 1, overflowY: "auto" }}>
            {/* Allocation section */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #2C2D34" }}>
              <div
                className="font-heading"
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: "#8C8C91",
                  letterSpacing: "0.1em",
                  marginBottom: 12,
                }}
              >
                ALLOCATION
              </div>
              {/* SVG Pie Chart */}
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <svg width="100" height="100" viewBox="0 0 100 100">
                  {(() => {
                    let cumulative = 0;
                    return allocation.map((item, i) => {
                      const pct = item.pct / 100;
                      const startAngle = cumulative * 2 * Math.PI - Math.PI / 2;
                      cumulative += pct;
                      const endAngle = cumulative * 2 * Math.PI - Math.PI / 2;
                      const largeArc = pct > 0.5 ? 1 : 0;
                      const x1 = 50 + 40 * Math.cos(startAngle);
                      const y1 = 50 + 40 * Math.sin(startAngle);
                      const x2 = 50 + 40 * Math.cos(endAngle);
                      const y2 = 50 + 40 * Math.sin(endAngle);
                      if (pct <= 0) return null;
                      if (pct >= 0.999) {
                        return (
                          <circle
                            key={i}
                            cx="50"
                            cy="50"
                            r="40"
                            fill={pieColors[i % pieColors.length]}
                          />
                        );
                      }
                      return (
                        <path
                          key={i}
                          d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                          fill={pieColors[i % pieColors.length]}
                        />
                      );
                    });
                  })()}
                  <circle cx="50" cy="50" r="22" fill="#0D0E12" />
                </svg>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
                  {allocation.slice(0, 6).map((item, i) => (
                    <div
                      key={item.label}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 10,
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          background: pieColors[i % pieColors.length],
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ color: "#EBEBEB", flex: 1 }}>{item.label}</span>
                      <span className="font-mono" style={{ color: "#8C8C91" }}>
                        {item.pct.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Alerts section */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #2C2D34" }}>
              <div
                className="font-heading"
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: "#8C8C91",
                  letterSpacing: "0.1em",
                  marginBottom: 10,
                }}
              >
                ALERTS
              </div>
              {alerts.length === 0 && (
                <div style={{ fontSize: 10, color: "#8C8C91", marginBottom: 8 }}>
                  설정된 알림이 없습니다
                </div>
              )}
              {alerts.map((alert) => {
                const currentPrice = portfolioPrices.find(
                  (p) => p.symbol === alert.symbol
                )?.price;
                const triggered =
                  currentPrice !== undefined &&
                  ((alert.direction === "above" && currentPrice >= alert.targetPrice) ||
                    (alert.direction === "below" && currentPrice <= alert.targetPrice));
                return (
                  <div
                    key={alert.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 0",
                      borderBottom: "1px solid #1B1C22",
                      fontSize: 10,
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: triggered ? "#4ADE80" : "#8C8C91",
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ color: "#EBEBEB", flex: 1 }}>
                      {alert.label}
                    </span>
                    <span className="font-mono" style={{ color: "#8C8C91" }}>
                      {alert.direction === "above" ? ">" : "<"}{" "}
                      {formatNumber(alert.targetPrice, 2)}
                    </span>
                    <button
                      onClick={() => removeAlert(alert.id)}
                      style={{
                        fontSize: 9,
                        color: "#8C8C91",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      x
                    </button>
                  </div>
                );
              })}
              {/* Add alert form */}
              <div
                style={{
                  display: "flex",
                  gap: 4,
                  marginTop: 8,
                  alignItems: "center",
                }}
              >
                <select
                  value={newAlertSymbol}
                  onChange={(e) => setNewAlertSymbol(e.target.value)}
                  style={{
                    fontSize: 9,
                    padding: "3px 4px",
                    background: "#1B1C22",
                    border: "1px solid #2C2D34",
                    color: "#EBEBEB",
                    flex: 1,
                  }}
                >
                  <option value="">종목</option>
                  {portfolioAssets.map((a) => (
                    <option key={a.symbol} value={a.symbol}>
                      {a.label}
                    </option>
                  ))}
                </select>
                <select
                  value={newAlertDir}
                  onChange={(e) => setNewAlertDir(e.target.value as "above" | "below")}
                  style={{
                    fontSize: 9,
                    padding: "3px 4px",
                    background: "#1B1C22",
                    border: "1px solid #2C2D34",
                    color: "#EBEBEB",
                    width: 36,
                  }}
                >
                  <option value="above">&gt;</option>
                  <option value="below">&lt;</option>
                </select>
                <input
                  type="number"
                  value={newAlertPrice}
                  onChange={(e) => setNewAlertPrice(e.target.value)}
                  placeholder="가격"
                  style={{
                    fontSize: 9,
                    padding: "3px 4px",
                    background: "#1B1C22",
                    border: "1px solid #2C2D34",
                    color: "#EBEBEB",
                    width: 60,
                    fontFamily: "var(--font-mono)",
                  }}
                />
                <button
                  onClick={addAlert}
                  style={{
                    fontSize: 9,
                    padding: "3px 8px",
                    background: "rgba(201,169,110,0.1)",
                    border: "1px solid #C9A96E",
                    color: "#C9A96E",
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  +
                </button>
              </div>
            </div>

            {/* Notes section */}
            <div style={{ padding: "16px 20px" }}>
              <div
                className="font-heading"
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: "#8C8C91",
                  letterSpacing: "0.1em",
                  marginBottom: 10,
                }}
              >
                NOTES
              </div>
              {portfolioAssets.map((asset) => {
                const note = notes.find((n) => n.symbol === asset.symbol);
                return (
                  <div
                    key={asset.symbol}
                    style={{
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        color: "#EBEBEB",
                        fontWeight: 600,
                        marginBottom: 3,
                      }}
                    >
                      {asset.label}
                    </div>
                    <textarea
                      value={note?.text || ""}
                      onChange={(e) => updateNote(asset.symbol, e.target.value)}
                      placeholder="메모..."
                      rows={1}
                      style={{
                        width: "100%",
                        fontSize: 10,
                        padding: "4px 8px",
                        background: "#1B1C22",
                        border: "1px solid #2C2D34",
                        color: "#EBEBEB",
                        resize: "vertical",
                        fontFamily: "var(--font-body)",
                        outline: "none",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "#C9A96E";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "#2C2D34";
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
