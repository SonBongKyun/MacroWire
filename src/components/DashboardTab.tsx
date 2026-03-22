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

/* ── SVG Icon components for widget headers ── */
function IconMarket() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  );
}
function IconNews() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
    </svg>
  );
}
function IconPortfolio() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.193 23.193 0 0112 15c-3.183 0-6.22-.64-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m8 0H8m8 0a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2" />
    </svg>
  );
}
function IconStats() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}
function IconTag() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
    </svg>
  );
}
function IconWatch() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function WidgetHeader({
  icon,
  iconBg,
  title,
  action,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="widget-card-header">
      <div
        className="w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center text-white shrink-0"
        style={{ background: iconBg }}
      >
        {icon}
      </div>
      <h3>{title}</h3>
      {action && (
        <button
          className="text-[11px] font-semibold hover:underline transition-colors ml-auto shrink-0"
          onClick={action.onClick}
          style={{ color: "var(--accent)" }}
        >
          {action.label} &rarr;
        </button>
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
  // Market data
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

  // Today's stats
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

  // Trending tags
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

  // Latest 8 articles
  const latestArticles = useMemo(() => {
    return [...articles]
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, 8);
  }, [articles]);

  // Watchlist match counts
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

  const statItems = [
    { label: "\uC624\uB298 \uAE30\uC0AC", value: todayStats.total, unit: "\uAC74", color: "#2563eb" },
    { label: "\uC77D\uC9C0 \uC54A\uC74C", value: todayStats.unread, unit: "\uAC74", color: "#8b5cf6" },
    { label: "\uC800\uC7A5\uB428", value: todayStats.saved, unit: "\uAC74", color: "#f59e0b" },
    { label: "\uD65C\uC131 \uC18C\uC2A4", value: todayStats.sourceCount, unit: "\uAC1C", color: "#10b981" },
  ];

  return (
    <div
      className="overflow-y-auto"
      style={{
        maxWidth: 1400,
        margin: "0 auto",
        padding: 20,
        height: "100%",
      }}
    >
      {/* Row 1: Market Overview (span 2) + Latest News (span 1) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 16,
          marginBottom: 16,
        }}
      >
        {/* 1. Market Overview */}
        <div className="widget-card">
          <WidgetHeader
            icon={<IconMarket />}
            iconBg="var(--accent, #2563eb)"
            title="\uC2DC\uC7A5 \uD604\uD669"
            action={{ label: "\uB354\uBCF4\uAE30", onClick: () => onTabChange("markets") }}
          />
          <div className="widget-card-body">
            {marketLoading ? (
              <div className="grid grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-3 rounded-[var(--radius-md)] border border-[var(--border)]">
                    <div className="skeleton w-16 h-3 mb-2 rounded" />
                    <div className="skeleton w-20 h-6 mb-1 rounded" />
                    <div className="skeleton w-12 h-3 rounded" />
                  </div>
                ))}
              </div>
            ) : marketData.length === 0 ? (
              <p className="text-xs text-[var(--muted)]">\uC2DC\uC7A5 \uB370\uC774\uD130\uB97C \uBD88\uB7EC\uC62C \uC218 \uC5C6\uC2B5\uB2C8\uB2E4</p>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {marketData.map((item) => (
                  <div
                    key={item.symbol}
                    className="p-3 rounded-[var(--radius-md)] border border-[var(--border)] hover:border-[var(--border-strong)] transition-all"
                    style={{ background: "var(--surface-flat)" }}
                  >
                    <div className="text-[11px] font-medium text-[var(--muted)] mb-1.5 uppercase tracking-wide">
                      {item.label}
                    </div>
                    <div className="text-2xl font-extrabold text-[var(--foreground-bright)] leading-tight mb-1">
                      {formatPrice(item.price)}
                    </div>
                    <span
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold"
                      style={{
                        background: item.changePct >= 0
                          ? "rgba(34,197,94,0.12)"
                          : "rgba(239,68,68,0.12)",
                        color: item.changePct >= 0
                          ? "var(--accent-green, #22c55e)"
                          : "var(--accent-red, #ef4444)",
                      }}
                    >
                      {item.changePct >= 0 ? "\u25B2" : "\u25BC"} {item.changePct >= 0 ? "+" : ""}{item.changePct.toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 2. Latest News */}
        <div className="widget-card">
          <WidgetHeader
            icon={<IconNews />}
            iconBg="var(--gold, #f59e0b)"
            title="\uCD5C\uC2E0 \uB274\uC2A4"
            action={{ label: "\uB354\uBCF4\uAE30", onClick: () => onTabChange("news") }}
          />
          <div className="widget-card-body" style={{ padding: 0 }}>
            {latestArticles.length === 0 ? (
              <p className="text-xs text-[var(--muted)] p-4">\uAE30\uC0AC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4</p>
            ) : (
              <div className="flex flex-col">
                {latestArticles.map((article, idx) => (
                  <button
                    key={article.id}
                    className="text-left w-full px-4 py-2.5 hover:bg-[var(--surface-hover)] transition-colors flex items-start gap-2.5"
                    style={{
                      borderBottom: idx < latestArticles.length - 1 ? "1px solid var(--border-subtle)" : "none",
                    }}
                    onClick={() => {
                      onSelectArticle(article);
                      onTabChange("news");
                    }}
                  >
                    {!article.isRead && (
                      <span className="new-dot mt-1.5 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-[13px] font-medium line-clamp-1 text-[var(--foreground-bright)]"
                      >
                        {article.title}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-[var(--muted)]">{article.sourceName}</span>
                        <span className="text-[var(--muted)]">·</span>
                        <span className="text-[11px] text-[var(--muted)] tabular-nums">{timeAgo(article.publishedAt)}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: 3 equal widgets */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
          marginBottom: 16,
        }}
      >
        {/* 3. Portfolio */}
        <div className="widget-card">
          <WidgetHeader
            icon={<IconPortfolio />}
            iconBg="var(--success, #10b981)"
            title="\uD3EC\uD2B8\uD3F4\uB9AC\uC624"
            action={{ label: "\uB354\uBCF4\uAE30", onClick: () => onTabChange("markets") }}
          />
          <div className="widget-card-body">
            {portfolioLoading ? (
              <div className="flex flex-col gap-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="skeleton w-12 h-3 rounded" />
                    <div className="skeleton flex-1 h-3 rounded" />
                    <div className="skeleton w-16 h-3 rounded" />
                  </div>
                ))}
              </div>
            ) : portfolioPrices.length === 0 ? (
              <p className="text-xs text-[var(--muted)]">\uD3EC\uD2B8\uD3F4\uB9AC\uC624\uAC00 \uBE44\uC5B4 \uC788\uC2B5\uB2C8\uB2E4</p>
            ) : (
              <div className="flex flex-col gap-1">
                {portfolioPrices.map((item, idx) => (
                  <div
                    key={item.symbol}
                    className="flex items-center gap-3 py-2 px-1"
                    style={{
                      borderBottom: idx < portfolioPrices.length - 1 ? "1px solid var(--border-subtle)" : "none",
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold text-[var(--foreground-bright)] truncate">
                        {item.label}
                      </div>
                      <div className="text-[10px] text-[var(--muted)]">{item.symbol}</div>
                    </div>
                    <MiniSparkline data={item.sparkline} />
                    <div className="text-right">
                      <div className="text-[13px] font-bold text-[var(--foreground-bright)] tabular-nums">
                        {formatPrice(item.price)}
                      </div>
                      <div
                        className="text-[11px] font-medium tabular-nums"
                        style={{
                          color: item.changePct >= 0
                            ? "var(--accent-green, #22c55e)"
                            : "var(--accent-red, #ef4444)",
                        }}
                      >
                        {item.changePct >= 0 ? "+" : ""}
                        {item.changePct.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  className="text-[11px] font-semibold mt-2 transition-colors hover:underline"
                  onClick={() => onTabChange("markets")}
                  style={{ color: "var(--accent)" }}
                >
                  \uC2DC\uC7A5 \uD0ED\uC5D0\uC11C \uAD00\uB9AC &rarr;
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 4. Today Stats */}
        <div className="widget-card">
          <WidgetHeader
            icon={<IconStats />}
            iconBg="#8b5cf6"
            title="\uC624\uB298\uC758 \uD1B5\uACC4"
          />
          <div className="widget-card-body">
            <div className="grid grid-cols-2 gap-3">
              {statItems.map((stat) => (
                <div
                  key={stat.label}
                  className="stat-card p-3 rounded-[var(--radius-md)] border border-[var(--border)]"
                  style={{ background: "var(--surface-flat)" }}
                >
                  <div className="text-2xl font-extrabold text-[var(--foreground-bright)] leading-tight">
                    {stat.value}
                    <span className="text-[11px] font-medium text-[var(--muted)] ml-1">{stat.unit}</span>
                  </div>
                  <div className="text-[11px] font-medium text-[var(--muted)] mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 5. Trending Tags */}
        <div className="widget-card">
          <WidgetHeader
            icon={<IconTag />}
            iconBg="var(--gold, #f59e0b)"
            title="\uC778\uAE30 \uD0DC\uADF8"
            action={{ label: "\uB354\uBCF4\uAE30", onClick: () => onTabChange("news") }}
          />
          <div className="widget-card-body">
            {trendingTags.length === 0 ? (
              <p className="text-xs text-[var(--muted)]">\uD0DC\uADF8 \uB370\uC774\uD130\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {trendingTags.map(([tag, count]) => (
                  <button
                    key={tag}
                    className="tag-pill flex items-center gap-1.5 transition-transform hover:scale-105"
                    style={{
                      background: `${TAG_COLORS[tag] || TAG_FALLBACK_COLOR}22`,
                      color: TAG_COLORS[tag] || TAG_FALLBACK_COLOR,
                      border: `1px solid ${TAG_COLORS[tag] || TAG_FALLBACK_COLOR}33`,
                      padding: "4px 10px",
                      borderRadius: 99,
                      fontSize: 12,
                    }}
                    onClick={() => onTabChange("news")}
                  >
                    <span>{tag}</span>
                    <span
                      className="text-[10px] font-bold px-1 rounded-full"
                      style={{
                        background: `${TAG_COLORS[tag] || TAG_FALLBACK_COLOR}22`,
                      }}
                    >
                      {count}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Watchlist full width */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 16,
        }}
      >
        <div className="widget-card">
          <WidgetHeader
            icon={<IconWatch />}
            iconBg="var(--accent, #2563eb)"
            title="\uC6CC\uCE58\uB9AC\uC2A4\uD2B8 \uC54C\uB9BC"
            action={{ label: "\uB354\uBCF4\uAE30", onClick: () => onTabChange("news") }}
          />
          <div className="widget-card-body">
            {watchlistStore.items.length === 0 ? (
              <p className="text-xs text-[var(--muted)]">\uC6CC\uCE58\uB9AC\uC2A4\uD2B8\uAC00 \uBE44\uC5B4 \uC788\uC2B5\uB2C8\uB2E4</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {watchlistStore.items.map((item) => {
                  const count = watchlistCounts[item.keyword] || 0;
                  const hasMatches = count > 0;
                  return (
                    <button
                      key={item.keyword}
                      className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] hover:border-[var(--border-strong)] transition-all"
                      style={{ background: "var(--surface-flat)" }}
                      onClick={() => onTabChange("news")}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{
                          background: hasMatches
                            ? "var(--accent-green, #22c55e)"
                            : "var(--muted)",
                          boxShadow: hasMatches ? "0 0 6px rgba(34,197,94,0.4)" : "none",
                        }}
                      />
                      <span className="text-[13px] font-medium text-[var(--foreground-bright)]">
                        {item.keyword}
                      </span>
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums"
                        style={{
                          background: hasMatches ? "var(--accent-surface)" : "var(--surface-active)",
                          color: hasMatches ? "var(--accent)" : "var(--muted)",
                        }}
                      >
                        {count}\uAC74
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
