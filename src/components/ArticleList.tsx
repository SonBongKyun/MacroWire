"use client";

import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import type { Article } from "@/types";
import { clusterArticles } from "@/lib/clustering/cluster";
import type { ArticleCluster } from "@/lib/clustering/cluster";

type ReadFilter = "all" | "unread" | "read";

interface ArticleListProps {
  articles: Article[];
  loading: boolean;
  selectedArticleId: string | null;
  onSelectArticle: (article: Article) => void;
  onToggleSave: (article: Article) => void;
  hasMore: boolean;
  onLoadMore: () => void;
  readFilter: ReadFilter;
  onReadFilterChange: (f: ReadFilter) => void;
  onTagClick?: (tag: string) => void;
  newArticleIds?: string[];
}

const TAG_COLORS: Record<string, string> = {
  금리: "#92400e",
  물가: "#991b1b",
  연준: "#5b21b6",
  환율: "#155e75",
  미국: "#1e40af",
  중국: "#b91c1c",
  일본: "#9d174d",
  유럽: "#3730a3",
  수출입: "#065f46",
  경기: "#3f6212",
  부동산: "#9a3412",
  가계부채: "#be123c",
  재정: "#075985",
  에너지: "#854d0e",
  반도체: "#115e59",
  AI: "#166534",
  지정학: "#86198f",
};

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

function SkeletonRow() {
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        <div className="skeleton w-8 h-3.5 rounded-full" />
        <div className="skeleton w-24 h-3.5 rounded-full" />
      </div>
      <div className="skeleton w-full h-4 mb-1.5 rounded" />
      <div className="skeleton w-2/3 h-4 rounded" />
    </div>
  );
}

