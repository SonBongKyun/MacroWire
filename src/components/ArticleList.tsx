"use client";

import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { ArrowUp, LoaderCircle } from "lucide-react";
import type { Article } from "@/types";
import { TAG_COLORS } from "@/lib/constants/colors";
import { useArticleScoring } from "@/hooks/useArticleScoring";
import { PeekPopover } from "@/components/PeekPopover";
import { EmptyState } from "@/components/EmptyState";
import { classifyArticleSignal } from "@/lib/news/signal";
import { computeCoverage } from "@/lib/clustering/coverage";

type ReadFilter = "all" | "unread" | "read";
type ViewMode = "list" | "card";

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  article: Article | null;
}

interface ArticleListProps {
  articles: Article[];
  loading: boolean;
  selectedArticleId: string | null;
  onSelectArticle: (article: Article) => void;
  onToggleSave: (article: Article) => void;
  onToggleRead?: (article: Article) => void;
  hasMore: boolean;
  onLoadMore: () => void;
  readFilter: ReadFilter;
  onReadFilterChange: (f: ReadFilter) => void;
  onTagClick?: (tag: string) => void;
  newArticleIds?: string[];
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  density?: "compact" | "comfortable";
}

const ROW_HEIGHT_COMPACT = 76;
const ROW_HEIGHT_COMFORTABLE = 104;
const BUFFER_COUNT = 10;

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

/**
 * A stable hue per source.
 *
 * Outlet names were rendered as a two-letter monospace code in a side rail,
 * which is unreadable at a glance and told you nothing until you decoded it.
 * A tinted chip carrying the real name is recognisable peripherally, which is
 * how a wire actually gets scanned.
 */
const SOURCE_TINTS = [
  "#7fb3f5", "#69c9a4", "#e0a35f", "#c98fd4",
  "#5fc4c9", "#e0857f", "#a5b45f", "#8f9ee0",
];

function sourceColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return SOURCE_TINTS[hash % SOURCE_TINTS.length];
}

function SkeletonRow() {
  return (
    <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div className="skeleton" style={{ width: "70%", height: 14, borderRadius: 2 }} />
        <div className="skeleton" style={{ width: 40, height: 10, borderRadius: 2, marginLeft: "auto" }} />
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
        <div className="skeleton" style={{ width: 30, height: 9, borderRadius: 2 }} />
        <div className="skeleton" style={{ width: 30, height: 9, borderRadius: 2 }} />
      </div>
    </div>
  );
}

