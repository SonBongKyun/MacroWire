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

const REGIONS: Array<{ value: string; label: string; color: string }> = [
  { value: "전체", label: "전체", color: "#6b7280" },
  { value: "한국", label: "한국", color: "#e35169" },
  { value: "미국", label: "미국", color: "#3b82f6" },
  { value: "글로벌", label: "글로벌", color: "#10b981" },
  { value: "환율·에너지", label: "환율·에너지", color: "#f59e0b" },
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
  const unreadCount = articles.filter((a) => !a.isRead).length;

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
      {/* ── Filter Bar ── */}
      <div className="news-filters shrink-0 border-b border-[var(--border)] bg-[var(--surface)]" style={{ minHeight: 48 }}>
        <div className="flex items-center gap-2.5 px-4 py-2.5 flex-wrap">

          {/* Range toggle group */}
          <div className="flex items-center bg-[var(--surface-active)] rounded-[var(--radius-sm)] p-0.5 border border-[var(--border-subtle)]">
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => onRangeChange(r.value)}
                className={`px-3 py-1.5 text-[10px] font-bold rounded-[3px] transition-all leading-none ${
                  range === r.value
                    ? "bg-[var(--accent)] text-white shadow-sm"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Source select */}
          <div className="relative">
            <select
              value={selectedSourceId || ""}
              onChange={(e) => onSelectSource(e.target.value || null)}
              className="appearance-none text-[11px] font-medium bg-[var(--surface)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] pl-2.5 pr-7 py-1.5 text-[var(--foreground)] outline-none cursor-pointer min-w-[110px] hover:border-[var(--accent)] transition-colors"
            >
              <option value="">전체 소스</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--muted)] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {/* Vertical divider */}
          <span className="w-px h-5 bg-[var(--border)]" />

          {/* Region chips with colored dot */}
          <div className="flex items-center gap-1">
            {REGIONS.map((r) => (
              <button
                key={r.value}
                onClick={() => onRegionFilterChange(r.value)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-semibold rounded-[var(--radius-sm)] border transition-all leading-none ${
                  regionFilter === r.value
                    ? "border-current bg-[var(--surface-active)] text-[var(--foreground)]"
                    : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
                }`}
                style={regionFilter === r.value ? { borderColor: r.color } : undefined}
              >
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: r.color, opacity: regionFilter === r.value ? 1 : 0.5 }}
                />
                {r.label}
              </button>
            ))}
          </div>

          {/* Vertical divider */}
          <span className="w-px h-5 bg-[var(--border)]" />

          {/* Read filter toggle group */}
          <div className="flex items-center bg-[var(--surface-active)] rounded-[var(--radius-sm)] p-0.5 border border-[var(--border-subtle)]">
            {READ_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => onReadFilterChange(f.value)}
                className={`px-2.5 py-1.5 text-[10px] font-bold rounded-[3px] transition-all leading-none ${
                  readFilter === f.value
                    ? "bg-[var(--accent)] text-white shadow-sm"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Saved toggle with gold accent */}
          <button
            onClick={onToggleSaved}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold rounded-[var(--radius-sm)] border transition-all leading-none ${
              showSaved
                ? "bg-[var(--gold-surface)] border-[var(--gold)] text-[var(--gold)] shadow-[0_0_8px_rgba(251,191,36,0.15)]"
                : "border-[var(--border-subtle)] text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--border)]"
            }`}
          >
            <svg className="w-3 h-3" fill={showSaved ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            저장됨
          </button>

          {/* Spacer pushes right-aligned items */}
          <div className="flex-1" />

          {/* View mode toggle */}
          <div className="flex items-center bg-[var(--surface-active)] rounded-[var(--radius-sm)] p-0.5 border border-[var(--border-subtle)]">
            <button
              onClick={() => onViewModeChange("list")}
              className={`px-2 py-1.5 rounded-[3px] transition-all ${
                viewMode === "list"
                  ? "bg-[var(--accent)] text-white shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
              title="리스트 보기"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => onViewModeChange("card")}
              className={`px-2 py-1.5 rounded-[3px] transition-all ${
                viewMode === "card"
                  ? "bg-[var(--accent)] text-white shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
              title="카드 보기"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
            </button>
          </div>

          {/* Article count badge */}
          <span className="inline-flex items-center px-2 py-1 text-[10px] tabular-nums font-bold text-[var(--muted)] bg-[var(--surface-active)] rounded-full border border-[var(--border-subtle)]">
            {articles.length}
            <span className="font-normal ml-0.5">건</span>
          </span>

          {/* Mark all read */}
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              className="metal-btn px-2.5 py-1.5 text-[10px] font-semibold text-[var(--muted)] hover:text-[var(--foreground)]"
              title="모두 읽음 처리"
            >
              <svg className="w-3 h-3 inline-block mr-1 -mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
              </svg>
              모두 읽음
            </button>
          )}

          {/* Export */}
          <button
            onClick={onExport}
            className="metal-btn px-2 py-1.5 text-[var(--muted)] hover:text-[var(--foreground)]"
            title="내보내기"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
        </div>

        {/* Active filter chips (dismissable) */}
        {(activeFilters.length > 0 || searchQuery) && (
          <div className="flex items-center gap-1.5 px-4 pb-2.5">
            <span className="text-[9px] font-semibold text-[var(--muted)] uppercase tracking-wider mr-1">필터</span>
            {activeFilters.map((f) => (
              <button
                key={f.key}
                onClick={f.onClear}
                className="group flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-[var(--accent-surface)] text-[var(--accent)] rounded-full border border-[var(--accent)]/20 hover:bg-[var(--accent)] hover:text-white transition-all"
              >
                {f.label}
                <svg className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            ))}
            {searchQuery && (
              <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-[var(--muted)] bg-[var(--surface-active)] rounded-full border border-[var(--border-subtle)]">
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                &quot;{searchQuery}&quot;
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Main content: 2-column grid ── */}
      <div
        className="flex-1 min-h-0"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 420px",
        }}
      >
        {/* Left column */}
        <div className="news-main overflow-y-auto">
          {/* SpikeAlert at top of article list */}
          <SpikeAlert articles={articles} onTagClick={onTagClick} />

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
        <div className="news-sidebar overflow-y-auto">
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
            <div className="flex flex-col h-full">
              {/* TodayPulse header */}
              <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[var(--border-subtle)]">
                <span className="flex items-center justify-center w-6 h-6 rounded-md bg-[var(--accent-surface)]">
                  <svg className="w-3.5 h-3.5 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </span>
                <h3 className="text-[12px] font-bold text-[var(--foreground-bright)] tracking-tight">
                  오늘의 펄스
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto">
                <TodayPulse articles={articles} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
