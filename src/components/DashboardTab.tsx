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

function WidgetHeader({
  icon,
  title,
  action,
}: {
  icon: string;
  title: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="section-label flex items-center gap-2 text-sm font-semibold tracking-wide uppercase">
        <span>{icon}</span>
        <span>{title}</span>
      </h3>
      {action && (
        <button
          className="text-xs opacity-60 hover:opacity-100 transition-opacity"
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
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
          gap: 16,
        }}
      >
        {/* 1. Market Overview — spans 2 columns */}
        <div className="widget-card" style={{ gridColumn: "span 2" }}>
          <WidgetHeader icon="📊" title="시장 현황" />
          {marketLoading ? (
            <div className="flex gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex-1">
                  <div className="skeleton w-16 h-3 mb-2 rounded" />
                  <div className="skeleton w-20 h-5 mb-1 rounded" />
                  <div className="skeleton w-12 h-3 rounded" />
                </div>
              ))}
            </div>
          ) : marketData.length === 0 ? (
            <p className="text-xs opacity-50">시장 데이터를 불러올 수 없습니다</p>
          ) : (
            <div className="flex flex-wrap gap-4">
              {marketData.map((item) => (
                <div
                  key={item.symbol}
                  className="flex-1 min-w-[120px] p-3 rounded"
                  style={{ background: "var(--bg-secondary, rgba(255,255,255,0.03))" }}
                >
                  <div className="text-xs opacity-60 mb-1">{item.label}</div>
                  <div className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                    {formatPrice(item.price)}
                  </div>
                  <div
                    className="text-xs font-medium"
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
              ))}
            </div>
          )}
        </div>

        {/* 2. Latest News */}
        <div className="widget-card">
          <WidgetHeader
            icon="📰"
            title="최신 뉴스"
            action={{ label: "더보기", onClick: () => onTabChange("news") }}
          />
          {latestArticles.length === 0 ? (
            <p className="text-xs opacity-50">기사가 없습니다</p>
          ) : (
            <div className="flex flex-col gap-2">
              {latestArticles.map((article) => (
                <button
                  key={article.id}
                  className="text-left w-full p-2 rounded hover:bg-white/5 transition-colors"
                  onClick={() => {
                    onSelectArticle(article);
                    onTabChange("news");
                  }}
                >
                  <div
                    className="text-sm font-medium mb-1 line-clamp-1"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {article.title}
                  </div>
                  <div className="flex items-center gap-2 text-xs opacity-50">
                    <span>{article.sourceName}</span>
                    <span>&#183;</span>
                    <span>{timeAgo(article.publishedAt)}</span>
                    {article.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="tag-pill"
                        style={{
                          background: `${TAG_COLORS[tag] || TAG_FALLBACK_COLOR}22`,
                          color: TAG_COLORS[tag] || TAG_FALLBACK_COLOR,
                          fontSize: 10,
                          padding: "1px 6px",
                          borderRadius: 3,
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 3. Portfolio */}
        <div className="widget-card">
          <WidgetHeader
            icon="💼"
            title="포트폴리오"
            action={{ label: "더보기", onClick: () => onTabChange("market") }}
          />
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
            <p className="text-xs opacity-50">포트폴리오가 비어 있습니다</p>
          ) : (
            <div className="flex flex-col gap-2">
              {portfolioPrices.map((item) => (
                <div
                  key={item.symbol}
                  className="flex items-center gap-3 p-2 rounded"
                  style={{ background: "var(--bg-secondary, rgba(255,255,255,0.03))" }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>
                      {item.label}
                    </div>
                    <div className="text-[10px] opacity-40">{item.symbol}</div>
                  </div>
                  <MiniSparkline data={item.sparkline} />
                  <div className="text-right">
                    <div className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                      {formatPrice(item.price)}
                    </div>
                    <div
                      className="text-xs"
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
                className="text-xs opacity-50 hover:opacity-80 mt-1 text-left transition-opacity"
                onClick={() => onTabChange("market")}
                style={{ color: "var(--accent)" }}
              >
                시장 탭에서 관리 &rarr;
              </button>
            </div>
          )}
        </div>

        {/* 4. Today Stats */}
        <div className="widget-card">
          <WidgetHeader icon="📈" title="오늘의 통계" />
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "오늘 기사", value: todayStats.total, unit: "건" },
              { label: "읽지 않음", value: todayStats.unread, unit: "건" },
              { label: "저장됨", value: todayStats.saved, unit: "건" },
              { label: "활성 소스", value: todayStats.sourceCount, unit: "개" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="p-3 rounded text-center"
                style={{ background: "var(--bg-secondary, rgba(255,255,255,0.03))" }}
              >
                <div className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
                  {stat.value}
                  <span className="text-xs opacity-40 ml-1">{stat.unit}</span>
                </div>
                <div className="text-[10px] opacity-50 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 5. Trending Tags */}
        <div className="widget-card">
          <WidgetHeader
            icon="🏷️"
            title="인기 태그"
            action={{ label: "더보기", onClick: () => onTabChange("news") }}
          />
          {trendingTags.length === 0 ? (
            <p className="text-xs opacity-50">태그 데이터가 없습니다</p>
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
                    borderRadius: 4,
                    fontSize: 12,
                  }}
                  onClick={() => onTabChange("news")}
                >
                  <span>{tag}</span>
                  <span className="opacity-60 text-[10px]">{count}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 6. Watchlist */}
        <div className="widget-card">
          <WidgetHeader
            icon="👁️"
            title="워치리스트 알림"
            action={{ label: "더보기", onClick: () => onTabChange("news") }}
          />
          {watchlistStore.items.length === 0 ? (
            <p className="text-xs opacity-50">워치리스트가 비어 있습니다</p>
          ) : (
            <div className="flex flex-col gap-2">
              {watchlistStore.items.map((item) => (
                <button
                  key={item.keyword}
                  className="flex items-center justify-between w-full p-2 rounded hover:bg-white/5 transition-colors text-left"
                  onClick={() => onTabChange("news")}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{
                        background: watchlistCounts[item.keyword] > 0
                          ? "var(--accent-green, #22c55e)"
                          : "var(--accent-red, #ef4444)",
                      }}
                    />
                    <span className="text-sm" style={{ color: "var(--text-primary)" }}>
                      {item.keyword}
                    </span>
                  </div>
                  <span className="text-xs opacity-50">
                    {watchlistCounts[item.keyword] || 0}건
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