export function ArticleList({
  articles,
  loading,
  selectedArticleId,
  onSelectArticle,
  onToggleSave,
  onToggleRead,
  hasMore,
  onLoadMore,
  readFilter,
  onReadFilterChange,
  onTagClick,
  newArticleIds = [],
  viewMode = "list",
  onViewModeChange,
  density = "comfortable",
}: ArticleListProps) {
  const { getScore } = useArticleScoring(articles);
  const listRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  // Context menu state
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0, article: null });
  const ctxMenuRef = useRef<HTMLDivElement>(null);

  // Hover peek state (shows description popover after a 450ms hover delay)
  const [peek, setPeek] = useState<{ article: Article; x: number; y: number } | null>(null);
  const peekTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleRowMouseEnter = useCallback((e: React.MouseEvent, article: Article) => {
    if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const x = rect.right + 8;
    const y = rect.top;
    peekTimerRef.current = setTimeout(() => {
      setPeek({ article, x, y });
    }, 450);
  }, []);

  const handleRowMouseLeave = useCallback(() => {
    if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
    setPeek(null);
  }, []);

  // Clear peek on scroll — stale positioning otherwise
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const clear = () => {
      if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
      setPeek(null);
    };
    el.addEventListener("scroll", clear);
    return () => el.removeEventListener("scroll", clear);
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent, article: Article) => {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ visible: true, x: e.clientX, y: e.clientY, article });
  }, []);

  const closeContextMenu = useCallback(() => {
    setCtxMenu((prev) => ({ ...prev, visible: false }));
  }, []);

  useEffect(() => {
    if (!ctxMenu.visible) return;
    const handleClick = (e: MouseEvent) => {
      if (ctxMenuRef.current && !ctxMenuRef.current.contains(e.target as Node)) {
        closeContextMenu();
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeContextMenu();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [ctxMenu.visible, closeContextMenu]);

  const ctxActions = useMemo(() => {
    if (!ctxMenu.article) return [];
    const a = ctxMenu.article;
    return [
      { label: "원문 열기", action: () => { window.open(a.url, "_blank"); closeContextMenu(); } },
      { label: "URL 복사", action: () => { navigator.clipboard.writeText(a.url); closeContextMenu(); } },
      { label: "제목 + URL 복사", action: () => { navigator.clipboard.writeText(`${a.title}\n${a.url}`); closeContextMenu(); } },
      { type: "divider" as const },
      { label: a.isSaved ? "저장 해제" : "저장", action: () => { onToggleSave(a); closeContextMenu(); } },
      { label: a.isRead ? "읽지 않음" : "읽음 표시", action: () => { onToggleRead?.(a); closeContextMenu(); } },
    ];
  }, [ctxMenu.article, onToggleSave, onToggleRead, closeContextMenu]);

  // Apply read filter client-side
  const filteredArticles =
    readFilter === "all"
      ? articles
      : readFilter === "unread"
        ? articles.filter((a) => !a.isRead)
        : articles.filter((a) => a.isRead);

  const newIds = useMemo(() => new Set(newArticleIds), [newArticleIds]);
  // How many outlets are on each story. Computed once per list rather than
  // per row — it is O(n²) over titles.
  const coverage = useMemo(() => computeCoverage(articles), [articles]);
  const rowHeight = density === "compact" ? ROW_HEIGHT_COMPACT : ROW_HEIGHT_COMFORTABLE;

  // Measure container height on mount and resize
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const measure = () => setContainerHeight(el.clientHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Virtual scrolling calculations
  const totalHeight = filteredArticles.length * rowHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - BUFFER_COUNT);
  const visibleCount = Math.ceil(containerHeight / rowHeight) + 2 * BUFFER_COUNT;
  const endIndex = Math.min(filteredArticles.length, startIndex + visibleCount);
  const visibleArticles = filteredArticles.slice(startIndex, endIndex);
  const offsetY = startIndex * rowHeight;

  // Infinite scroll: trigger load more when near the bottom
  useEffect(() => {
    if (!hasMore || loading) return;
    const scrollBottom = scrollTop + containerHeight;
    if (scrollBottom >= totalHeight - 200) {
      onLoadMore();
    }
  }, [scrollTop, containerHeight, totalHeight, hasMore, loading, onLoadMore]);

  const handleListScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    setScrollTop(el.scrollTop);
    setShowScrollTop(el.scrollTop > 400);
  }, []);

  const scrollToTop = useCallback(() => {
    listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!filteredArticles.length) return;
      const idx = filteredArticles.findIndex((a) => a.id === selectedArticleId);
      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        const next = Math.min(idx + 1, filteredArticles.length - 1);
        onSelectArticle(filteredArticles[next]);
        // Scroll selected item into view
        const itemTop = next * rowHeight;
        const el = listRef.current;
        if (el) {
          if (itemTop < el.scrollTop) {
            el.scrollTop = itemTop;
          } else if (itemTop + rowHeight > el.scrollTop + el.clientHeight) {
            el.scrollTop = itemTop + rowHeight - el.clientHeight;
          }
        }
      } else if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        const prev = Math.max(idx - 1, 0);
        onSelectArticle(filteredArticles[prev]);
        const itemTop = prev * rowHeight;
        const el = listRef.current;
        if (el) {
          if (itemTop < el.scrollTop) {
            el.scrollTop = itemTop;
          } else if (itemTop + rowHeight > el.scrollTop + el.clientHeight) {
            el.scrollTop = itemTop + rowHeight - el.clientHeight;
          }
        }
      } else if (e.key === "s" && idx >= 0) {
        e.preventDefault();
        onToggleSave(filteredArticles[idx]);
      }
    },
    [filteredArticles, selectedArticleId, onSelectArticle, onToggleSave, rowHeight]
  );

  return (
    // Listbox semantics: the container owns focus and j/k navigation, and
    // aria-activedescendant tells a screen reader which headline is current —
    // previously the rows were plain divs and announced nothing at all.
    <div
      className="h-full min-h-0 flex-1 flex flex-col overflow-hidden focus:outline-none relative"
      tabIndex={0}
      role="listbox"
      aria-label="기사 목록"
      aria-activedescendant={selectedArticleId ? `article-row-${selectedArticleId}` : undefined}
      onKeyDown={handleKeyDown}
    >
      {/* List */}
      <div
        className="flex-1 overflow-y-auto"
        ref={listRef}
        onScroll={handleListScroll}
        style={{ backgroundColor: "var(--background)" }}
      >
        {loading && articles.length === 0 && (
          <>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        )}

        {!loading && filteredArticles.length === 0 && (
          <EmptyState
            glyph={readFilter === "unread" ? "all-read" : "no-articles"}
            title={
              readFilter === "unread"
                ? "모두 읽었습니다"
                : readFilter === "read"
                ? "읽은 기사가 없습니다"
                : "표시할 기사가 없습니다"
            }
            description={
              readFilter === "unread"
                ? "이 범위의 모든 기사를 확인했습니다."
                : readFilter === "read"
                ? "기사를 열어보면 여기서 다시 만날 수 있습니다."
                : "필터를 바꾸거나 잠시 후 다시 확인해 보세요."
            }
          />
        )}

        {/* Virtualized list view */}
        {filteredArticles.length > 0 && (
          <div style={{ height: totalHeight, position: "relative" }}>
            <div style={{ transform: `translateY(${offsetY}px)`, position: "absolute", left: 0, right: 0, top: 0 }}>
              {visibleArticles.map((article) => {
                const isSelected = selectedArticleId === article.id;
                const isUnread = !article.isRead;
                const articleSignal = classifyArticleSignal(article);
                const isBreaking = articleSignal.isBreaking;
                const impactScore = getScore(article.id)?.impactScore ?? 0;
                return (
                  <div
                    key={article.id}
                    id={`article-row-${article.id}`}
                    role="option"
                    aria-selected={isSelected}
                    aria-label={`${article.title} — ${article.sourceName}, ${timeAgo(article.publishedAt)} 전${isUnread ? ", 읽지 않음" : ""}`}
                    className={[
                      "article-row",
                      `article-row-${density}`,
                      isSelected ? "is-selected" : "",
                      isUnread ? "is-unread" : "is-read",
                      isBreaking ? "is-breaking" : "",
                      newIds.has(article.id) ? "is-new" : "",
                    ].filter(Boolean).join(" ")}
                    onClick={() => onSelectArticle(article)}
                    onContextMenu={(e) => handleContextMenu(e, article)}
                    style={{ height: rowHeight }}
                    onMouseEnter={(e) => handleRowMouseEnter(e, article)}
                    onMouseLeave={handleRowMouseLeave}
                  >
                    <div className="article-row-body">
                      {/* Metadata first, headline second — the arrangement a
                          wire reader scans fastest: who filed it and when, then
                          what it says. */}
                      <div className="article-row-meta">
                        {isUnread && <span className="article-unread-marker" aria-hidden="true" />}
                        <span
                          className="article-row-source"
                          style={{ "--source-color": sourceColor(article.sourceName) } as React.CSSProperties}
                        >
                          {article.sourceName}
                        </span>
                        {isBreaking && <span className="article-breaking-badge">속보</span>}
                        {articleSignal.tier === "critical" && (
                          <span
                            className="article-signal-badge"
                            title={`거시경제 신호 ${articleSignal.score}점 · ${articleSignal.reasons.join(", ")}`}
                          >
                            S{articleSignal.score}
                          </span>
                        )}
                        {(() => {
                          const cov = coverage.get(article.id);
                          if (!cov) return null;
                          return (
                            <span
                              className="article-row-coverage"
                              title={`같은 사안 보도: ${cov.names.join(", ")}`}
                            >
                              {cov.outlets}개 매체
                            </span>
                          );
                        })()}
                        <span className="article-row-metaspacer" />
                        {impactScore > 0 && (
                          <span className="article-row-impact" title={`영향도 ${impactScore}`}>
                            {impactScore}
                          </span>
                        )}
                        <span className="article-row-time">{timeAgo(article.publishedAt)} 전</span>
                      </div>

                      <p className="article-row-title">{article.title}</p>

                      {density === "comfortable" && article.tags.length > 0 && (
                        <div className="article-row-tags">
                          {article.tags.slice(0, 3).map((tag) => {
                            if (tag === "속보") return null;
                            const color = TAG_COLORS[tag] || "#64748b";
                            return (
                              <button
                                key={tag}
                                onClick={(e) => { e.stopPropagation(); onTagClick?.(tag); }}
                                className="article-row-tag"
                                style={{ "--tag-color": color } as React.CSSProperties}
                              >
                                {tag}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {loading && articles.length > 0 && (
          <div className="article-list-loading" aria-label="기사 불러오는 중">
            <LoaderCircle size={19} className="animate-spin" />
          </div>
        )}
      </div>

      {/* Scroll to top */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="article-scroll-top"
          title="맨 위로"
          aria-label="기사 목록 맨 위로"
        >
          <ArrowUp size={14} />
        </button>
      )}

      {/* Hover peek preview */}
      {peek && (
        <PeekPopover article={peek.article} position={{ x: peek.x, y: peek.y }} />
      )}

      {/* Context Menu */}
      {ctxMenu.visible && ctxMenu.article && (
        <div
          ref={ctxMenuRef}
          className="ctx-menu"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
        >
          {ctxActions.map((item, i) =>
            "type" in item && item.type === "divider" ? (
              <div key={i} className="ctx-menu-divider" />
            ) : (
              <button
                key={i}
                className="ctx-menu-item"
                onClick={"action" in item ? item.action : undefined}
              >
                {"label" in item ? item.label : ""}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
