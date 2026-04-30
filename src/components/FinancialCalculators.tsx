"use client";

import { useState, useEffect, useMemo, useCallback } from "react";

type TabId = "return" | "compound" | "exchange";

const TABS: { id: TabId; label: string }[] = [
  { id: "return", label: "수익률" },
  { id: "compound", label: "복리" },
  { id: "exchange", label: "환율" },
];

const CURRENCIES = ["KRW", "USD", "EUR", "JPY", "CNY", "GBP"] as const;
type Currency = (typeof CURRENCIES)[number];

const CURRENCY_NAMES: Record<Currency, string> = {
  KRW: "Korean Won",
  USD: "US Dollar",
  EUR: "Euro",
  JPY: "Japanese Yen",
  CNY: "Chinese Yuan",
  GBP: "British Pound",
};

interface Rates {
  base: string;
  rates: Record<string, number>;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#1B1C22",
  border: "1px solid #2C2D34",
  color: "#EBEBEB",
  fontSize: 13,
  fontFamily: "var(--font-mono)",
  fontVariantNumeric: "tabular-nums",
  padding: "6px 8px",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  color: "#8C8C91",
  marginBottom: 3,
  display: "block",
};

const resultLabelStyle: React.CSSProperties = {
  fontSize: 10,
  color: "#8C8C91",
};

const resultValueStyle: React.CSSProperties = {
  fontSize: 14,
  fontFamily: "var(--font-mono)",
  fontVariantNumeric: "tabular-nums",
  fontWeight: 700,
};

