"use client";

import { useState, useMemo, useCallback } from "react";
import type { Article, Source } from "@/types";
import { ArticleList } from "@/components/ArticleList";
import { ArticleDetail } from "@/components/ArticleDetail";
import { EmptyState } from "@/components/EmptyState";
import { SpikeAlert } from "@/components/SpikeAlert";
import { NewsTimeline } from "@/components/NewsTimeline";

type SortMode = "newest" | "oldest" | "source";

interface NewsTabProps {
  articles: Article[];
  selectedArticle: Article | null;
  loading: boolean;
  hasMore: boolean;
  sources: Source[];
  selectedSourceId: string | null;
  selectedTag: string | null;
  range: "24h" | "7d" | "30d";
  showSaved: boolean;
  readFilter: "all" | "unread" | "read";
  regionFilter: string;
  searchQuery: string;
  viewMode: "list" | "card";
  timelineMode: boolean;
  newArticleIds: string[];
  // Handlers
  onSelectArticle: (article: Article) => void;
  onSelectSource: (id: string | null) => void;
  onSelectTag: (tag: string | null) => void;
  onRangeChange: (r: "24h" | "7d" | "30d") => void;
  onToggleSaved: () => void;
  onReadFilterChange: (f: "all" | "unread" | "read") => void;
  onRegionFilterChange: (r: string) => void;
  onLoadMore: () => void;
  onToggleSave: (article: Article) => void;
  onToggleRead: (article: Article) => void;
  onTagClick: (tag: string) => void;
  onViewModeChange: (v: "list" | "card") => void;
  onMarkAllRead: () => void;
  onExport: () => void;
  // Collections
  collectionName: string;
  collectionNames: string[];
  onCollectionChange: (articleId: string, name: string) => void;
  onCreateCollection: (name: string) => void;
}

const RANGES: Array<{ value: "24h" | "7d" | "30d"; label: string }> = [
  { value: "24h", label: "24H" },
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
];

const REGIONS: Array<{ value: string; label: string }> = [
  { value: "전체", label: "전체" },
  { value: "한국", label: "한국" },
  { value: "미국", label: "미국" },
  { value: "글로벌", label: "글로벌" },
  { value: "환율·에너지", label: "환율·에너지" },
];

const READ_FILTERS: Array<{ value: "all" | "unread" | "read"; label: string }> = [
  { value: "all", label: "전체" },
  { value: "unread", label: "안읽음" },
  { value: "read", label: "읽음" },
];