export function ArticleList({
  articles,
  loading,
  selectedArticleId,
  onSelectArticle,
  onToggleSave,
  hasMore,
  onLoadMore,
  readFilter,
  onReadFilterChange,
  onTagClick,
  newArticleIds = [],
}: ArticleListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Apply read filter client-side
  const filteredArticles =
    readFilter === "all"
      ? articles
      : readFilter === "unread"
        ? articles.filter((a) => !a.isRead)
        : articles.filter((a) => a.isRead);

  // Clustering
  const { clusters, singles } = useMemo(
    () => clusterArticles(filteredArticles),
    [filteredArticles]
  );

  type TimelineEntry =
    | { type: "article"; article: Article; time: number }
    | { type: "cluster"; cluster: ArticleCluster; time: number };

  const timeline: TimelineEntry[] = useMemo(() => {
    const entries: TimelineEntry[] = [
      ...clusters.map((c) => ({
        type: "cluster" as const,
        cluster: c,
        time: new Date(c.articles[0].publishedAt).getTime(),
      })),
      ...singles.map((a) => ({
        type: "article" as const,
        article: a,
        time: new Date(a.publishedAt).getTime(),
      })),
    ];
    return entries.sort((a, b) => b.time - a.time);
  }, [clusters, singles]);

  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set());
  const toggleCluster = useCallback((clusterId: string) => {
    setExpandedClusters((prev) => {
      const next = new Set(prev);
      if (next.has(clusterId)) next.delete(clusterId);
      else next.add(clusterId);
      return next;
    });
  }, []);

  const newIds = useMemo(() => new Set(newArticleIds), [newArticleIds]);

  // Auto-expand cluster when selected article is inside it
  useEffect(() => {
    if (!selectedArticleId) return;
    for (const c of clusters) {
      if (c.articles.some((a) => a.id === selectedArticleId)) {
        setExpandedClusters((prev) => {
          if (prev.has(c.id)) return prev;
          const next = new Set(prev);
          next.add(c.id);
          return next;
        });
        break;
      }
    }
  }, [selectedArticleId, clusters]);

  useEffect(() => {
    if (!hasMore || loading) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) onLoadMore();
      },
      { root: listRef.current, rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, onLoadMore]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!filteredArticles.length) return;
      const idx = filteredArticles.findIndex((a) => a.id === selectedArticleId);
      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        const next = Math.min(idx + 1, filteredArticles.length - 1);
        onSelectArticle(filteredArticles[next]);
      } else if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        const prev = Math.max(idx - 1, 0);
        onSelectArticle(filteredArticles[prev]);
      } else if (e.key === "s" && idx >= 0) {
        e.preventDefault();
        onToggleSave(filteredArticles[idx]);
      }
    },
    [filteredArticles, selectedArticleId, onSelectArticle, onToggleSave]
  );

  return (
    <div
      className="flex-1 flex flex-col overflow-hidden focus:outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Header */}
      <div className="px-4 py-2 border-b border-[var(--border)] metal-header flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <h2 className="text-[13px] font-semibold text-[var(--foreground-secondary)]">
            피드
          </h2>
          {/* Read filter tabs */}
          <div className="flex border border-[var(--border)] rounded-[var(--radius-sm)] p-0.5 metal-surface">
            {([
              { key: "all" as ReadFilter, label: "전체" },
              { key: "unread" as ReadFilter, label: "안읽음" },
              { key: "read" as ReadFilter, label: "읽음" },
            ]).map((f) => (
              <button
                key={f.key}
                onClick={() => onReadFilterChange(f.key)}
                className={`px-2 py-0.5 text-[12px] font-semibold rounded-[3px] transition-colors ${
                  readFilter === f.key
                    ? "bg-[var(--foreground-bright)] text-white shadow-sm"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <span className="text-[12px] tabular-nums text-[var(--muted)] font-medium">
            {filteredArticles.length}건
          </span>
        </div>
        {loading && (
          <div className="flex items-center gap-1.5 text-[12px] text-[var(--accent)] font-medium">
            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            로딩 중
          </div>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto bg-[var(--background)]" ref={listRef}>
        {loading && articles.length === 0 && (
          <div className="divide-y divide-[var(--border-subtle)]">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        )}

        {!loading && filteredArticles.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-[var(--muted)] gap-3">
            <div className="w-14 h-14 rounded-2xl bg-[var(--surface-flat)] flex items-center justify-center">
              <svg className="w-7 h-7 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            </div>
            <p className="text-[13px]">
              {readFilter === "unread" ? "안읽은 기사가 없습니다" : readFilter === "read" ? "읽은 기사가 없습니다" : "기사가 없습니다"}
            </p>
          </div>
        )}

        {/* Timeline: clusters + singles */}
        {timeline.map((entry) => {
          if (entry.type === "cluster") {
            const { cluster } = entry;
            const isExpanded = expandedClusters.has(cluster.id);
            const topColor = TAG_COLORS[cluster.tag] || "var(--accent)";
            return (
              <div key={cluster.id}>
                {/* Cluster header */}
                <div
                  onClick={() => toggleCluster(cluster.id)}
                  className="article-row px-4 py-[6px] cursor-pointer border-b border-[var(--border-subtle)] bg-[var(--accent-surface)] hover:bg-[var(--surface-hover)] border-l-[3px]"
                  style={{ borderLeftColor: topColor }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[11px] text-[var(--muted)] transition-transform duration-150 inline-block"
                      style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}
                    >
                      ▶
                    </span>
                    <span className="text-[13px] font-bold" style={{ color: topColor }}>
                      {cluster.label}
                    </span>
                    <span
                      className="text-[11px] font-bold px-1.5 py-0.5 rounded-full tabular-nums text-white leading-none"
                      style={{ backgroundColor: topColor }}
                    >
                      {cluster.articles.length}
                    </span>
                    <div className="flex-1" />
                    <span className="text-[11px] text-[var(--muted)] font-medium">
                      {cluster.tag}
                    </span>
                  </div>
                </div>
                {/* Expanded cluster articles */}
                {isExpanded &&
                  cluster.articles.map((article) => {
                    const isSelected = selectedArticleId === article.id;
                    const isNew = newIds.has(article.id);
                    return (
                      <div
                        key={article.id}
                        onClick={() => onSelectArticle(article)}
                        className={`article-row pl-8 pr-4 py-[5px] cursor-pointer border-b border-[var(--border-subtle)] ${
                          isSelected
                            ? "bg-[var(--surface-flat)] border-l-[3px] border-l-[var(--accent)] shadow-card"
                            : "border-l-[3px] border-l-transparent hover:bg-[var(--surface-hover)]"
                        } ${article.isRead && !isSelected ? "opacity-55" : ""}`}
                      >
                        <div className="flex items-center gap-2">
                          {isNew && <span className="new-dot" />}
                          <span className="text-[12px] text-[var(--border-strong)] shrink-0 tabular-nums">
                            {timeAgo(article.publishedAt)}
                          </span>
                          <span className="text-[12px] text-[var(--accent)] truncate font-semibold">
                            {article.sourceName}
                          </span>
                          <div className="flex-1" />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleSave(article);
                            }}
                            className={`ml-0.5 text-xs shrink-0 transition-colors leading-none ${
                              article.isSaved
                                ? "text-[var(--accent)]"
                                : "text-[var(--border-strong)] hover:text-[var(--accent)]"
                            }`}
                            title={article.isSaved ? "저장 해제" : "저장"}
                          >
                            {article.isSaved ? "★" : "☆"}
                          </button>
                        </div>
                        <p
                          className={`text-[13px] leading-[1.4] line-clamp-1 ${
                            isSelected ? "text-[var(--foreground-bright)] font-medium" : "text-[var(--foreground)]"
                          }`}
                        >
                          {article.title}
                        </p>
                      </div>
                    );
                  })}
              </div>
            );
          }

          // Single article
          const { article } = entry;
          const isSelected = selectedArticleId === article.id;
          const isNew = newIds.has(article.id);
          return (
            <div
              key={article.id}
              onClick={() => onSelectArticle(article)}
              className={`article-row px-4 py-[5px] cursor-pointer border-b border-[var(--border-subtle)] ${
                isSelected
                  ? "bg-[var(--surface-flat)] border-l-[3px] border-l-[var(--accent)] shadow-card"
                  : "border-l-[3px] border-l-transparent hover:bg-[var(--surface-hover)]"
              } ${article.isRead && !isSelected ? "opacity-55" : ""}`}
            >
              <div className="flex items-center gap-2">
                {isNew && <span className="new-dot" />}
                <span className="text-[12px] text-[var(--border-strong)] shrink-0 tabular-nums">
                  {timeAgo(article.publishedAt)}
                </span>
                <span className="text-[12px] text-[var(--accent)] truncate font-semibold">
                  {article.sourceName}
                </span>
                <div className="flex-1" />
                {article.tags.length > 0 && (
                  <div className="flex gap-1.5 shrink-0">
                    {article.tags.slice(0, 2).map((tag) => {
                      const color = TAG_COLORS[tag] || "#475569";
                      return (
                        <button
                          key={tag}
                          style={{ color }}
                          className="text-[11px] font-semibold hover:underline cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            onTagClick?.(tag);
                          }}
                          title={`"${tag}" 태그로 필터`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSave(article);
                  }}
                  className={`ml-0.5 text-xs shrink-0 transition-colors leading-none ${
                    article.isSaved
                      ? "text-[var(--accent)]"
                      : "text-[var(--border-strong)] hover:text-[var(--accent)]"
                  }`}
                  title={article.isSaved ? "저장 해제" : "저장"}
                >
                  {article.isSaved ? "★" : "☆"}
                </button>
              </div>
              <p
                className={`text-[13px] leading-[1.4] line-clamp-1 ${
                  isSelected ? "text-[var(--foreground-bright)] font-medium" : "text-[var(--foreground)]"
                }`}
              >
                {article.title}
              </p>
            </div>
          );
        })}

        {hasMore && <div ref={sentinelRef} className="h-8" />}

        {loading && articles.length > 0 && (
          <div className="flex items-center justify-center py-6">
            <svg className="w-5 h-5 animate-spin text-[var(--accent)]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