function ReturnCalculator() {
  const [buyPrice, setBuyPrice] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [quantity, setQuantity] = useState("");

  const result = useMemo(() => {
    const buy = parseFloat(buyPrice);
    const sell = parseFloat(sellPrice);
    const qty = parseFloat(quantity) || 1;
    if (!buy || !sell || buy === 0) return null;

    const profit = (sell - buy) * qty;
    const returnPct = ((sell - buy) / buy) * 100;
    const plRatio = sell / buy;

    return { profit, returnPct, plRatio };
  }, [buyPrice, sellPrice, quantity]);

  const isProfit = result ? result.profit >= 0 : true;
  const valueColor = isProfit ? "#22c55e" : "#ef4444";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div>
        <label style={labelStyle}>매수가</label>
        <input
          type="number"
          value={buyPrice}
          onChange={(e) => setBuyPrice(e.target.value)}
          placeholder="0"
          style={inputStyle}
        />
      </div>
      <div>
        <label style={labelStyle}>매도가</label>
        <input
          type="number"
          value={sellPrice}
          onChange={(e) => setSellPrice(e.target.value)}
          placeholder="0"
          style={inputStyle}
        />
      </div>
      <div>
        <label style={labelStyle}>수량</label>
        <input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="1"
          style={inputStyle}
        />
      </div>

      {result && (
        <div
          style={{
            borderTop: "1px solid #2C2D34",
            paddingTop: 10,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={resultLabelStyle}>수익금</span>
            <span style={{ ...resultValueStyle, color: valueColor }}>
              {result.profit >= 0 ? "+" : ""}
              {result.profit.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={resultLabelStyle}>수익률</span>
            <span style={{ ...resultValueStyle, color: valueColor }}>
              {result.returnPct >= 0 ? "+" : ""}
              {result.returnPct.toFixed(2)}%
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={resultLabelStyle}>손익비</span>
            <span style={{ ...resultValueStyle, color: "#EBEBEB" }}>
              {result.plRatio.toFixed(4)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function CompoundCalculator() {
  const [principal, setPrincipal] = useState("");
  const [rate, setRate] = useState("");
  const [years, setYears] = useState("");
  const [frequency, setFrequency] = useState<"12" | "4" | "1">("12");

  const result = useMemo(() => {
    const p = parseFloat(principal);
    const r = parseFloat(rate);
    const t = parseFloat(years);
    const n = parseInt(frequency);
    if (!p || !r || !t || !n) return null;

    const finalAmount = p * Math.pow(1 + r / 100 / n, n * t);
    const totalInterest = finalAmount - p;
    const multiple = finalAmount / p;

    // Growth chart data points (one per year)
    const chartPoints: number[] = [];
    const steps = Math.min(Math.ceil(t), 30);
    for (let i = 0; i <= steps; i++) {
      const yearVal = (t / steps) * i;
      chartPoints.push(p * Math.pow(1 + r / 100 / n, n * yearVal));
    }

    return { finalAmount, totalInterest, multiple, chartPoints };
  }, [principal, rate, years, frequency]);

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: "pointer",
    appearance: "none" as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%238C8C91'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 8px center",
    paddingRight: 24,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div>
        <label style={labelStyle}>원금</label>
        <input
          type="number"
          value={principal}
          onChange={(e) => setPrincipal(e.target.value)}
          placeholder="10,000,000"
          style={inputStyle}
        />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>연이율 (%)</label>
          <input
            type="number"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            placeholder="5.0"
            style={inputStyle}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>기간 (년)</label>
          <input
            type="number"
            value={years}
            onChange={(e) => setYears(e.target.value)}
            placeholder="10"
            style={inputStyle}
          />
        </div>
      </div>
      <div>
        <label style={labelStyle}>복리 주기</label>
        <select
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as "12" | "4" | "1")}
          style={selectStyle}
        >
          <option value="12">월 복리</option>
          <option value="4">분기 복리</option>
          <option value="1">연 복리</option>
        </select>
      </div>

      {result && (
        <div
          style={{
            borderTop: "1px solid #2C2D34",
            paddingTop: 10,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {/* Growth chart */}
          <div style={{ marginBottom: 4 }}>
            <svg width="100%" height={80} viewBox={`0 0 ${result.chartPoints.length * 20} 80`} preserveAspectRatio="none">
              {(() => {
                const pts = result.chartPoints;
                const minV = pts[0];
                const maxV = pts[pts.length - 1];
                const range = maxV - minV || 1;
                const w = pts.length * 20;
                const pathD = pts
                  .map((v, i) => {
                    const x = (i / (pts.length - 1)) * w;
                    const y = 75 - ((v - minV) / range) * 65;
                    return `${i === 0 ? "M" : "L"}${x},${y}`;
                  })
                  .join(" ");
                const areaD = `${pathD} L${w},80 L0,80 Z`;
                return (
                  <>
                    <defs>
                      <linearGradient id="compound-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#C9A96E" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#C9A96E" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <path d={areaD} fill="url(#compound-grad)" />
                    <path d={pathD} fill="none" stroke="#C9A96E" strokeWidth={1.5} />
                  </>
                );
              })()}
            </svg>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={resultLabelStyle}>최종 금액</span>
            <span style={{ ...resultValueStyle, color: "#C9A96E" }}>
              {result.finalAmount.toLocaleString("ko-KR", { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={resultLabelStyle}>총 이자</span>
            <span style={{ ...resultValueStyle, color: "#22c55e" }}>
              +{result.totalInterest.toLocaleString("ko-KR", { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={resultLabelStyle}>원금 대비</span>
            <span style={{ ...resultValueStyle, color: "#EBEBEB" }}>
              {result.multiple.toFixed(2)}x
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function ExchangeCalculator() {
  const [fromCurrency, setFromCurrency] = useState<Currency>("USD");
  const [toCurrency, setToCurrency] = useState<Currency>("KRW");
  const [amount, setAmount] = useState("1");
  const [rates, setRates] = useState<Rates | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/exchange")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setRates(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const convert = useCallback(
    (amt: number, from: Currency, to: Currency): number | null => {
      if (!rates?.rates) return null;
      const fromRate = from === rates.base ? 1 : rates.rates[from];
      const toRate = to === rates.base ? 1 : rates.rates[to];
      if (!fromRate || !toRate) return null;
      return (amt / fromRate) * toRate;
    },
    [rates]
  );

  const result = useMemo(() => {
    const amt = parseFloat(amount);
    if (!amt || !rates) return null;
    return convert(amt, fromCurrency, toCurrency);
  }, [amount, fromCurrency, toCurrency, rates, convert]);

  const currentRate = useMemo(() => {
    if (!rates) return null;
    return convert(1, fromCurrency, toCurrency);
  }, [fromCurrency, toCurrency, rates, convert]);

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: "pointer",
    appearance: "none" as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%238C8C91'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 8px center",
    paddingRight: 24,
  };

  if (loading) {
    return (
      <div style={{ fontSize: 12, color: "#8C8C91", padding: "20px 0", textAlign: "center" }}>
        환율 데이터 로딩...
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>From</label>
          <select
            value={fromCurrency}
            onChange={(e) => setFromCurrency(e.target.value as Currency)}
            style={selectStyle}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            paddingBottom: 8,
            color: "#8C8C91",
            fontSize: 14,
            cursor: "pointer",
          }}
          onClick={() => {
            setFromCurrency(toCurrency);
            setToCurrency(fromCurrency);
          }}
        >
          &#8644;
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>To</label>
          <select
            value={toCurrency}
            onChange={(e) => setToCurrency(e.target.value as Currency)}
            style={selectStyle}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label style={labelStyle}>금액</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="1"
          style={inputStyle}
        />
      </div>

      {result !== null && (
        <div
          style={{
            borderTop: "1px solid #2C2D34",
            paddingTop: 10,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={resultLabelStyle}>변환 결과</span>
            <span style={{ ...resultValueStyle, color: "#C9A96E", fontSize: 16 }}>
              {result.toLocaleString("ko-KR", {
                maximumFractionDigits: toCurrency === "JPY" || toCurrency === "KRW" ? 0 : 2,
              })}{" "}
              <span style={{ fontSize: 10, color: "#8C8C91" }}>{toCurrency}</span>
            </span>
          </div>
          {currentRate !== null && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={resultLabelStyle}>현재 환율</span>
              <span style={{ ...resultValueStyle, fontSize: 11, color: "#8C8C91" }}>
                1 {fromCurrency} ={" "}
                {currentRate.toLocaleString("ko-KR", {
                  maximumFractionDigits: toCurrency === "JPY" || toCurrency === "KRW" ? 0 : 4,
                })}{" "}
                {toCurrency}
              </span>
            </div>
          )}
          <div style={{ fontSize: 9, color: "#8C8C91", marginTop: 2 }}>
            {CURRENCY_NAMES[fromCurrency]} → {CURRENCY_NAMES[toCurrency]}
          </div>
        </div>
      )}
    </div>
  );
}

interface FinancialCalculatorsProps {
  open: boolean;
  onClose: () => void;
}

export function FinancialCalculators({ open, onClose }: FinancialCalculatorsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("return");

  if (!open) return null;

  return (
    <div
      style={{
        width: 360,
        maxHeight: "80vh",
        overflowY: "auto",
        background: "#0D0E12",
        border: "1px solid #2C2D34",
        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          borderBottom: "1px solid #2C2D34",
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#C9A96E",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Financial Calculator
        </span>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "#8C8C91",
            fontSize: 14,
            cursor: "pointer",
            padding: "2px 4px",
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid #2C2D34",
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              background: "none",
              border: "none",
              borderBottom: activeTab === tab.id ? "2px solid #C9A96E" : "2px solid transparent",
              color: activeTab === tab.id ? "#C9A96E" : "#8C8C91",
              fontSize: 11,
              fontWeight: 600,
              padding: "8px 0",
              cursor: "pointer",
              transition: "color 0.15s ease, border-color 0.15s ease",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: 14 }}>
        {activeTab === "return" && <ReturnCalculator />}
        {activeTab === "compound" && <CompoundCalculator />}
        {activeTab === "exchange" && <ExchangeCalculator />}
      </div>
    </div>
  );
}
