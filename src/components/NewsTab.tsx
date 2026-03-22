"use client";

import type { Article, Source } from "@/types";
import { ArticleList } from "@/components/ArticleList";
import { ArticleDetail } from "@/components/ArticleDetail";
import { TodayPulse } from "@/components/TodayPulse";
import { SpikeAlert } from "@/components/SpikeAlert";
import { NewsTimeline } from "@/components/NewsTimeline";

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

const REGIONS = ["전체", "한국", "미국", "글로벌", "환율·에너지"];

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
  const unreadCount = articles.filter((a) => !a.isRead).length;

  return (
    <div className="flex flex-col h-full">
      {/* Spike Alert */}
      <SpikeAlert articles={articles} onTagClick={onTagClick} />

      {/* Filter Bar */}
      <div className="shrink-0 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Range toggle */}
          <div className="flex items-center bg-[var(--surface-active)] rounded-[var(--radius-sm)] p-0.5 border border-[var(--border-subtle)]">
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => onRangeChange(r.value)}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-[3px] transition-all ${
                  range === r.value
                    ? "bg-[var(--accent)] text-white shadow-sm"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Source dropdown */}
          <select
            value={selectedSourceId || ""}
            onChange={(e) => onSelectSource(e.target.value || null)}
            className="text-[10px] font-medium bg-[var(--surface-active)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] px-2 py-1.5 text-[var(--foreground)] outline-none cursor-pointer min-w-[100px]"
          >
            <option value="">전체 소스</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Divider */}
          <span className="w-px h-4 bg-[var(--border-subtle)]" />

          {/* Region chips */}
          <div className="flex items-center gap-1">
            {REGIONS.map((r) => (
              <button
                key={r}
                onClick={() => onRegionFilterChange(r)}
                className={`px-2 py-1 text-[10px] font-semibold rounded-[var(--radius-sm)] transition-all ${
                  regionFilter === r
                    ? "bg-[var(--accent)] text-white"
                    : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Divider */}
          <span className="w-px h-4 bg-[var(--border-subtle)]" />

          {/* Read filter */}
          <div className="flex items-center bg-[var(--surface-active)] rounded-[var(--radius-sm)] p-0.5 border border-[var(--border-subtle)]">
            {READ_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => onReadFilterChange(f.value)}
                className={`px-2 py-1 text-[10px] font-bold rounded-[3px] transition-all ${
                  readFilter === f.value
                    ? "bg-[var(--accent)] text-white shadow-sm"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Saved toggle */}
          <button
            onClick={onToggleSaved}
            className={`px-2.5 py-1 text-[10px] font-bold rounded-[var(--radius-sm)] border transition-all ${
              showSaved
                ? "bg-[var(--gold-surface)] border-[var(--gold)] text-[var(--gold)]"
                : "border-[var(--border-subtle)] text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {showSaved ? "* 저장됨" : "저장됨"}
          </button>

          {/* Divider */}
          <span className="w-px h-4 bg-[var(--border-subtle)]" />

          {/* View mode toggle */}
          <div className="flex items-center bg-[var(--surface-active)] rounded-[var(--radius-sm)] p-0.5 border border-[var(--border-subtle)]">
            <button
              onClick={() => onViewModeChange("list")}
              className={`px-2 py-1 text-[10px] font-bold rounded-[3px] transition-all ${
                viewMode === "list"
                  ? "bg-[var(--accent)] text-white shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
              title="리스트 보기"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => onViewModeChange("card")}
              className={`px-2 py-1 text-[10px] font-bold rounded-[3px] transition-all ${
                viewMode === "card"
                  ? "bg-[var(--accent)] text-white shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
              title="카드 보기"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
            </button>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Mark all read */}
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              className="px-2.5 py-1 text-[10px] font-semibold text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              title="모두 읽음 처리"
            >
              모두 읽음
            </button>
          )}

          {/* Export */}
          <button
            onClick={onExport}
            className="px-2.5 py-1 text-[10px] font-semibold text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            title="내보내기"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>

          {/* Article count */}
          <span className="text-[10px] tabular-nums text-[var(--muted)] font-medium">
            {articles.length}건
          </span>
        </div>

        {/* Active filter tags */}
        {(selectedTag || searchQuery) && (
          <div className="flex items-center gap-1.5 mt-2">
            {selectedTag && (
              <button
                onClick={() => onSelectTag(null)}
                className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-semibold bg-[var(--accent-surface)] text-[var(--accent)] rounded-full"
              >
                #{selectedTag}
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            {searchQuery && (
              <span className="text-[9px] text-[var(--muted)]">
                &quot;{searchQuery}&quot;
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main content: 2-column grid */}
      <div
        className="flex-1 min-h-0"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 420px",
        }}
      >
        {/* Left column: Article list or timeline */}
        <div className="overflow-y-auto border-r border-[var(--border)]">
          {timelineMode ? (
            <NewsTimeline articles={articles} onSelectArticle={onSelectArticle} />
          ) : (
            <ArticleList
              articles={articles}
              loading={loading}
              selectedArticleId={selectedArticle?.id || null}
              onSelectArticle={onSelectArticle}
              onToggleSave={onToggleSave}
              hasMore={hasMore}
              onLoadMore={onLoadMore}
              readFilter={readFilter}
              onReadFilterChange={onReadFilterChange}
              onTagClick={onTagClick}
              newArticleIds={newArticleIds}
              viewMode={viewMode}
              onViewModeChange={onViewModeChange}
            />
          )}
        </div>

        {/* Right column: Detail or TodayPulse */}
        <div className="overflow-y-auto">
          {selectedArticle ? (
            <ArticleDetail
              article={selectedArticle}
              onToggleRead={onToggleRead}
              onToggleSave={onToggleSave}
              onTagClick={onTagClick}
              collectionName={collectionName}
              collectionNames={collectionNames}
              onCollectionChange={onCollectionChange}
              onCreateCollection={onCreateCollection}
              articles={articles}
              onSelectArticle={onSelectArticle}
            />
          ) : (
            <TodayPulse articles={articles} />
          )}
        </div>
      </div>
    </div>
  );
}
