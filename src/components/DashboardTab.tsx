"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import type { Article, Source } from "@/types";
import type { PortfolioPrice } from "@/hooks/usePortfolio";
import type { WatchlistStore } from "@/hooks/useWatchlist";
import { MiniSparkline } from "@/components/PriceChart";
import { EconomicCalendar } from "@/components/EconomicCalendar";
import { SentimentGauge } from "@/components/SentimentGauge";
import { GlobalMacroDashboard } from "@/components/GlobalMacroDashboard";
import { useSourceRanking } from "@/hooks/useSourceRanking";
import type { SourceRank } from "@/hooks/useSourceRanking";
import type { DashboardSections, DashboardLayout } from "@/hooks/useDashboardLayout";
// TAG_COLORS kept available for future use
// import { TAG_COLORS, TAG_FALLBACK_COLOR } from "@/lib/constants/colors";

function AnimatedNumber({ value, duration = 600 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);

  useEffect(() => {
    const start = prev.current;
    const diff = value - start;
    if (diff === 0) return;
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplay(Math.round(start + diff * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    prev.current = value;
  }, [value, duration]);

  return <>{display.toLocaleString()}</>;
}


interface MarketItem {
  symbol: string;
  label: string;
  price: number;
  change: number;
  changePct: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  fullName?: string;
}

const MARKET_FULL_NAMES: Record<string, string> = {
  "KOSPI": "Korea Composite Stock Price Index",
  "KOSDAQ": "Korea Securities Dealers Automated Quotations",
  "S&P500": "S&P 500 Index",
  "SPX": "S&P 500 Index",
  "NASDAQ": "NASDAQ Composite",
  "IXIC": "NASDAQ Composite",
  "DOW": "Dow Jones Industrial Average",
  "DJI": "Dow Jones Industrial Average",
  "NIKKEI": "Nikkei 225",
  "N225": "Nikkei 225",
  "USD/KRW": "US Dollar / Korean Won",
  "EUR/USD": "Euro / US Dollar",
  "WTI": "West Texas Intermediate Crude Oil",
  "GOLD": "Gold Spot",
  "BTC": "Bitcoin",
  "ETH": "Ethereum",
};

function MarketPopover({ item, visible }: { item: MarketItem; visible: boolean }) {
  if (!visible) return null;
  const fullName = item.fullName || MARKET_FULL_NAMES[item.symbol] || MARKET_FULL_NAMES[item.label] || item.label;
  const hasRange = item.high != null && item.low != null;
  return (
    <div
      style={{
        position: "absolute",
        top: "100%",
        left: "50%",
        transform: "translateX(-50%)",
        marginTop: 6,
        zIndex: 50,
        background: "#1A1A1F",
        border: "1px solid #2D2D32",
        borderRadius: 2,
        boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
        maxWidth: 200,
        minWidth: 160,
        padding: "10px 12px",
        pointerEvents: "none",
      }}
    >
      <div style={{ fontSize: 10, color: "#8C8C91", marginBottom: 6, lineHeight: 1.3 }}>
        {fullName}
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          fontFamily: "var(--font-mono)",
          color: "#EBEBEB",
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1.1,
          marginBottom: 4,
        }}
      >
        {formatPrice(item.price)}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: hasRange ? 8 : 4,
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            fontFamily: "var(--font-mono)",
            fontVariantNumeric: "tabular-nums",
            color: item.changePct >= 0 ? "#22c55e" : "#ef4444",
          }}
        >
          {item.changePct >= 0 ? "+" : ""}{item.change.toFixed(2)}
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            fontFamily: "var(--font-mono)",
            fontVariantNumeric: "tabular-nums",
            color: item.changePct >= 0 ? "#22c55e" : "#ef4444",
          }}
        >
          ({item.changePct >= 0 ? "+" : ""}{item.changePct.toFixed(2)}%)
        </span>
      </div>
      {hasRange ? (
        <div style={{ borderTop: "1px solid #2D2D32", paddingTop: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#8C8C91" }}>
            <span>저가</span>
            <span style={{ fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", color: "#EBEBEB" }}>
              {formatPrice(item.low!)}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#8C8C91", marginTop: 2 }}>
            <span>고가</span>
            <span style={{ fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", color: "#EBEBEB" }}>
              {formatPrice(item.high!)}
            </span>
          </div>
        </div>
      ) : item.open != null ? (
        <div style={{ borderTop: "1px solid #2D2D32", paddingTop: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#8C8C91" }}>
            <span>시가</span>
            <span style={{ fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", color: "#EBEBEB" }}>
              {formatPrice(item.open)}
            </span>
          </div>
          {item.close != null && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#8C8C91", marginTop: 2 }}>
              <span>종가</span>
              <span style={{ fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", color: "#EBEBEB" }}>
                {formatPrice(item.close)}
              </span>
            </div>
          )}
        </div>
      ) : null}
      <div style={{ marginTop: 6, fontSize: 9, color: "#C9A96E" }}>
        시장 탭에서 자세히 보기
      </div>
    </div>
  );
}

interface DashboardTabProps {
  articles: Article[];
  sources: Source[];
  portfolioPrices: PortfolioPrice[];
  portfolioLoading: boolean;
  watchlistStore: WatchlistStore;
  onSelectArticle: (article: Article) => void;
  onTabChange: (tab: string) => void;
  layoutSections?: DashboardSections;
  layouts?: DashboardLayout[];
  activeLayoutId?: string | null;
  onSaveLayout?: (name: string) => DashboardLayout;
  onLoadLayout?: (id: string) => void;
  onDeleteLayout?: (id: string) => void;
  onToggleSection?: (key: keyof DashboardSections) => void;
  readingGoal?: { dailyTarget: number; weeklyTarget: number };
  readingProgress?: { todayRead: number; weekRead: number; streak: number; lastReadDate: string };
  readingStreak?: number;
  onSetReadingGoal?: (goal: Partial<{ dailyTarget: number; weeklyTarget: number }>) => void;
}

const SECTION_LABELS: Record<keyof DashboardSections, string> = {
  marketStrip: "시장 스트립",
  topStories: "주요 뉴스",
  activityChart: "24H 활동",
  marketData: "시장 데이터",
  statistics: "통계",
  trending: "트렌딩",
  sentiment: "심리 지표",
  sourceQuality: "소스 품질",
  macroIndicators: "매크로 지표",
  calendar: "경제 캘린더",
};

function LayoutDropdown({
  layouts,
  activeLayoutId,
  onSaveLayout,
  onLoadLayout,
  onDeleteLayout,
  onToggleSection,
  sections,
}: {
  layouts: DashboardLayout[];
  activeLayoutId: string | null;
  onSaveLayout: (name: string) => void;
  onLoadLayout: (id: string) => void;
  onDeleteLayout: (id: string) => void;
  onToggleSection: (key: keyof DashboardSections) => void;
  sections: DashboardSections;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setEditing(false);
        setShowSaveInput(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          background: open ? "rgba(201,169,110,0.1)" : "transparent",
          border: open ? "1px solid #C9A96E" : "1px solid #2D2D32",
          color: open ? "#C9A96E" : "#8C8C91",
          fontSize: 10,
          fontWeight: 600,
          padding: "4px 10px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 4,
          letterSpacing: "0.04em",
        }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
          <rect x="1" y="1" width="4" height="4" rx="0.5" />
          <rect x="7" y="1" width="4" height="4" rx="0.5" />
          <rect x="1" y="7" width="4" height="4" rx="0.5" />
          <rect x="7" y="7" width="4" height="4" rx="0.5" />
        </svg>
        레이아웃
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "100%",
            marginTop: 4,
            background: "#1A1A1E",
            border: "1px solid #2D2D32",
            minWidth: 220,
            boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
            zIndex: 50,
          }}
        >
          {!editing ? (
            <>
              {/* Saved layouts */}
              {layouts.length > 0 && (
                <div style={{ padding: "6px 0", borderBottom: "1px solid #2D2D32" }}>
                  <div style={{ padding: "4px 12px", fontSize: 9, color: "#8C8C91", fontWeight: 700, letterSpacing: "0.06em" }}>
                    저장된 레이아웃
                  </div>
                  {layouts.map((layout) => (
                    <div
                      key={layout.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "6px 12px",
                        gap: 6,
                      }}
                    >
                      <button
                        onClick={() => { onLoadLayout(layout.id); setOpen(false); }}
                        style={{
                          flex: 1,
                          background: "none",
                          border: "none",
                          color: layout.id === activeLayoutId ? "#C9A96E" : "#EBEBEB",
                          fontSize: 11,
                          fontWeight: layout.id === activeLayoutId ? 700 : 400,
                          textAlign: "left",
                          cursor: "pointer",
                          padding: 0,
                        }}
                      >
                        {layout.name}
                        {layout.id === activeLayoutId && (
                          <span style={{ marginLeft: 6, fontSize: 9, color: "#C9A96E" }}>&#10003;</span>
                        )}
                      </button>
                      <button
                        onClick={() => onDeleteLayout(layout.id)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#8C8C91",
                          fontSize: 11,
                          cursor: "pointer",
                          padding: "0 2px",
                          lineHeight: 1,
                        }}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Save current */}
              {!showSaveInput ? (
                <button
                  onClick={() => setShowSaveInput(true)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "8px 12px",
                    background: "none",
                    border: "none",
                    color: "#EBEBEB",
                    fontSize: 11,
                    cursor: "pointer",
                    borderBottom: "1px solid #2D2D32",
                  }}
                  onMouseEnter={(e) => { (e.target as HTMLElement).style.background = "rgba(201,169,110,0.08)"; }}
                  onMouseLeave={(e) => { (e.target as HTMLElement).style.background = "transparent"; }}
                >
                  현재 레이아웃 저장
                  {layouts.length >= 5 && (
                    <span style={{ fontSize: 9, color: "#8C8C91", marginLeft: 6 }}>(최대 5개)</span>
                  )}
                </button>
              ) : (
                <div style={{ padding: "8px 12px", borderBottom: "1px solid #2D2D32", display: "flex", gap: 6 }}>
                  <input
                    autoFocus
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && saveName.trim()) {
                        onSaveLayout(saveName.trim());
                        setSaveName("");
                        setShowSaveInput(false);
                      }
                      if (e.key === "Escape") setShowSaveInput(false);
                    }}
                    placeholder="레이아웃 이름"
                    style={{
                      flex: 1,
                      background: "#0D0D0F",
                      border: "1px solid #2D2D32",
                      color: "#EBEBEB",
                      fontSize: 11,
                      padding: "3px 8px",
                      outline: "none",
                    }}
                  />
                  <button
                    onClick={() => {
                      if (saveName.trim()) {
                        onSaveLayout(saveName.trim());
                        setSaveName("");
                        setShowSaveInput(false);
                      }
                    }}
                    style={{
                      background: "#C9A96E",
                      border: "none",
                      color: "#0D0D0F",
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "3px 8px",
                      cursor: "pointer",
                    }}
                  >
                    저장
                  </button>
                </div>
              )}

              {/* Edit sections */}
              <button
                onClick={() => setEditing(true)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 12px",
                  background: "none",
                  border: "none",
                  color: "#EBEBEB",
                  fontSize: 11,
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => { (e.target as HTMLElement).style.background = "rgba(201,169,110,0.08)"; }}
                onMouseLeave={(e) => { (e.target as HTMLElement).style.background = "transparent"; }}
              >
                섹션 편집
              </button>
            </>
          ) : (
            <>
              <div style={{ padding: "8px 12px", borderBottom: "1px solid #2D2D32", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#EBEBEB", letterSpacing: "0.04em" }}>섹션 편집</span>
                <button
                  onClick={() => setEditing(false)}
                  style={{ background: "none", border: "none", color: "#8C8C91", fontSize: 10, cursor: "pointer", fontWeight: 600 }}
                >
                  완료
                </button>
              </div>
              {(Object.keys(SECTION_LABELS) as (keyof DashboardSections)[]).map((key) => (
                <label
                  key={key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 12px",
                    cursor: "pointer",
                    fontSize: 11,
                    color: sections[key] ? "#EBEBEB" : "#8C8C91",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={sections[key]}
                    onChange={() => onToggleSection(key)}
                    style={{
                      accentColor: "#C9A96E",
                      width: 13,
                      height: 13,
                    }}
                  />
                  {SECTION_LABELS[key]}
                </label>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금";
  if (mins < 60) return `${mins}분`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}시간`;
  const days = Math.floor(hrs / 24);
  return `${days}일`;
}

function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(2);
  return price.toFixed(4);
}

function ArticleVolumeChart({ articles }: { articles: Article[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const hourlyData = useMemo(() => {
    const now = Date.now();
    const currentHour = new Date().getHours();
    const counts = new Array(24).fill(0);
    const cutoff = now - 24 * 60 * 60 * 1000;
    for (const a of articles) {
      const t = new Date(a.publishedAt).getTime();
      if (t >= cutoff && t <= now) {
        const h = new Date(a.publishedAt).getHours();
        counts[h] += 1;
      }
    }
    return { counts, currentHour };
  }, [articles]);

  const maxCount = Math.max(...hourlyData.counts, 1);
  const svgHeight = 60;
  const barGap = 1;
  const w = containerWidth || 400;
  const barWidth = Math.max((w - barGap * 23) / 24, 2);

  return (
    <div ref={containerRef} style={{ width: "100%", marginBottom: 24 }}>
      <div className="dash-section-title">24H ACTIVITY</div>
      <svg
        width={w}
        height={svgHeight + 18}
        viewBox={`0 0 ${w} ${svgHeight + 18}`}
        style={{ display: "block" }}
      >
        <style>{`
          .vol-bar:hover { opacity: 1 !important; }
          .vol-bar:hover + .vol-tip { display: block; }
          .vol-tip { display: none; }
        `}</style>
        {hourlyData.counts.map((count, i) => {
          const barH = maxCount > 0 ? (count / maxCount) * svgHeight : 0;
          const isCurrent = i === hourlyData.currentHour;
          const x = i * (barWidth + barGap);
          const y = svgHeight - barH;
          return (
            <g key={i}>
              <rect
                className="vol-bar"
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barH, 1)}
                fill={isCurrent ? "#D4B878" : "#C9A96E"}
                opacity={isCurrent ? 1 : 0.7}
                rx={1}
              >
                <title>{`${String(i).padStart(2, "0")}:00 — ${count}건`}</title>
              </rect>
              {i % 6 === 0 && (
                <text
                  x={x + barWidth / 2}
                  y={svgHeight + 14}
                  textAnchor="middle"
                  fill="var(--muted)"
                  fontSize="9"
                  fontFamily="var(--font-mono)"
                >
                  {String(i).padStart(2, "0")}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}


function SourceQualityPanel({ rankings }: { rankings: SourceRank[] }) {
  const top5 = rankings.slice(0, 5);

  if (top5.length === 0) {
    return (
      <div>
        <div className="dash-section-title">SOURCE QUALITY</div>
        <div style={{ fontSize: 12, color: "var(--muted)" }}>소스 데이터 없음</div>
      </div>
    );
  }

  const FRESHNESS_LABELS: Record<string, { text: string; color: string }> = {
    active: { text: "ACTIVE", color: "#22c55e" },
    slow: { text: "SLOW", color: "#C9A96E" },
    stale: { text: "STALE", color: "#ef4444" },
  };

  return (
    <div>
      <div className="dash-section-title">SOURCE QUALITY</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {top5.map((rank, idx) => {
          const scoreColor =
            rank.qualityScore > 70 ? "#C9A96E" : rank.qualityScore >= 40 ? "#8C8C91" : "#ef4444";
          const freshness = FRESHNESS_LABELS[rank.freshness] || FRESHNESS_LABELS.stale;

          return (
            <div
              key={rank.sourceId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 0",
                borderBottom: idx < top5.length - 1 ? "1px solid var(--border-subtle)" : "none",
              }}
            >
              {/* Name */}
              <span
                className="type-small"
                style={{
                  fontWeight: 600,
                  color: "var(--foreground-bright)",
                  minWidth: 0,
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontSize: 12,
                }}
              >
                {rank.sourceName}
              </span>

              {/* Score bar */}
              <div
                style={{
                  width: 60,
                  height: 4,
                  background: "var(--border)",
                  flexShrink: 0,
                  position: "relative",
                }}
              >
                <div
                  style={{
                    width: `${rank.qualityScore}%`,
                    height: "100%",
                    background: scoreColor,
                    transition: "width 0.4s ease",
                  }}
                />
              </div>

              {/* Score number */}
              <span
                className="type-data-sm"
                style={{
                  color: scoreColor,
                  fontWeight: 700,
                  width: 24,
                  textAlign: "right",
                  flexShrink: 0,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {rank.qualityScore}
              </span>

              {/* Article count */}
              <span
                className="type-data-sm"
                style={{
                  color: "var(--muted)",
                  width: 28,
                  textAlign: "right",
                  flexShrink: 0,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {rank.articleCount}
              </span>

              {/* Freshness badge */}
              <span
                className="type-micro"
                style={{
                  padding: "2px 5px",
                  color: freshness.color,
                  background: `${freshness.color}15`,
                  fontWeight: 600,
                  flexShrink: 0,
                  fontSize: 9,
                  letterSpacing: "0.05em",
                }}
              >
                {freshness.text}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReadingProgressSection({
  goal,
  progress,
  streak,
  onSetGoal,
}: {
  goal: { dailyTarget: number; weeklyTarget: number };
  progress: { todayRead: number; weekRead: number };
  streak: number;
  onSetGoal: (g: Partial<{ dailyTarget: number; weeklyTarget: number }>) => void;
}) {
  const [editingGoals, setEditingGoals] = useState(false);

  const dailyPct = goal.dailyTarget > 0 ? Math.min((progress.todayRead / goal.dailyTarget) * 100, 100) : 0;
  const weeklyPct = goal.weeklyTarget > 0 ? Math.min((progress.weekRead / goal.weeklyTarget) * 100, 100) : 0;

  return (
    <>
      <div className="dash-section-title" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span>READING PROGRESS</span>
        <button
          onClick={() => setEditingGoals((v) => !v)}
          style={{
            background: "none",
            border: "none",
            color: "#8C8C91",
            fontSize: 9,
            cursor: "pointer",
            fontWeight: 600,
            padding: "0 2px",
          }}
        >
          {editingGoals ? "완료" : "목표 설정"}
        </button>
      </div>

      {editingGoals ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "#8C8C91", minWidth: 60 }}>일일 목표</span>
            <input
              type="number"
              min={1}
              max={100}
              value={goal.dailyTarget}
              onChange={(e) => onSetGoal({ dailyTarget: Math.max(1, parseInt(e.target.value) || 1) })}
              style={{
                width: 60,
                background: "#0D0D0F",
                border: "1px solid #2D2D32",
                color: "#EBEBEB",
                fontSize: 12,
                fontFamily: "var(--font-mono)",
                padding: "3px 8px",
                textAlign: "center",
                outline: "none",
              }}
            />
            <span style={{ fontSize: 10, color: "#8C8C91" }}>건/일</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "#8C8C91", minWidth: 60 }}>주간 목표</span>
            <input
              type="number"
              min={1}
              max={500}
              value={goal.weeklyTarget}
              onChange={(e) => onSetGoal({ weeklyTarget: Math.max(1, parseInt(e.target.value) || 1) })}
              style={{
                width: 60,
                background: "#0D0D0F",
                border: "1px solid #2D2D32",
                color: "#EBEBEB",
                fontSize: 12,
                fontFamily: "var(--font-mono)",
                padding: "3px 8px",
                textAlign: "center",
                outline: "none",
              }}
            />
            <span style={{ fontSize: 10, color: "#8C8C91" }}>건/주</span>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Daily progress */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: "#EBEBEB", fontWeight: 500 }}>오늘</span>
              <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", color: dailyPct >= 100 ? "#C9A96E" : "#EBEBEB", fontWeight: 700 }}>
                {progress.todayRead}/{goal.dailyTarget}
              </span>
            </div>
            <div style={{ width: "100%", height: 4, background: "#2D2D32", overflow: "hidden" }}>
              <div
                style={{
                  width: `${dailyPct}%`,
                  height: "100%",
                  background: "#C9A96E",
                  transition: "width 0.4s ease",
                }}
              />
            </div>
          </div>

          {/* Weekly progress */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: "#EBEBEB", fontWeight: 500 }}>이번 주</span>
              <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", color: weeklyPct >= 100 ? "#C9A96E" : "#EBEBEB", fontWeight: 700 }}>
                {progress.weekRead}/{goal.weeklyTarget}
              </span>
            </div>
            <div style={{ width: "100%", height: 4, background: "#2D2D32", overflow: "hidden" }}>
              <div
                style={{
                  width: `${weeklyPct}%`,
                  height: "100%",
                  background: "#C9A96E",
                  transition: "width 0.4s ease",
                }}
              />
            </div>
          </div>

          {/* Streak */}
          {streak > 0 && (
            <div style={{ marginTop: 2 }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#C9A96E",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {streak}일 연속 달성
              </span>
            </div>
          )}
        </div>
      )}
      <div className="dash-separator" />
    </>
  );
}

const DEFAULT_SECTIONS: DashboardSections = {
  marketStrip: true,
  topStories: true,
  activityChart: true,
  marketData: true,
  statistics: true,
  trending: true,
  sentiment: true,
  sourceQuality: true,
  macroIndicators: true,
  calendar: true,
};

export default function DashboardTab({
  articles,
  sources,
  portfolioPrices,
  portfolioLoading,
  watchlistStore,
  onSelectArticle,
  onTabChange,
  layoutSections,
  layouts = [],
  activeLayoutId = null,
  onSaveLayout,
  onLoadLayout,
  onDeleteLayout,
  onToggleSection,
  readingGoal,
  readingProgress,
  readingStreak = 0,
  onSetReadingGoal,
}: DashboardTabProps) {
  const sections = layoutSections || DEFAULT_SECTIONS;
  const [marketData, setMarketData] = useState<MarketItem[]>([]);
  const [marketLoading, setMarketLoading] = useState(true);
  const [hoveredMarketIdx, setHoveredMarketIdx] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { visibleRankings } = useSourceRanking(articles, sources);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setScrolled(el.scrollTop > 0);
  }, []);

  // Check if Korean market is currently open
  const isMarketOpen = useMemo(() => {
    const now = new Date();
    const kst = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
    const day = kst.getDay();
    const timeVal = kst.getHours() * 60 + kst.getMinutes();
    return day >= 1 && day <= 5 && timeVal >= 540 && timeVal < 930;
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchMarket() {
      setMarketLoading(true);
      try {
        const res = await fetch("/api/market");
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setMarketData(data);
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) setMarketLoading(false);
      }
    }
    fetchMarket();
    return () => { cancelled = true; };
  }, []);

  const todayStats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayArticles = articles.filter(
      (a) => new Date(a.publishedAt).getTime() >= todayStart
    );
    return {
      total: todayArticles.length,
      unread: articles.filter((a) => !a.isRead).length,
      saved: articles.filter((a) => a.isSaved).length,
      sourceCount: sources.filter((s) => s.enabled).length,
    };
  }, [articles, sources]);

  const trendingTags = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of articles) {
      for (const tag of a.tags) {
        counts[tag] = (counts[tag] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [articles]);

  const latestArticles = useMemo(() => {
    return [...articles]
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, 8);
  }, [articles]);

  const heroArticle = latestArticles[0];
  const secondaryArticles = latestArticles.slice(1, 7);

  return (
    <div className="overflow-y-auto" ref={scrollRef} onScroll={handleScroll} style={{ height: "100%" }}>
      {/* ── Layout Controls ── */}
      {onSaveLayout && onLoadLayout && onDeleteLayout && onToggleSection && (
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "8px 24px 0" }}>
          <LayoutDropdown
            layouts={layouts}
            activeLayoutId={activeLayoutId}
            onSaveLayout={onSaveLayout}
            onLoadLayout={onLoadLayout}
            onDeleteLayout={onDeleteLayout}
            onToggleSection={onToggleSection}
            sections={sections}
          />
        </div>
      )}

      {/* ── Market Overview — 4 large cards ── */}
      {sections.marketStrip && <div className="market-strip" style={{ transition: "box-shadow 0.2s ease", boxShadow: scrolled ? "0 1px 8px rgba(0,0,0,0.3)" : "none" }}>
        {marketLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{ background: "#131316", border: "1px solid #2D2D32", padding: 16 }}>
                <div className="skeleton" style={{ height: 10, width: 48, marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 28, width: 100, marginBottom: 6 }} />
                <div className="skeleton" style={{ height: 15, width: 70, marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 40, width: "100%" }} />
              </div>
            ))}
          </>
        ) : marketData.length > 0 ? (
          marketData.slice(0, 4).map((item) => {
            const startPrice = item.price / (1 + item.changePct / 100);
            const steps = 20;
            const diff = item.price - startPrice;
            const sparkData: number[] = [startPrice];
            for (let i = 1; i < steps; i++) {
              const progress = i / (steps - 1);
              const noise = (Math.sin(i * 2.7 + item.changePct) * 0.3 + Math.cos(i * 1.3) * 0.2) * Math.abs(diff) * 0.5;
              sparkData.push(startPrice + diff * progress + noise);
            }
            sparkData.push(item.price);
            const isUp = item.changePct >= 0;
            const borderColor = isUp ? "#22c55e" : "#ef4444";
            return (
              <div
                key={item.symbol}
                className="market-strip-item section-reveal"
                style={{
                  borderLeft: `3px solid ${borderColor}`,
                  position: "relative",
                }}
                onMouseEnter={() => setHoveredMarketIdx(marketData.indexOf(item))}
                onMouseLeave={() => setHoveredMarketIdx(null)}
              >
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.06em",
                  color: "#8C8C91",
                  fontFamily: "var(--font-heading)",
                }}>
                  {item.label}
                </span>
                <span style={{
                  fontSize: 28,
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  fontVariantNumeric: "tabular-nums" as const,
                  color: "#EBEBEB",
                  lineHeight: 1,
                  letterSpacing: "-0.02em",
                  display: "flex",
                  alignItems: "baseline",
                  gap: 6,
                }}>
                  {formatPrice(item.price)}
                  {!isMarketOpen && (
                    <span style={{ fontSize: 9, fontWeight: 500, color: "#8C8C91" }}>마감</span>
                  )}
                </span>
                <span style={{
                  fontSize: 15,
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  fontVariantNumeric: "tabular-nums" as const,
                  color: isUp ? "#22c55e" : "#ef4444",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}>
                  <span style={{ fontSize: 12 }}>{isUp ? "\u25B2" : "\u25BC"}</span>
                  {isUp ? "+" : ""}{item.change.toFixed(2)} ({Math.abs(item.changePct).toFixed(1)}%)
                </span>
                <div style={{ marginTop: 4 }}>
                  <MiniSparkline
                    data={sparkData}
                    width={120}
                    height={40}
                    change={item.changePct}
                  />
                </div>
                <MarketPopover item={item} visible={hoveredMarketIdx === marketData.indexOf(item)} />
              </div>
            );
          })
        ) : (
          <div style={{ gridColumn: "1 / -1", fontSize: 12, color: "#8C8C91" }}>
            시장 데이터 없음
          </div>
        )}
      </div>}

      {/* ── Empty State ── */}
      {articles.length === 0 && marketData.length === 0 && !marketLoading && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "80px 20px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "var(--foreground-bright)",
              marginBottom: 8,
              fontFamily: "var(--font-heading)",
            }}
          >
            데이터를 수집하세요
          </div>
          <div
            style={{
              fontSize: 13,
              color: "var(--muted)",
              maxWidth: 360,
              lineHeight: 1.6,
              marginBottom: 20,
            }}
          >
            새로고침 버튼을 눌러 최신 기사와 시장 데이터를 불러올 수 있습니다
          </div>
        </div>
      )}

      {/* ── Two-column layout ── */}
      <div className="dash-two-col">
        {/* ── Left Column: Top Stories + Activity ── */}
        <div className="dash-left-col">
          {sections.topStories && (<>
          <div className="dash-section-title">TOP STORIES</div>

          {/* Hero article — large, gold-accented */}
          {heroArticle ? (
            <button
              onClick={() => { onSelectArticle(heroArticle); onTabChange("news"); }}
              style={{
                display: "block",
                textAlign: "left",
                width: "100%",
                background: "#131316",
                border: "1px solid #2D2D32",
                borderLeft: "4px solid #C9A96E",
                padding: "20px 24px",
                cursor: "pointer",
                marginBottom: 24,
                transition: "box-shadow 0.2s ease",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 20px rgba(201,169,110,0.08)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
            >
              <h2 style={{
                margin: 0,
                lineHeight: 1.35,
                fontSize: 24,
                fontWeight: 700,
                fontFamily: "var(--font-heading)",
                color: "#EBEBEB",
                letterSpacing: "-0.01em",
              }}>
                {heroArticle.title}
              </h2>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 10,
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 600, color: "#C9A96E" }}>
                  {heroArticle.sourceName}
                </span>
                <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "#C9A96E", opacity: 0.7 }}>
                  {timeAgo(heroArticle.publishedAt)}
                </span>
              </div>
            </button>
          ) : (
            <div style={{ borderLeft: "4px solid #2D2D32", paddingLeft: 24, marginBottom: 24, background: "#131316", padding: "20px 24px", border: "1px solid #2D2D32" }}>
              <div className="skeleton" style={{ height: 24, width: "70%", marginBottom: 10 }} />
              <div className="skeleton" style={{ height: 14, width: "40%" }} />
            </div>
          )}

          {/* Secondary article rows — compact with gold dots */}
          {secondaryArticles.length > 0 && (
            <div>
              {secondaryArticles.map((article) => (
                <button
                  key={article.id}
                  onClick={() => { onSelectArticle(article); onTabChange("news"); }}
                  className="dash-row"
                  style={{
                    textAlign: "left",
                    background: "none",
                    border: "none",
                    borderBottom: "1px solid #1e1e22",
                    width: "100%",
                    padding: "10px 0",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  {!article.isRead ? (
                    <span
                      style={{
                        display: "inline-block",
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#C9A96E",
                        flexShrink: 0,
                        boxShadow: "0 0 6px rgba(201,169,110,0.4)",
                      }}
                    />
                  ) : (
                    <span style={{ width: 6, flexShrink: 0 }} />
                  )}
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: article.isRead ? 400 : 600,
                      color: "#EBEBEB",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    {article.title}
                  </span>
                  <span
                    style={{
                      flexShrink: 0,
                      whiteSpace: "nowrap",
                      fontSize: 10,
                      color: "#8C8C91",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {article.sourceName} {timeAgo(article.publishedAt)}
                  </span>
                </button>
              ))}
            </div>
          )}
          </>)}

          {/* Sentiment Gauge */}
          {sections.sentiment && (
          <div style={{ marginTop: 20 }}>
            <SentimentGauge articles={articles} />
          </div>
          )}

          {/* 24H Activity */}
          {sections.activityChart && (
          <div style={{ marginTop: 24 }}>
            <ArticleVolumeChart articles={articles} />
          </div>
          )}
        </div>

        {/* ── Right Column: Market Data + Stats + Trending ── */}
        <div className="dash-right-col">
          {/* Market Data */}
          {sections.marketData && (<>
          <div className="dash-section-title">MARKET DATA</div>
          {portfolioLoading ? (
            <div style={{ fontSize: 12, color: "var(--muted)" }}>로딩...</div>
          ) : portfolioPrices.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--muted)" }}>포트폴리오 비어있음</div>
          ) : (
            <div>
              {portfolioPrices.map((item) => (
                <div key={item.symbol} className="dash-price-row">
                  <span
                    className="type-small"
                    style={{ fontWeight: 600, color: "var(--foreground-bright)", minWidth: 80, flexShrink: 0 }}
                  >
                    {item.label}
                  </span>
                  <span style={{ flex: 1 }} />
                  <span className="type-data-md" style={{ color: "var(--foreground-bright)", fontWeight: 700, fontSize: 13 }}>
                    {formatPrice(item.price)}
                  </span>
                  <span
                    className="type-data-sm"
                    style={{
                      fontWeight: 600,
                      color: item.changePct >= 0 ? "#22c55e" : "#ef4444",
                      width: 60,
                      textAlign: "right",
                      flexShrink: 0,
                    }}
                  >
                    {item.changePct >= 0 ? "+" : ""}{item.changePct.toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="dash-separator" />
          </>)}

          {/* Statistics — 2x2 grid with large numbers & colored accents */}
          {sections.statistics && (<>
          <div className="dash-section-title">STATISTICS</div>
          <div className="dash-stat-grid">
            {[
              { label: "오늘 기사", value: todayStats.total },
              { label: "읽지 않음", value: todayStats.unread },
              { label: "저장됨", value: todayStats.saved },
              { label: "활성 소스", value: todayStats.sourceCount },
            ].map((stat) => (
              <div key={stat.label} className="dash-stat-cell">
                <span style={{
                  fontSize: 28,
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  fontVariantNumeric: "tabular-nums",
                  lineHeight: 1,
                  letterSpacing: "-0.02em",
                  color: "#EBEBEB",
                }}>
                  <AnimatedNumber value={stat.value} />
                </span>
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.06em",
                  color: "#8C8C91",
                  marginTop: 4,
                }}>
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
          <div className="dash-separator" />
          </>)}

          {/* Reading Progress */}
          {readingGoal && readingProgress && onSetReadingGoal && (
          <ReadingProgressSection
            goal={readingGoal}
            progress={readingProgress}
            streak={readingStreak}
            onSetGoal={onSetReadingGoal}
          />
          )}

          {/* Trending — colored tag badges */}
          {sections.trending && (<>
          <div className="dash-section-title">TRENDING</div>
          {trendingTags.length === 0 ? (
            <span style={{ fontSize: 12, color: "#8C8C91" }}>태그 데이터 없음</span>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {trendingTags.map(([tag, count]) => {
                const tagColors = ["#C9A96E", "#22c55e", "#3b82f6", "#ef4444", "#a855f7", "#06b6d4", "#f59e0b", "#ec4899", "#10b981", "#8b5cf6"];
                const colorIdx = Math.abs(tag.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % tagColors.length;
                const color = tagColors[colorIdx];
                return (
                  <button
                    key={tag}
                    onClick={() => onTabChange("news")}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "4px 10px",
                      fontSize: 10,
                      fontWeight: 600,
                      color,
                      background: `${color}15`,
                      border: `1px solid ${color}30`,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = `${color}25`; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = `${color}15`; }}
                  >
                    {tag}
                    <span style={{ fontSize: 9, opacity: 0.7, fontFamily: "var(--font-mono)" }}>{count}</span>
                  </button>
                );
              })}
            </div>
          )}
          </>)}

          {/* Source Quality */}
          {sections.sourceQuality && (<>
          <div className="dash-separator" />
          <SourceQualityPanel rankings={visibleRankings} />
          </>)}

          {/* Macro Indicators */}
          {sections.macroIndicators && (<>
          <div className="dash-separator" />
          <GlobalMacroDashboard />
          </>)}

          {/* Economic Calendar */}
          {sections.calendar && (
          <div style={{ marginTop: 20 }}>
            <EconomicCalendar />
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
