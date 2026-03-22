"use client";

import { useState, useEffect, useMemo } from "react";
import type { Article, Source } from "@/types";
import type { PortfolioPrice } from "@/hooks/usePortfolio";
import type { WatchlistStore } from "@/hooks/useWatchlist";
import { TAG_COLORS, TAG_FALLBACK_COLOR } from "@/lib/constants/colors";

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
  if (mins < 1) return "\uBC29\uAE08";
  if (mins < 60) return `${mins}\uBD84`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}\uC2DC\uAC04`;
  const days = Math.floor(hrs / 24);
  return `${days}\uC77C`;
}

function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(2);
  return price.toFixed(4);
}

function MiniSparkline({ data }: { data: number[] }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 60;
  const height = 20;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");
  const isUp = data[data.length - 1] >= data[0];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
      <polyline
        fill="none"
        stroke={isUp ? "var(--accent-green, #22c55e)" : "var(--accent-red, #ef4444)"}
        strokeWidth="1.5"
        points={points}
      />
    </svg>
  );
}

function formatDateKo(): string {
  const now = new Date();
  const days = ["\uC77C\uC694\uC77C", "\uC6D4\uC694\uC77C", "\uD654\uC694\uC77C", "\uC218\uC694\uC77C", "\uBAA9\uC694\uC77C", "\uAE08\uC694\uC77C", "\uD1A0\uC694\uC77C"];
  return `${now.getFullYear()}\uB144 ${now.getMonth() + 1}\uC6D4 ${now.getDate()}\uC77C ${days[now.getDay()]}`;
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

  const watchlistCounts = useMemo(() => {
    const result: Record<string, number> = {};
    for (const item of watchlistStore.items) {
      const kw = item.keyword.toLowerCase();
      result[item.keyword] = articles.filter(
        (a) =>
          a.title.toLowerCase().includes(kw) ||
          a.tags.some((t) => t.toLowerCase().includes(kw))
      ).length;
    }
    return result;
  }, [watchlistStore.items, articles]);

  const heroArticle = latestArticles[0];
  const secondaryArticles = latestArticles.slice(1, 7);

  return (
    <div
      className="overflow-y-auto"
      style={{
        maxWidth: 1400,
        margin: "0 auto",
        padding: "24px 20px",
        height: "100%",
      }}
    >
      {/* ── Top: Date + Status | Market Data ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 32,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "var(--foreground-bright)",
              letterSpacing: "-0.01em",
              lineHeight: 1.3,
            }}
          >
            {formatDateKo()}
          </div>
          <div
            style={{
              fontSize: 13,
              color: "var(--muted)",
              marginTop: 2,
            }}
          >
            {todayStats.total}\uAC74\uC758 \uAE30\uC0AC, {todayStats.sourceCount}\uAC1C \uC18C\uC2A4 \uD65C\uC131
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 0,
            fontSize: 13,
            flexWrap: "wrap",
          }}
        >
          {marketLoading ? (
            <span style={{ color: "var(--muted)", fontSize: 12 }}>
              \uC2DC\uC7A5 \uB370\uC774\uD130 \uB85C\uB529...
            </span>
          ) : (
            marketData.map((item, idx) => (
              <span key={item.symbol} style={{ display: "inline-flex", alignItems: "baseline", gap: 0 }}>
                <span style={{ color: "var(--muted-bright)", fontWeight: 500 }}>
                  {item.label}
                </span>
                <span
                  style={{
                    fontWeight: 700,
                    fontVariantNumeric: "tabular-nums",
                    color: "var(--foreground-bright)",
                    margin: "0 4px",
                  }}
                >
                  {formatPrice(item.price)}
                </span>
                <span
                  style={{
                    fontWeight: 600,
                    fontVariantNumeric: "tabular-nums",
                    color: item.changePct >= 0
                      ? "var(--accent-green, #22c55e)"
                      : "var(--accent-red, #ef4444)",
                  }}
                >
                  {item.changePct >= 0 ? "\u25B2" : "\u25BC"}{Math.abs(item.changePct).toFixed(1)}%
                </span>
                {idx < marketData.length - 1 && (
                  <span style={{ color: "var(--border-strong)", margin: "0 10px", fontWeight: 300 }}>|</span>
                )}
              </span>
            ))
          )}
        </div>
      </div>

      {/* ── Hero News ── */}
      {heroArticle && (
        <div style={{ marginBottom: 28 }}>
          <button
            onClick={() => { onSelectArticle(heroArticle); onTabChange("news"); }}
            style={{
              display: "block",
              textAlign: "left",
              width: "100%",
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
            }}
          >
            <h2
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "var(--foreground-bright)",
                lineHeight: 1.35,
                letterSpacing: "-0.01em",
                margin: 0,
              }}
            >
              {!heroArticle.isRead && (
                <span
                  style={{
                    display: "inline-block",
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "var(--accent)",
                    marginRight: 8,
                    verticalAlign: "middle",
                    position: "relative",
                    top: -2,
                  }}
                />
              )}
              {heroArticle.title}
            </h2>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 6,
                flexWrap: "wrap",
              }}
            >
              <span style={{ fontSize: 12, color: "var(--muted-bright)", fontWeight: 500 }}>
                {heroArticle.sourceName}
              </span>
              <span style={{ color: "var(--muted)", fontSize: 11 }}>{timeAgo(heroArticle.publishedAt)}</span>
              {heroArticle.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: 11,
                    padding: "1px 7px",
                    borderRadius: 3,
                    background: `${TAG_COLORS[tag] || TAG_FALLBACK_COLOR}15`,
                    color: TAG_COLORS[tag] || TAG_FALLBACK_COLOR,
                    fontWeight: 500,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </button>

          {/* Secondary articles: 2-column text rows */}
          {secondaryArticles.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0 24px",
                marginTop: 16,
                borderTop: "1px solid var(--border-subtle)",
                paddingTop: 12,
              }}
            >
              {secondaryArticles.map((article) => (
                <button
                  key={article.id}
                  onClick={() => { onSelectArticle(article); onTabChange("news"); }}
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 6,
                    textAlign: "left",
                    background: "none",
                    border: "none",
                    borderBottom: "1px solid var(--border-subtle)",
                    padding: "8px 0",
                    cursor: "pointer",
                    width: "100%",
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
                  <span style={{ fontSize: 11, color: "var(--muted)", flexShrink: 0 }}>
                    {article.sourceName}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--muted)", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
                    {timeAgo(article.publishedAt)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Bottom: Asymmetric 2-column ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "3fr 2fr",
          gap: 32,
          alignItems: "start",
        }}
      >
        {/* Left column: Stats + Tags */}
        <div>
          {/* Inline stats row */}
          <div
            style={{
              display: "flex",
              gap: 32,
              marginBottom: 24,
            }}
          >
            {[
              { label: "\uC624\uB298 \uAE30\uC0AC", value: todayStats.total, unit: "\uAC74" },
              { label: "\uC77D\uC9C0 \uC54A\uC74C", value: todayStats.unread, unit: "\uAC74" },
              { label: "\uC800\uC7A5\uB428", value: todayStats.saved, unit: "\uAC74" },
              { label: "\uD65C\uC131 \uC18C\uC2A4", value: todayStats.sourceCount, unit: "\uAC1C" },
            ].map((stat) => (
              <div key={stat.label}>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    color: "var(--foreground-bright)",
                    lineHeight: 1,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {stat.value}
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: "var(--muted)",
                      marginLeft: 2,
                    }}
                  >
                    {stat.unit}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--muted)",
                    marginTop: 4,
                    fontWeight: 500,
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Trending tags as a cloud */}
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: 10,
              }}
            >
              Trending
            </div>
            {trendingTags.length === 0 ? (
              <span style={{ fontSize: 12, color: "var(--muted)" }}>\uD0DC\uADF8 \uB370\uC774\uD130 \uC5C6\uC74C</span>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {trendingTags.map(([tag, count], i) => {
                  const size = i < 3 ? 14 : i < 6 ? 13 : 12;
                  const weight = i < 3 ? 600 : 500;
                  return (
                    <button
                      key={tag}
                      onClick={() => onTabChange("news")}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "3px 0",
                        display: "inline-flex",
                        alignItems: "baseline",
                        gap: 3,
                      }}
                    >
                      <span
                        style={{
                          fontSize: size,
                          fontWeight: weight,
                          color: TAG_COLORS[tag] || "var(--foreground-bright)",
                        }}
                      >
                        {tag}
                      </span>
                      <span style={{ fontSize: 10, color: "var(--muted)" }}>{count}</span>
                      {i < trendingTags.length - 1 && (
                        <span style={{ color: "var(--border)", margin: "0 4px" }}>/</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Portfolio + Watchlist */}
        <div>
          {/* Portfolio prices */}
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: 8,
              }}
            >
              Portfolio
            </div>
            {portfolioLoading ? (
              <div style={{ fontSize: 12, color: "var(--muted)" }}>\uB85C\uB529...</div>
            ) : portfolioPrices.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--muted)" }}>\uD3EC\uD2B8\uD3F4\uB9AC\uC624 \uBE44\uC5B4\uC788\uC74C</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {portfolioPrices.map((item, idx) => (
                  <div
                    key={item.symbol}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 0",
                      borderBottom: idx < portfolioPrices.length - 1 ? "1px solid var(--border-subtle)" : "none",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--foreground-bright)",
                        width: 56,
                        flexShrink: 0,
                      }}
                    >
                      {item.symbol}
                    </span>
                    <MiniSparkline data={item.sparkline} />
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "var(--foreground-bright)",
                        fontVariantNumeric: "tabular-nums",
                        marginLeft: "auto",
                      }}
                    >
                      {formatPrice(item.price)}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        fontVariantNumeric: "tabular-nums",
                        color: item.changePct >= 0
                          ? "var(--accent-green, #22c55e)"
                          : "var(--accent-red, #ef4444)",
                        width: 52,
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
          </div>

          {/* Watchlist keywords */}
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: 8,
              }}
            >
              Watchlist
            </div>
            {watchlistStore.items.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--muted)" }}>\uC6CC\uCE58\uB9AC\uC2A4\uD2B8 \uBE44\uC5B4\uC788\uC74C</div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 12px" }}>
                {watchlistStore.items.map((item) => {
                  const count = watchlistCounts[item.keyword] || 0;
                  return (
                    <button
                      key={item.keyword}
                      onClick={() => onTabChange("news")}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "4px 0",
                        display: "inline-flex",
                        alignItems: "baseline",
                        gap: 4,
                      }}
                    >
                      <span
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          background: count > 0 ? "var(--accent-green, #22c55e)" : "var(--muted)",
                          display: "inline-block",
                          flexShrink: 0,
                          position: "relative",
                          top: -1,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: "var(--foreground-bright)",
                        }}
                      >
                        {item.keyword}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: count > 0 ? "var(--accent)" : "var(--muted)",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
