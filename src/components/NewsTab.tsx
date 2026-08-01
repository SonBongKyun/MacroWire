"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { ArrowLeft, List, Radar, Rows3, Star, X, Zap } from "lucide-react";
import type { Article, Source } from "@/types";
import { ArticleList } from "@/components/ArticleList";
import { ArticleDetail } from "@/components/ArticleDetail";
import { EmptyState } from "@/components/EmptyState";
import { SpikeAlert } from "@/components/SpikeAlert";
import { NewsTimeline } from "@/components/NewsTimeline";
import { useArticleScoring } from "@/hooks/useArticleScoring";
import {
  classifyArticleSignal,
  type ArticleSignal,
} from "@/lib/news/signal";

type SortMode = "newest" | "impact" | "oldest" | "source";
type FocusMode = "signal" | "all" | "breaking";
export type DensityMode = "compact" | "comfortable";

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
  onCloseArticle: () => void;
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

const FOCUS_MODES: Array<{
  value: FocusMode;
  label: string;
  title: string;
  icon: typeof Radar;
}> = [
  {
    value: "signal",
    label: "핵심",
    title: "시장과 정책에 영향을 줄 가능성이 높은 기사",
    icon: Radar,
  },
  {
    value: "all",
    label: "전체",
    title: "수집된 모든 기사",
    icon: List,
  },
  {
    value: "breaking",
    label: "속보",
    title: "거시경제 관련 속보",
    icon: Zap,
  },
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
  onCloseArticle,
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
  const [density, setDensity] = useState<DensityMode>("comfortable");
  const [focusMode, setFocusMode] = useState<FocusMode>("signal");
  const [regionFading, setRegionFading] = useState(false);
  const { getScore } = useArticleScoring(articles);

  useEffect(() => {
    const savedDensity = localStorage.getItem("macro-wire-news-density");
    if (savedDensity === "compact" || savedDensity === "comfortable") {
      setDensity(savedDensity);
    }
    const savedFocusMode = localStorage.getItem("macro-wire-focus-mode");
    if (
      savedFocusMode === "signal" ||
      savedFocusMode === "all" ||
      savedFocusMode === "breaking"
    ) {
      setFocusMode(savedFocusMode);
    }
  }, []);

  const changeDensity = useCallback((nextDensity: DensityMode) => {
    setDensity(nextDensity);
    localStorage.setItem("macro-wire-news-density", nextDensity);
  }, []);

  const handleRegionChange = useCallback((value: string) => {
    setRegionFading(true);
    onRegionFilterChange(value);
    setTimeout(() => setRegionFading(false), 200);
  }, [onRegionFilterChange]);

  const changeFocusMode = useCallback((nextMode: FocusMode) => {
    setFocusMode(nextMode);
    localStorage.setItem("macro-wire-focus-mode", nextMode);
  }, []);

  const articleSignals = useMemo(() => {
    const map = new Map<string, ArticleSignal>();
    for (const article of articles) {
      map.set(article.id, classifyArticleSignal(article));
    }
    return map;
  }, [articles]);

  const focusCounts = useMemo(() => {
    let signal = 0;
    let breaking = 0;
    for (const article of articles) {
      const articleSignal = articleSignals.get(article.id);
      if (!articleSignal || articleSignal.tier === "general") continue;
      signal++;
      if (articleSignal.isBreaking) breaking++;
    }
    return { all: articles.length, signal, breaking };
  }, [articles, articleSignals]);

  const focusedArticles = useMemo(() => {
    if (focusMode === "all") return articles;
    return articles.filter((article) => {
      const signal = articleSignals.get(article.id);
      if (!signal || signal.tier === "general") return false;
      return focusMode === "signal" || signal.isBreaking;
    });
  }, [articles, articleSignals, focusMode]);

  const sortedArticles = useMemo(() => {
    const list = [...focusedArticles];
    switch (sortMode) {
      case "newest":
        return list.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
      case "impact":
        return list.sort((a, b) => (getScore(b.id)?.impactScore ?? 0) - (getScore(a.id)?.impactScore ?? 0));
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
  }, [focusedArticles, sortMode, getScore]);

  useEffect(() => {
    if (
      selectedArticle &&
      !focusedArticles.some((article) => article.id === selectedArticle.id)
    ) {
      onCloseArticle();
    }
  }, [focusedArticles, onCloseArticle, selectedArticle]);

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
  if (focusMode !== "all") {
    activeFilters.push({
      key: "focus",
      label: focusMode === "signal" ? "핵심 신호" : "거시경제 속보",
      onClear: () => changeFocusMode("all"),
    });
  }

  return (
    <div className="news-tab flex flex-col h-full">
      {/* ── Filter Bar: single 40px row ── */}
      <div
        className="news-filterbar shrink-0"
      >
        <div className="news-filter-row">

          {/* Range toggle pills */}
          <div className="news-segment" aria-label="기사 기간">
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => onRangeChange(r.value)}
                className={range === r.value ? "is-active" : ""}
                aria-pressed={range === r.value}
              >
                {r.label}
              </button>
            ))}
          </div>

          <div className="news-focus-segment" role="group" aria-label="뉴스 집중 모드">
            {FOCUS_MODES.map((mode) => {
              const Icon = mode.icon;
              const isActive = focusMode === mode.value;
              return (
                <button
                  key={mode.value}
                  type="button"
                  className={isActive ? "is-active" : ""}
                  onClick={() => changeFocusMode(mode.value)}
                  aria-pressed={isActive}
                  title={mode.title}
                >
                  <Icon size={12} />
                  <span>{mode.label}</span>
                  <small>{focusCounts[mode.value]}</small>
                </button>
              );
            })}
          </div>

          {/* Source dropdown */}
          <div className="news-source-select">
            <select
              value={selectedSourceId || ""}
              onChange={(e) => onSelectSource(e.target.value || null)}
              style={{
                appearance: "none",
                WebkitAppearance: "none",
                fontSize: 11,
                fontWeight: 500,
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: 2,
                padding: "2px 22px 2px 8px",
                color: "var(--foreground)",
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
            <svg className="absolute right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 pointer-events-none" style={{ color: "var(--muted)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {/* Region text buttons */}
          <div className="news-regions">
            {REGIONS.map((r) => {
              const isActive = regionFilter === r.value;
              return (
                <button
                  key={r.value}
                  onClick={() => handleRegionChange(r.value)}
                  className={isActive ? "is-active" : ""}
                  aria-pressed={isActive}
                >
                  {r.label}
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <span style={{ width: 1, height: 16, backgroundColor: "var(--border)" }} />

          {/* Read filter as text links */}
          <div className="news-read-filters">
            {READ_FILTERS.map((f, i) => (
              <span key={f.value} className="flex items-center">
                {i > 0 && <span style={{ color: "var(--border)", margin: "0 6px" }}>|</span>}
                <button
                  onClick={() => onReadFilterChange(f.value)}
                  className={readFilter === f.value ? "is-active" : ""}
                  aria-pressed={readFilter === f.value}
                >
                  {f.label}
                </button>
              </span>
            ))}
          </div>

          {/* Spacer */}
          <div className="news-filter-spacer" />

          {/* Article count */}
          <span className="news-result-count">
            {sortedArticles.length}<small>건</small>
          </span>

          {/* Saved star toggle */}
          <button
            onClick={onToggleSaved}
            className={`news-icon-button ${showSaved ? "is-active" : ""}`}
            title="저장된 기사만"
            aria-label="저장된 기사만 보기"
            aria-pressed={showSaved}
          >
            <Star size={15} fill={showSaved ? "currentColor" : "none"} />
          </button>

          {/* Sort dropdown */}
          <div className="news-sort-select">
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              style={{
                appearance: "none",
                WebkitAppearance: "none",
                fontSize: 11,
                fontWeight: 500,
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: 2,
                padding: "2px 22px 2px 8px",
                color: "var(--foreground)",
                outline: "none",
                cursor: "pointer",
                minWidth: 70,
              }}
            >
              <option value="newest">최신순</option>
              <option value="impact">중요도순</option>
              <option value="oldest">오래된순</option>
              <option value="source">소스별</option>
            </select>
            <svg className="absolute right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 pointer-events-none" style={{ color: "var(--muted)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          <div className="news-density" role="group" aria-label="기사 목록 밀도">
            <button
              type="button"
              className={density === "compact" ? "is-active" : ""}
              onClick={() => changeDensity("compact")}
              aria-pressed={density === "compact"}
              title="압축형 목록"
            >
              <Rows3 size={14} />
            </button>
            <button
              type="button"
              className={density === "comfortable" ? "is-active" : ""}
              onClick={() => changeDensity("comfortable")}
              aria-pressed={density === "comfortable"}
              title="편안한 목록"
            >
              <Rows3 size={17} />
            </button>
          </div>
        </div>
      </div>

      {/* Active filter chips (dismissable) */}
      {(activeFilters.length > 0 || searchQuery) && (
        <div className="news-active-filters">
          <span className="news-active-filters-label">필터</span>
          {activeFilters.map((f) => (
            <button
              key={f.key}
              onClick={f.onClear}
              className="news-filter-chip"
              aria-label={`${f.label} 필터 제거`}
            >
              {f.label}
              <X size={10} />
            </button>
          ))}
          {searchQuery && (
            <span className="news-search-chip">
              &quot;{searchQuery}&quot;
            </span>
          )}
        </div>
      )}

      {/* ── Main content: 2-column, right panel flexible ── */}
      <div
        className={`news-workspace flex-1 min-h-0 ${selectedArticle ? "has-selection" : ""}`}
      >
        {/* Left column: article list */}
        <div className={`news-list-pane overflow-hidden transition-opacity duration-200 ${regionFading ? "opacity-0" : "opacity-100"}`}>
          <SpikeAlert articles={sortedArticles} onTagClick={onTagClick} />

          {sortedArticles.length === 0 && !loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", marginBottom: 6 }}>
                {focusMode === "breaking"
                  ? "거시경제 속보가 없습니다"
                  : activeFilters.length > 0 || searchQuery
                    ? "검색 결과가 없습니다"
                    : "기사가 없습니다"}
              </div>
              {(activeFilters.length > 0 || searchQuery) ? (
                <>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 16, lineHeight: 1.6 }}>
                    현재 필터:{" "}
                    {activeFilters.map((f) => f.label).join(", ")}
                    {searchQuery && ((activeFilters.length > 0 ? ", " : "") + `"${searchQuery}"`)}
                  </div>
                  <button
                    onClick={() => { activeFilters.forEach((f) => f.onClear()); }}
                    className="news-reset-filter"
                  >
                    필터 초기화
                  </button>
                </>
              ) : (
                <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.6, maxWidth: 300 }}>
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
              density={density}
            />
          )}
        </div>

        {/* Right column: Detail or empty state */}
        {selectedArticle ? (
          <div className="news-detail-pane overflow-y-auto">
            <button
              type="button"
              className="news-mobile-back"
              onClick={onCloseArticle}
              aria-label="기사 목록으로 돌아가기"
            >
              <ArrowLeft size={18} />
              기사 목록
            </button>
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
          <div className="news-empty-pane flex flex-col items-center justify-center">
            <EmptyState
              glyph="no-selection"
              title="기사를 선택하세요"
              description="목록에서 헤드라인을 선택하면 원문 정보와 신호 분석이 표시됩니다."
            />
          </div>
        )}
      </div>
    </div>
  );
}