export function NewsTab({
  articles,
  selectedArticle,
  loading,
  hasMore,
  sources,
  selectedSourceId,
  selectedTag,
  range,
  showSaved,
  readFilter,
  regionFilter,
  searchQuery,
  viewMode,
  timelineMode,
  newArticleIds,
  onSelectArticle,
  onSelectSource,
  onSelectTag,
  onRangeChange,
  onToggleSaved,
  onReadFilterChange,
  onRegionFilterChange,
  onLoadMore,
  onToggleSave,
  onToggleRead,
  onTagClick,
  onViewModeChange,
  onMarkAllRead,
  onExport,
  collectionName,
  collectionNames,
  onCollectionChange,
  onCreateCollection,
}: NewsTabProps) {
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [regionFading, setRegionFading] = useState(false);

  const handleRegionChange = useCallback((value: string) => {
    setRegionFading(true);
    onRegionFilterChange(value);
    setTimeout(() => setRegionFading(false), 200);
  }, [onRegionFilterChange]);

  const sortedArticles = useMemo(() => {
    const list = [...articles];
    switch (sortMode) {
      case "newest":
        return list.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
      case "oldest":
        return list.sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime());
      case "source":
        return list.sort((a, b) => {
          const cmp = a.sourceName.localeCompare(b.sourceName);
          if (cmp !== 0) return cmp;
          return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
        });
      default:
        return list;
    }
  }, [articles, sortMode]);

  /* Collect active filter chips for dismissable display */
  const activeFilters: Array<{ key: string; label: string; onClear: () => void }> = [];
  if (selectedTag) {
    activeFilters.push({
      key: "tag",
      label: `#${selectedTag}`,
      onClear: () => onSelectTag(null),
    });
  }
  if (selectedSourceId) {
    const src = sources.find((s) => s.id === selectedSourceId);
    activeFilters.push({
      key: "source",
      label: src?.name || selectedSourceId,
      onClear: () => onSelectSource(null),
    });
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Filter Bar: single 40px row ── */}
      <div
        className="shrink-0 border-b border-[#2C2D34] bg-[#0D0E12]"
        style={{ height: 40, borderTop: "1px solid rgba(201,169,110,0.2)" }}
      >
        <div className="flex items-center h-full px-4 gap-3">

          {/* Range toggle pills */}
          <div className="flex items-center gap-0.5">
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => onRangeChange(r.value)}
                className="transition-all"
                style={{
                  padding: "3px 10px",
                  fontSize: 10,
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.02em",
                  borderRadius: 3,
                  border: "1px solid transparent",
                  color: range === r.value ? "#0D0E12" : "#8C8C91",
                  backgroundColor: range === r.value ? "#C9A96E" : "transparent",
                  cursor: "pointer",
                }}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Source dropdown */}
          <div className="relative">
            <select
              value={selectedSourceId || ""}
              onChange={(e) => onSelectSource(e.target.value || null)}
              style={{
                appearance: "none",
                WebkitAppearance: "none",
                fontSize: 11,
                fontWeight: 500,
                background: "transparent",
                border: "1px solid #2C2D34",
                borderRadius: 2,
                padding: "2px 22px 2px 8px",
                color: "#EBEBEB",
                outline: "none",
                cursor: "pointer",
                minWidth: 90,
              }}
            >
              <option value="">전체 소스</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <svg className="absolute right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 pointer-events-none" style={{ color: "#8C8C91" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {/* Region text buttons */}
          <div className="flex items-center gap-0.5">
            {REGIONS.map((r) => {
              const isActive = regionFilter === r.value;
              return (
                <button
                  key={r.value}
                  onClick={() => handleRegionChange(r.value)}
                  style={{
                    padding: "2px 8px",
                    fontSize: 11,
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? "#C9A96E" : "#8C8C91",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    position: "relative",
                    borderBottom: isActive ? "2px solid #C9A96E" : "2px solid transparent",
                  }}
                >
                  {r.label}
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <span style={{ width: 1, height: 16, backgroundColor: "#2C2D34" }} />

          {/* Read filter as text links */}
          <div className="flex items-center" style={{ fontSize: 11 }}>
            {READ_FILTERS.map((f, i) => (
              <span key={f.value} className="flex items-center">
                {i > 0 && <span style={{ color: "#2C2D34", margin: "0 6px" }}>|</span>}
                <button
                  onClick={() => onReadFilterChange(f.value)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: readFilter === f.value ? 700 : 400,
                    color: readFilter === f.value ? "#EBEBEB" : "#8C8C91",
                    padding: 0,
                  }}
                >
                  {f.label}
                </button>
              </span>
            ))}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Article count */}
          <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "#8C8C91", fontWeight: 500 }}>
            {sortedArticles.length}건
          </span>

          {/* Saved star toggle */}
          <button
            onClick={onToggleSaved}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 14,
              color: showSaved ? "#C9A96E" : "#8C8C91",
              padding: "0 2px",
              lineHeight: 1,
            }}
            title="저장된 기사만"
          >
            {showSaved ? "\u2605" : "\u2606"}
          </button>

          {/* Sort dropdown */}
          <div className="relative">
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              style={{
                appearance: "none",
                WebkitAppearance: "none",
                fontSize: 11,
                fontWeight: 500,
                background: "transparent",
                border: "1px solid #2C2D34",
                borderRadius: 2,
                padding: "2px 22px 2px 8px",
                color: "#EBEBEB",
                outline: "none",
                cursor: "pointer",
                minWidth: 70,
              }}
            >
              <option value="newest">최신순</option>
              <option value="oldest">오래된순</option>
              <option value="source">소스별</option>
            </select>
            <svg className="absolute right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 pointer-events-none" style={{ color: "#8C8C91" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Active filter chips (dismissable) */}
      {(activeFilters.length > 0 || searchQuery) && (
        <div className="flex items-center gap-1.5 px-4 py-1.5 border-b border-[#2C2D34] bg-[#0D0E12]">
          <span style={{ fontSize: 9, fontWeight: 600, color: "#8C8C91", textTransform: "uppercase", letterSpacing: "0.05em", marginRight: 4 }}>필터</span>
          {activeFilters.map((f) => (
            <button
              key={f.key}
              onClick={f.onClear}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "1px 8px",
                fontSize: 10,
                fontWeight: 600,
                color: "#C9A96E",
                background: "rgba(201,169,110,0.15)",
                border: "1px solid rgba(201,169,110,0.3)",
                borderRadius: 2,
                cursor: "pointer",
              }}
            >
              {f.label}
              <svg style={{ width: 8, height: 8, opacity: 0.7 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ))}
          {searchQuery && (
            <span style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "1px 8px",
              fontSize: 10,
              color: "#8C8C91",
              background: "rgba(140,140,145,0.08)",
              border: "1px solid rgba(140,140,145,0.15)",
              borderRadius: 2,
            }}>
              &quot;{searchQuery}&quot;
            </span>
          )}
        </div>
      )}

      {/* ── Main content: 2-column, right panel flexible ── */}
      <div
        className="flex-1 min-h-0"
        style={{
          display: "grid",
          gridTemplateColumns: selectedArticle ? "380px 1fr" : "1fr",
        }}
      >
        {/* Left column: article list */}
        <div className={`overflow-y-auto transition-opacity duration-200 ${regionFading ? "opacity-0" : "opacity-100"}`} style={{ borderLeft: "1px solid rgba(201,169,110,0.12)" }}>
          <SpikeAlert articles={sortedArticles} onTagClick={onTagClick} />

          {sortedArticles.length === 0 && !loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#EBEBEB", marginBottom: 6 }}>
                {activeFilters.length > 0 || searchQuery ? "검색 결과가 없습니다" : "기사가 없습니다"}
              </div>
              {(activeFilters.length > 0 || searchQuery) ? (
                <>
                  <div style={{ fontSize: 11, color: "#8C8C91", marginBottom: 16, lineHeight: 1.6 }}>
                    현재 필터:{" "}
                    {activeFilters.map((f) => f.label).join(", ")}
                    {searchQuery && ((activeFilters.length > 0 ? ", " : "") + `"${searchQuery}"`)}
                  </div>
                  <button
                    onClick={() => { activeFilters.forEach((f) => f.onClear()); }}
                    style={{
                      padding: "6px 16px",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#C9A96E",
                      background: "rgba(201,169,110,0.08)",
                      border: "1px solid #C9A96E",
                      borderRadius: 2,
                      cursor: "pointer",
                    }}
                  >
                    필터 초기화
                  </button>
                </>
              ) : (
                <div style={{ fontSize: 11, color: "#8C8C91", lineHeight: 1.6, maxWidth: 300 }}>
                  새로고침 버튼을 눌러 기사를 수집하거나 소스를 추가해 보세요
                </div>
              )}
            </div>
          ) : timelineMode ? (
            <NewsTimeline articles={sortedArticles} onSelectArticle={onSelectArticle} />
          ) : (
            <ArticleList
              articles={sortedArticles}
              loading={loading}
              selectedArticleId={selectedArticle?.id || null}
              onSelectArticle={onSelectArticle}
              onToggleSave={onToggleSave}
              onToggleRead={onToggleRead}
              hasMore={hasMore}
              onLoadMore={onLoadMore}
              readFilter={readFilter}
              onReadFilterChange={onReadFilterChange}
              onTagClick={onTagClick}
              newArticleIds={newArticleIds}
              viewMode="list"
              onViewModeChange={onViewModeChange}
            />
          )}
        </div>

        {/* Right column: Detail or empty state */}
        {selectedArticle ? (
          <div className="overflow-y-auto border-l border-[#2C2D34]">
            <ArticleDetail
              article={selectedArticle}
              onToggleRead={onToggleRead}
              onToggleSave={onToggleSave}
              onTagClick={onTagClick}
              collectionName={collectionName}
              collectionNames={collectionNames}
              onCollectionChange={onCollectionChange}
              onCreateCollection={onCreateCollection}
              articles={sortedArticles}
              onSelectArticle={onSelectArticle}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center border-l border-[#2C2D34]">
            <EmptyState
              glyph="no-selection"
              title="기사를 선택하세요"
              description="왼쪽 목록에서 클릭하거나 j / k 키로 이동할 수 있습니다."
            />
            <div style={{ display: "flex", gap: 6, marginTop: -12 }}>
              <kbd style={{ fontSize: 9, fontFamily: "var(--font-mono)", padding: "2px 6px", border: "1px solid #2C2D34", borderRadius: 2, color: "#8C8C91" }}>j</kbd>
              <kbd style={{ fontSize: 9, fontFamily: "var(--font-mono)", padding: "2px 6px", border: "1px solid #2C2D34", borderRadius: 2, color: "#8C8C91" }}>k</kbd>
              <span style={{ fontSize: 10, color: "#8C8C91" }}>위/아래</span>
              <kbd style={{ fontSize: 9, fontFamily: "var(--font-mono)", padding: "2px 6px", border: "1px solid #2C2D34", borderRadius: 2, color: "#8C8C91" }}>Enter</kbd>
              <span style={{ fontSize: 10, color: "#8C8C91" }}>열기</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
