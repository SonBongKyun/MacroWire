"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const CURRENCIES = ["KRW", "USD", "EUR", "JPY", "CNY", "GBP"] as const;
type Currency = (typeof CURRENCIES)[number];

const CURRENCY_LABELS: Record<Currency, string> = {
  KRW: "KRW",
  USD: "USD",
  EUR: "EUR",
  JPY: "JPY",
  CNY: "CNY",
  GBP: "GBP",
};

const CURRENCY_NAMES: Record<Currency, string> = {
  KRW: "Korean Won",
  USD: "US Dollar",
  EUR: "Euro",
  JPY: "Japanese Yen",
  CNY: "Chinese Yuan",
  GBP: "British Pound",
};

interface ConversionRecord {
  from: Currency;
  to: Currency;
  amount: number;
  result: number;
  ts: number;
}

interface Rates {
  base: string;
  rates: Record<string, number>;
}

interface CurrencyCalculatorProps {
  open: boolean;
  onClose: () => void;
}

export function CurrencyCalculator({ open, onClose }: CurrencyCalculatorProps) {
  const [fromCurrency, setFromCurrency] = useState<Currency>("USD");
  const [toCurrency, setToCurrency] = useState<Currency>("KRW");
  const [fromAmount, setFromAmount] = useState("1");
  const [toAmount, setToAmount] = useState("");
  const [activeInput, setActiveInput] = useState<"from" | "to">("from");
  const [rates, setRates] = useState<Rates | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<ConversionRecord[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  // Fetch rates
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    fetch("/api/exchange")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setRates(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [open]);

  // Convert when inputs change
  const convert = useCallback(
    (amount: string, from: Currency, to: Currency, direction: "from" | "to") => {
      if (!rates) return;
      const val = parseFloat(amount);
      if (isNaN(val) || val === 0) {
        if (direction === "from") setToAmount("");
        else setFromAmount("");
        return;
      }

      // Convert via USD base
      const fromRate = rates.rates[from] ?? 1;
      const toRate = rates.rates[to] ?? 1;
      // amount in FROM -> USD -> TO
      const usdAmount = from === "USD" ? val : val / fromRate;
      const result = to === "USD" ? usdAmount : usdAmount * toRate;

      if (direction === "from") {
        setToAmount(formatResult(result, to));
      } else {
        setFromAmount(formatResult(usdAmount / (1 / fromRate), from));
        // Recalculate: amount is in TO, convert back to FROM
        const toUsd = to === "USD" ? val : val / toRate;
        const fromResult = from === "USD" ? toUsd : toUsd * fromRate;
        setFromAmount(formatResult(fromResult, from));
      }
    },
    [rates]
  );

  // Recalculate on currency/rates change
  useEffect(() => {
    if (activeInput === "from") {
      convert(fromAmount, fromCurrency, toCurrency, "from");
    } else {
      convert(toAmount, toCurrency, fromCurrency, "to");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromCurrency, toCurrency, rates]);

  const handleFromChange = (val: string) => {
    setFromAmount(val);
    setActiveInput("from");
    convert(val, fromCurrency, toCurrency, "from");
  };

  const handleToChange = (val: string) => {
    setToAmount(val);
    setActiveInput("to");
    convert(val, toCurrency, fromCurrency, "to");
  };

  const handleSwap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
    setActiveInput("from");
  };

  const handleConvert = () => {
    if (!rates || !fromAmount) return;
    const val = parseFloat(fromAmount);
    const resultVal = parseFloat(toAmount.replace(/,/g, ""));
    if (isNaN(val) || isNaN(resultVal)) return;
    const record: ConversionRecord = {
      from: fromCurrency,
      to: toCurrency,
      amount: val,
      result: resultVal,
      ts: Date.now(),
    };
    setHistory((prev) => [record, ...prev].slice(0, 5));
  };

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const currentRate =
    rates && fromCurrency !== toCurrency
      ? (() => {
          const fromRate = rates.rates[fromCurrency] ?? 1;
          const toRate = rates.rates[toCurrency] ?? 1;
          const usd = fromCurrency === "USD" ? 1 : 1 / fromRate;
          return toCurrency === "USD" ? usd : usd * toRate;
        })()
      : null;

  return (
    <div
      ref={panelRef}
      className="glass-modal animate-fade-in"
      style={{
        width: 280,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "var(--foreground-bright)",
            fontFamily: "var(--font-heading)",
            letterSpacing: "0.04em",
          }}
        >
          CURRENCY
        </span>
        {currentRate != null && (
          <span
            style={{
              fontSize: 10,
              color: "var(--muted)",
              fontFamily: "var(--font-mono)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            1 {fromCurrency} = {formatResult(currentRate, toCurrency)} {toCurrency}
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
        {/* From */}
        <div>
          <div style={{ fontSize: 9, color: "var(--muted)", marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            From
          </div>
          <div
            style={{
              display: "flex",
              gap: 6,
              border: `1px solid ${activeInput === "from" ? "#FFB000" : "var(--border)"}`,
              borderRadius: 2,
              padding: "6px 8px",
              background: "var(--surface-active)",
              transition: "border-color 0.15s",
            }}
          >
            <select
              value={fromCurrency}
              onChange={(e) => setFromCurrency(e.target.value as Currency)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--foreground-bright)",
                fontSize: 12,
                fontWeight: 700,
                fontFamily: "var(--font-mono)",
                outline: "none",
                cursor: "pointer",
                width: 56,
              }}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c} style={{ background: "#1B1C22" }}>
                  {CURRENCY_LABELS[c]}
                </option>
              ))}
            </select>
            <input
              type="text"
              inputMode="decimal"
              value={fromAmount}
              onChange={(e) => handleFromChange(e.target.value)}
              onFocus={() => setActiveInput("from")}
              placeholder="0"
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                color: "var(--foreground-bright)",
                fontSize: 14,
                fontWeight: 700,
                fontFamily: "var(--font-mono)",
                fontVariantNumeric: "tabular-nums",
                textAlign: "right",
                outline: "none",
                minWidth: 0,
              }}
            />
          </div>
          <div style={{ fontSize: 9, color: "var(--muted)", marginTop: 2, paddingLeft: 2 }}>
            {CURRENCY_NAMES[fromCurrency]}
          </div>
        </div>

        {/* Swap button */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <button
            onClick={handleSwap}
            style={{
              width: 28,
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 2,
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--muted)",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#FFB000";
              e.currentTarget.style.borderColor = "#FFB000";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--muted)";
              e.currentTarget.style.borderColor = "var(--border)";
            }}
            title="Swap"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
        </div>

        {/* To */}
        <div>
          <div style={{ fontSize: 9, color: "var(--muted)", marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            To
          </div>
          <div
            style={{
              display: "flex",
              gap: 6,
              border: `1px solid ${activeInput === "to" ? "#FFB000" : "var(--border)"}`,
              borderRadius: 2,
              padding: "6px 8px",
              background: "var(--surface-active)",
              transition: "border-color 0.15s",
            }}
          >
            <select
              value={toCurrency}
              onChange={(e) => setToCurrency(e.target.value as Currency)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--foreground-bright)",
                fontSize: 12,
                fontWeight: 700,
                fontFamily: "var(--font-mono)",
                outline: "none",
                cursor: "pointer",
                width: 56,
              }}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c} style={{ background: "#1B1C22" }}>
                  {CURRENCY_LABELS[c]}
                </option>
              ))}
            </select>
            <input
              type="text"
              inputMode="decimal"
              value={toAmount}
              onChange={(e) => handleToChange(e.target.value)}
              onFocus={() => setActiveInput("to")}
              placeholder="0"
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                color: "var(--foreground-bright)",
                fontSize: 14,
                fontWeight: 700,
                fontFamily: "var(--font-mono)",
                fontVariantNumeric: "tabular-nums",
                textAlign: "right",
                outline: "none",
                minWidth: 0,
              }}
            />
          </div>
          <div style={{ fontSize: 9, color: "var(--muted)", marginTop: 2, paddingLeft: 2 }}>
            {CURRENCY_NAMES[toCurrency]}
          </div>
        </div>

        {/* Convert button */}
        <button
          onClick={handleConvert}
          disabled={loading || !fromAmount}
          style={{
            width: "100%",
            padding: "7px 0",
            fontSize: 11,
            fontWeight: 700,
            fontFamily: "var(--font-heading)",
            letterSpacing: "0.04em",
            background: loading ? "var(--surface)" : "#FFB000",
            color: loading ? "var(--muted)" : "#08090B",
            border: "none",
            borderRadius: 2,
            cursor: loading ? "wait" : "pointer",
            transition: "all 0.15s",
          }}
        >
          {loading ? "Loading..." : "CONVERT"}
        </button>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div
          style={{
            borderTop: "1px solid var(--border)",
            padding: "8px 14px 10px",
          }}
        >
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 6,
            }}
          >
            Recent
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {history.map((rec, i) => (
              <div
                key={`${rec.ts}-${i}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: 10,
                  color: "var(--foreground-secondary)",
                  fontFamily: "var(--font-mono)",
                  fontVariantNumeric: "tabular-nums",
                  padding: "3px 0",
                }}
              >
                <span>
                  {formatCompact(rec.amount)} {rec.from}
                </span>
                <span style={{ color: "var(--muted)", fontSize: 9 }}>&rarr;</span>
                <span style={{ color: "var(--foreground-bright)", fontWeight: 600 }}>
                  {formatCompact(rec.result)} {rec.to}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatResult(val: number, currency: Currency): string {
  if (currency === "KRW" || currency === "JPY") {
    return Math.round(val).toLocaleString("ko-KR");
  }
  if (val >= 1000) return val.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
  return val.toFixed(4);
}

function formatCompact(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
  if (val >= 1) return val.toFixed(2);
  return val.toFixed(4);
}
