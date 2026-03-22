"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import type { Article, Source } from "@/types";
import type { PortfolioPrice } from "@/hooks/usePortfolio";
import type { WatchlistStore } from "@/hooks/useWatchlist";
// TAG_COLORS kept available for future use
// import { TAG_COLORS, TAG_FALLBACK_COLOR } from "@/lib/constants/colors";

const ECON_EVENTS = [
  { date: "2026-03-18", title: "FOMC 회의 시작", region: "미국", importance: "high" },
  { date: "2026-03-19", title: "FOMC 금리 결정", region: "미국", importance: "high" },
  { date: "2026-03-13", title: "한은 금통위", region: "한국", importance: "high" },
  { date: "2026-03-10", title: "미국 CPI 발표", region: "미국", importance: "high" },
  { date: "2026-03-07", title: "미국 고용보고서", region: "미국", importance: "high" },
  { date: "2026-03-04", title: "한국 CPI 발표", region: "한국", importance: "medium" },
  { date: "2026-03-05", title: "ECB 금리 결정", region: "유럽", importance: "high" },
  { date: "2026-03-12", title: "미국 PPI 발표", region: "미국", importance: "medium" },
  { date: "2026-03-20", title: "일본은행 금리 결정", region: "일본", importance: "high" },
  { date: "2026-03-25", title: "한국 소비자심리지수", region: "한국", importance: "medium" },
  { date: "2026-03-27", title: "미국 4Q GDP 최종", region: "미국", importance: "medium" },
  { date: "2026-03-28", title: "미국 PCE 물가", region: "미국", importance: "high" },
  { date: "2026-04-02", title: "FOMC 의사록 공개", region: "미국", importance: "medium" },
  { date: "2026-04-10", title: "미국 CPI 발표", region: "미국", importance: "high" },
  { date: "2026-04-16", title: "ECB 금리 결정", region: "유럽", importance: "high" },
];

const REGION_TAG_COLORS: Record<string, string> = {
  "미국": "#C9A96E",
  "한국": "#C9A96E",
  "유럽": "#8C8C91",
  "일본": "#8C8C91",
};

interface MarketItem {
  symbol: string;
  label: string;
  price: number;
  change: number;
  changePct: number;
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

function EconomicCalendar() {
  const upcomingEvents = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return ECON_EVENTS
      .filter((ev) => ev.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5);
  }, []);

  return (
    <div>
      <div className="dash-section-title">ECONOMIC CALENDAR</div>
      {upcomingEvents.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--muted)" }}>예정된 이벤트 없음</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {upcomingEvents.map((ev, idx) => (
            <div
              key={`${ev.date}-${ev.title}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 0",
                borderBottom: idx < upcomingEvents.length - 1 ? "1px solid var(--border-subtle)" : "none",
                borderLeft: ev.importance === "high" ? "4px solid #C9A96E" : "4px solid transparent",
                paddingLeft: 10,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                  color: "var(--muted)",
                  flexShrink: 0,
                  width: 52,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {ev.date.slice(5)}
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--foreground-bright)",
                  flex: 1,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {ev.title}
              </span>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  padding: "2px 6px",
                  borderRadius: 3,
                  color: REGION_TAG_COLORS[ev.region] || "#8C8C91",
                  background: `${REGION_TAG_COLORS[ev.region] || "#8C8C91"}15`,
                  flexShrink: 0,
                }}
              >
                {ev.region}
              </span>
            </div>
          ))}
        </div>
      )}
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
    <div className="overflow-y-auto" style={{ height: "100%" }}>
      {/* ── Market Overview Strip ── */}
      <div className="market-strip">
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
          marketData.map((item, idx) => (
            <div key={item.symbol} style={{ display: "contents" }}>
              {idx > 0 && <div className="market-strip-divider" />}
              <div className="market-strip-item">
                <span
                  style={{
                    fontSize: 10,
                    fontFamily: "var(--font-mono)",
                    color: "var(--muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    fontWeight: 500,
                  }}
                >
                  {item.label}
                </span>
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    fontFamily: "var(--font-mono)",
                    color: "var(--foreground-bright)",
                    fontVariantNumeric: "tabular-nums",
                    lineHeight: 1.1,
                  }}
                >
                  {formatPrice(item.price)}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: "var(--font-mono)",
                    fontVariantNumeric: "tabular-nums",
                    color: item.changePct >= 0 ? "#22c55e" : "#ef4444",
                  }}
                >
                  {item.changePct >= 0 ? "\u25B2" : "\u25BC"} {Math.abs(item.changePct).toFixed(1)}%
                </span>
              </div>
            </div>
          ))
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
              <h2
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: "var(--foreground-bright)",
                  lineHeight: 1.35,
                  letterSpacing: "-0.01em",
                  margin: 0,
                  fontFamily: "var(--font-heading)",
                }}
              >
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
                <span style={{ fontSize: 12, color: "var(--muted-bright)", fontWeight: 500 }}>
                  {heroArticle.sourceName}
                </span>
                <span style={{ color: "var(--muted)", fontSize: 11, fontFamily: "var(--font-mono)" }}>
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
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--foreground-bright)",
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
                      fontSize: 11,
                      color: "var(--muted)",
                      flexShrink: 0,
                      fontFamily: "var(--font-mono)",
                      fontVariantNumeric: "tabular-nums",
                      whiteSpace: "nowrap",
                    }}
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
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--foreground-bright)",
                      minWidth: 80,
                      flexShrink: 0,
                    }}
                  >
                    {item.label}
                  </span>
                  <span style={{ flex: 1 }} />
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "var(--foreground-bright)",
                      fontVariantNumeric: "tabular-nums",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {formatPrice(item.price)}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      fontVariantNumeric: "tabular-nums",
                      fontFamily: "var(--font-mono)",
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
                <span
                  style={{
                    fontSize: 26,
                    fontWeight: 800,
                    color: "var(--accent)",
                    fontFamily: "var(--font-mono)",
                    fontVariantNumeric: "tabular-nums",
                    lineHeight: 1,
                  }}
                >
                  {stat.value}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: "var(--muted)",
                    fontWeight: 500,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
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
                    <span
                      style={{
                        fontSize: 10,
                        color: "var(--muted)",
                        marginLeft: 3,
                        fontFamily: "var(--font-mono)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
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

          {/* Economic Calendar */}
          <div style={{ marginTop: 20 }}>
            <EconomicCalendar />
          </div>
        </div>
      </div>
    </div>
  );
}
