"use client";

import { useEffect, useMemo, useState } from "react";
import type { Quote } from "@/lib/market/quote";
import indicatorConfig from "../../config/macro_indicators.json";

/** Yields and risk gauges the shared quote layer can source for free. */
const LIVE_SYMBOLS = ["^TNX", "^FVX", "^VIX", "DX-Y.NYB"];

/** These quote a percentage, so the daily move reads best in basis points. */
const YIELD_SYMBOLS = new Set(["^TNX", "^FVX"]);

interface ReferenceIndicator {
  id: string;
  label: string;
  value: string;
  direction: "up" | "down" | "flat";
  source: string;
  asOf: string | null;
  staleAfterDays: number;
}

interface ReferenceGroup {
  region: string;
  label: string;
  indicators: ReferenceIndicator[];
}

const GROUPS = (indicatorConfig.groups ?? []) as unknown as ReferenceGroup[];

const DIRECTION_GLYPH: Record<string, string> = {
  up: "▲",
  down: "▼",
  flat: "─",
};

function daysSince(iso: string, now: number): number {
  return Math.floor((now - new Date(`${iso}T00:00:00+09:00`).getTime()) / 86_400_000);
}

function formatAsOf(iso: string): string {
  const [, month, day] = iso.split("-");
  return `${month}.${day} 기준`;
}

function ReferenceRow({ item, now }: { item: ReferenceIndicator; now: number }) {
  const age = item.asOf ? daysSince(item.asOf, now) : null;
  const unverified = item.asOf === null;
  const stale = age !== null && age > item.staleAfterDays;
  const needsCheck = unverified || stale;

  return (
    <div className={`macro-ref-row ${needsCheck ? "needs-check" : ""}`}>
      <span className="macro-ref-label">
        {item.label}
        <span className="macro-ref-source">{item.source}</span>
      </span>
      <span className="macro-ref-values">
        <span className="macro-ref-value">{item.value}</span>
        <span className={`macro-ref-dir dir-${item.direction}`} aria-hidden="true">
          {DIRECTION_GLYPH[item.direction]}
        </span>
      </span>
      <span
        className="macro-ref-asof"
        title={
          unverified
            ? "이 수치의 기준 발표일이 확인되지 않았습니다. config/macro_indicators.json에서 asOf를 채워주세요."
            : stale
              ? `마지막 확인 후 ${age}일 경과 — 새 발표를 반영해주세요.`
              : undefined
        }
      >
        {unverified ? "기준일 미확인" : stale ? `${formatAsOf(item.asOf!)} · 확인 필요` : formatAsOf(item.asOf!)}
      </span>
    </div>
  );
}

function LiveRow({ quote }: { quote: Quote }) {
  const isYield = YIELD_SYMBOLS.has(quote.symbol);
  const bp = Math.round(quote.change * 100);
  // Yahoo reports previousClose == price between sessions for some rate series;
  // that is a genuine flat print, so render it neutral instead of a green +0.
  const flat = isYield ? bp === 0 : Math.abs(quote.changePct) < 0.005;
  const up = quote.change > 0;
  const sign = flat ? "" : up ? "+" : "";

  const value = isYield ? `${quote.price.toFixed(2)}%` : quote.price.toFixed(2);
  const move = isYield
    ? `${sign}${bp}bp`
    : `${sign}${quote.changePct.toFixed(2)}%`;

  return (
    <div className="macro-live-row">
      <span className="macro-live-label">{quote.label}</span>
      <span className="macro-live-value">{value}</span>
      <span className={`macro-live-move ${flat ? "is-flat" : up ? "is-up" : "is-down"}`}>
        {move}
      </span>
    </div>
  );
}

export function GlobalMacroDashboard() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  // Resolved after mount so staleness never differs between server and client.
  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(
          `/api/portfolio?symbols=${encodeURIComponent(LIVE_SYMBOLS.join(","))}`
        );
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && Array.isArray(data)) setQuotes(data);
        }
      } catch {
        /* the panel degrades to reference-only */
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const id = setInterval(load, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const asOfLabel = useMemo(() => {
    const stamps = quotes.map((q) => q.asOf).filter((v): v is string => Boolean(v));
    if (stamps.length === 0) return null;
    const latest = stamps.sort().at(-1)!;
    return new Date(latest).toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Seoul",
    });
  }, [quotes]);

  return (
    <div className="macro-indicators">
      <div className="dash-section-title">MACRO INDICATORS</div>

      <div className="macro-live">
        <div className="macro-subhead">
          <span>시장 금리 · 리스크</span>
          {asOfLabel && <span className="macro-subhead-stamp">{asOfLabel} KST</span>}
        </div>
        {loading && quotes.length === 0 ? (
          <div className="macro-live-grid">
            {LIVE_SYMBOLS.map((s) => (
              <div key={s} className="skeleton macro-live-skeleton" />
            ))}
          </div>
        ) : quotes.length > 0 ? (
          <div className="macro-live-grid">
            {quotes.map((q) => (
              <LiveRow key={q.symbol} quote={q} />
            ))}
          </div>
        ) : (
          <p className="macro-live-empty">시세를 불러오지 못했습니다</p>
        )}
      </div>

      <div className="macro-ref-groups">
        {GROUPS.map((group) => (
          <div key={group.region}>
            <div className="macro-subhead">
              <span>{group.label}</span>
            </div>
            {group.indicators.map((item) => (
              <ReferenceRow key={item.id} item={item} now={now} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
