"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import type { Article, Source } from "@/types";
import type { PortfolioPrice } from "@/hooks/usePortfolio";
import type { WatchlistStore } from "@/hooks/useWatchlist";
import { MiniSparkline } from "@/components/PriceChart";
import { EconomicCalendar } from "@/components/EconomicCalendar";
import { useSourceRanking } from "@/hooks/useSourceRanking";
import type { SourceRank } from "@/hooks/useSourceRanking";
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
          fontWeight: 800,
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

export default function DashboardTab({
  articles,
  sources,
  portfolioPrices,
  portfolioLoading,
  watchlistStore,
  onSelectArticle,
  onTabChange,
}: DashboardTabProps) {
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
      {/* ── Market Overview Strip ── */}
      <div className="market-strip" style={{ transition: "box-shadow 0.2s ease", boxShadow: scrolled ? "0 1px 8px rgba(0,0,0,0.3)" : "none" }}>
        {marketLoading ? (
          <div style={{ display: "flex", gap: 32 }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i}>
                <div className="skeleton" style={{ height: 10, width: 48, marginBottom: 6 }} />
                <div className="skeleton" style={{ height: 24, width: 80, marginBottom: 4 }} />
                <div className="skeleton" style={{ height: 12, width: 56 }} />
              </div>
            ))}
          </div>
        ) : marketData.length > 0 ? (
          marketData.map((item, idx) => {
            // Generate fake historical data from change% for sparkline visual
            const startPrice = item.price / (1 + item.changePct / 100);
            const steps = 16;
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
              <div key={item.symbol} style={{ display: "contents" }}>
                {idx > 0 && <div className="market-strip-divider" />}
                <div
                  className="market-strip-item"
                  style={{ position: "relative", borderLeft: `2px solid ${borderColor}`, paddingLeft: 12 }}
                  onMouseEnter={() => setHoveredMarketIdx(idx)}
                  onMouseLeave={() => setHoveredMarketIdx(null)}
                >
                  <span className="type-label">
                    {item.label}
                  </span>
                  <span className="type-data-lg" style={{ fontSize: 18, lineHeight: 1.1, display: "flex", alignItems: "center", gap: 6 }}>
                    {formatPrice(item.price)}
                    {!isMarketOpen && (
                      <span style={{ fontSize: 9, fontWeight: 500, color: "var(--muted)" }}>마감</span>
                    )}
                  </span>
                  <span
                    className="type-data-sm"
                    style={{ color: isUp ? "#22c55e" : "#ef4444", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}
                  >
                    <span style={{ display: "inline-block", transition: "transform 0.3s ease", transform: isUp ? "rotate(0deg)" : "rotate(180deg)", fontSize: 10 }}>▲</span>
                    {isUp ? "+" : ""}{item.change.toFixed(2)} ({Math.abs(item.changePct).toFixed(1)}%)
                  </span>
                  <MiniSparkline
                    data={sparkData}
                    width={80}
                    height={30}
                    change={item.changePct}
                  />
                  <MarketPopover item={item} visible={hoveredMarketIdx === idx} />
                </div>
              </div>
            );
          })
        ) : (
          <span style={{ fontSize: 12, color: "var(--muted)" }}>
            시장 데이터 없음
          </span>
        )}
      </div>

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
          <div className="dash-section-title">TOP STORIES</div>

          {/* Hero article */}
          {heroArticle ? (
            <button
              onClick={() => { onSelectArticle(heroArticle); onTabChange("news"); }}
              style={{
                display: "block",
                textAlign: "left",
                width: "100%",
                background: "none",
                border: "none",
                borderLeft: "4px solid #C9A96E",
                padding: "0 0 0 20px",
                cursor: "pointer",
                marginBottom: 20,
              }}
            >
              <h2 className="type-h1" style={{ margin: 0, lineHeight: 1.35 }}>
                {heroArticle.title}
              </h2>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 6,
                }}
              >
                <span className="type-small" style={{ color: "var(--muted-bright)", fontWeight: 500 }}>
                  {heroArticle.sourceName}
                </span>
                <span className="type-small type-data" style={{ color: "var(--muted)" }}>
                  {timeAgo(heroArticle.publishedAt)}
                </span>
              </div>
            </button>
          ) : (
            <div style={{ borderLeft: "4px solid var(--border-subtle)", paddingLeft: 20, marginBottom: 20 }}>
              <div className="skeleton" style={{ height: 20, width: "70%", marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 12, width: "40%" }} />
            </div>
          )}

          {/* Article rows */}
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
                    borderBottom: "1px solid var(--border-subtle)",
                    width: "100%",
                    padding: "8px 0",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "baseline",
                    gap: 8,
                  }}
                >
                  {!article.isRead && (
                    <span
                      style={{
                        display: "inline-block",
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: "var(--accent)",
                        flexShrink: 0,
                        position: "relative",
                        top: -1,
                      }}
                    />
                  )}
                  <span
                    className="type-body"
                    style={{
                      fontWeight: 500,
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
                    className="type-small type-data"
                    style={{ flexShrink: 0, whiteSpace: "nowrap" }}
                  >
                    {article.sourceName} {timeAgo(article.publishedAt)}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* 24H Activity */}
          <div style={{ marginTop: 24 }}>
            <ArticleVolumeChart articles={articles} />
          </div>
        </div>

        {/* ── Right Column: Market Data + Stats + Trending ── */}
        <div className="dash-right-col">
          {/* Market Data */}
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

          {/* Statistics */}
          <div className="dash-section-title">STATISTICS</div>
          <div className="dash-stat-grid">
            {[
              { label: "오늘 기사", value: todayStats.total },
              { label: "읽지 않음", value: todayStats.unread },
              { label: "저장됨", value: todayStats.saved },
              { label: "활성 소스", value: todayStats.sourceCount },
            ].map((stat) => (
              <div key={stat.label} className="dash-stat-cell">
                <span className="type-data-lg" style={{ color: "var(--accent)", fontWeight: 800, fontSize: 26, lineHeight: 1 }}>
                  <AnimatedNumber value={stat.value} />
                </span>
                <span className="type-micro">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>

          <div className="dash-separator" />

          {/* Trending */}
          <div className="dash-section-title">TRENDING</div>
          {trendingTags.length === 0 ? (
            <span style={{ fontSize: 12, color: "var(--muted)" }}>태그 데이터 없음</span>
          ) : (
            <div style={{ fontSize: 13, lineHeight: 1.8, color: "var(--foreground-bright)" }}>
              {trendingTags.map(([tag, count], i) => (
                <span key={tag}>
                  <button
                    onClick={() => onTabChange("news")}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--foreground-bright)",
                    }}
                  >
                    {tag}
                    <span className="type-data-sm" style={{ color: "var(--muted)", marginLeft: 3, fontSize: 10 }}>
                      {count}
                    </span>
                  </button>
                  {i < trendingTags.length - 1 && (
                    <span style={{ color: "var(--muted)", margin: "0 6px" }}>{" \u00B7 "}</span>
                  )}
                </span>
              ))}
            </div>
          )}

          {/* Source Quality */}
          <div className="dash-separator" />
          <SourceQualityPanel rankings={visibleRankings} />

          {/* Economic Calendar */}
          <div style={{ marginTop: 20 }}>
            <EconomicCalendar />
          </div>
        </div>
      </div>
    </div>
  );
}
