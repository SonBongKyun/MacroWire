"use client";

import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import type { Article } from "@/types";
import { TAG_COLORS } from "@/lib/constants/colors";
import { useArticleScoring } from "@/hooks/useArticleScoring";
import { PeekPopover } from "@/components/PeekPopover";
import { EmptyState } from "@/components/EmptyState";

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
}

const ROW_HEIGHT = 56;
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

function SkeletonRow() {
  return (
    <div style={{ padding: "10px 16px", borderBottom: "1px solid #2D2D32" }}>
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
  const totalHeight = filteredArticles.length * ROW_HEIGHT;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER_COUNT);
  const visibleCount = Math.ceil(containerHeight / ROW_HEIGHT) + 2 * BUFFER_COUNT;
  const endIndex = Math.min(filteredArticles.length, startIndex + visibleCount);
  const visibleArticles = filteredArticles.slice(startIndex, endIndex);
  const offsetY = startIndex * ROW_HEIGHT;

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
        const itemTop = next * ROW_HEIGHT;
        const el = listRef.current;
        if (el) {
          if (itemTop < el.scrollTop) {
            el.scrollTop = itemTop;
          } else if (itemTop + ROW_HEIGHT > el.scrollTop + el.clientHeight) {
            el.scrollTop = itemTop + ROW_HEIGHT - el.clientHeight;
          }
        }
      } else if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        const prev = Math.max(idx - 1, 0);
        onSelectArticle(filteredArticles[prev]);
        const itemTop = prev * ROW_HEIGHT;
        const el = listRef.current;
        if (el) {
          if (itemTop < el.scrollTop) {
            el.scrollTop = itemTop;
          } else if (itemTop + ROW_HEIGHT > el.scrollTop + el.clientHeight) {
            el.scrollTop = itemTop + ROW_HEIGHT - el.clientHeight;
          }
        }
      } else if (e.key === "s" && idx >= 0) {
        e.preventDefault();
        onToggleSave(filteredArticles[idx]);
      }
    },
    [filteredArticles, selectedArticleId, onSelectArticle, onToggleSave]
  );

  return (
    <div
      className="flex-1 flex flex-col overflow-hidden focus:outline-none relative"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* List */}
      <div
        className="flex-1 overflow-y-auto"
        ref={listRef}
        onScroll={handleListScroll}
        style={{ backgroundColor: "#0D0D0F" }}
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
                const isBreaking = article.tags.includes("속보");
                return (
                  <div
                    key={article.id}
                    onClick={() => onSelectArticle(article)}
                    onContextMenu={(e) => handleContextMenu(e, article)}
                    style={{
                      height: ROW_HEIGHT,
                      padding: "10px 16px",
                      borderBottom: "1px solid #2D2D32",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      transition: "background-color 0.15s ease, border-color 0.15s ease",
                      background: isSelected
                        ? "linear-gradient(90deg, rgba(201,169,110,0.12) 0%, rgba(201,169,110,0.04) 30%, transparent 100%)"
                        : "transparent",
                      borderLeft: isSelected
                        ? "2px solid #C9A96E"
                        : isBreaking && isUnread
                        ? "2px solid rgba(239,68,68,0.65)"
                        : "2px solid transparent",
                      opacity: !isUnread && !isSelected ? 0.6 : 1,
                      boxSizing: "border-box",
                      overflow: "hidden",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) (e.currentTarget as HTMLElement).style.background = "rgba(235,235,235,0.04)";
                      handleRowMouseEnter(e, article);
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) (e.currentTarget as HTMLElement).style.background = "transparent";
                      handleRowMouseLeave();
                    }}
                  >
                    {/* Unread dot — red for 속보, gold otherwise */}
                    <div style={{ width: 5, paddingTop: 5, flexShrink: 0 }}>
                      {isUnread && (
                        <div style={{
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          backgroundColor: isBreaking ? "#ef4444" : "#C9A96E",
                          boxShadow: isBreaking
                            ? "0 0 6px rgba(239,68,68,0.5)"
                            : "0 0 6px rgba(201,169,110,0.4)",
                        }} />
                      )}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Title row with impact indicator */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {article.tags.includes("속보") && (
                          <span style={{
                            fontSize: 8,
                            fontWeight: 800,
                            color: "#fff",
                            background: "#ef4444",
                            padding: "1px 5px",
                            borderRadius: 1,
                            letterSpacing: "0.04em",
                            flexShrink: 0,
                            lineHeight: 1.6,
                            fontFamily: "var(--font-heading)",
                            animation: "pulse-dot 2s ease-in-out infinite",
                          }}>
                            속보
                          </span>
                        )}
                        <p style={{
                          fontSize: 14,
                          fontWeight: isUnread ? 500 : 400,
                          color: "#EBEBEB",
                          lineHeight: 1.4,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          margin: 0,
                          flex: 1,
                          minWidth: 0,
                        }}>
                          {article.title}
                        </p>
                        {(() => {
                          const score = getScore(article.id);
                          if (!score) return null;
                          const isHigh = score.impactScore > 70;
                          return (
                            <div
                              title={`Impact: ${score.impactScore}`}
                              style={{
                                width: 2,
                                height: 12,
                                flexShrink: 0,
                                borderRadius: 1,
                                backgroundColor: isHigh ? "#C9A96E" : "#8C8C91",
                                opacity: isHigh ? 1 : 0.4 + (score.impactScore / 100) * 0.6,
                                transition: "opacity 0.3s ease",
                              }}
                            />
                          );
                        })()}
                      </div>

                      {/* Tags row — neutral by default, category color on hover/active */}
                      {article.tags.length > 0 && (
                        <div style={{ display: "flex", gap: 4, marginTop: 5, flexWrap: "wrap" }}>
                          {article.tags.slice(0, 3).map((tag) => {
                            // Skip "속보" — already rendered as the prominent red pill before the title
                            if (tag === "속보") return null;
                            const color = TAG_COLORS[tag] || "#64748b";
                            return (
                              <button
                                key={tag}
                                onClick={(e) => { e.stopPropagation(); onTagClick?.(tag); }}
                                style={{
                                  fontSize: 9,
                                  fontWeight: 600,
                                  color: "#8C8C91",
                                  background: "transparent",
                                  border: "1px solid rgba(255,255,255,0.06)",
                                  padding: "1px 6px",
                                  borderRadius: 2,
                                  cursor: "pointer",
                                  lineHeight: 1.5,
                                  letterSpacing: "0.01em",
                                  transition: "color 0.15s ease, background 0.15s ease, border-color 0.15s ease",
                                }}
                                onMouseEnter={(e) => {
                                  const el = e.currentTarget as HTMLElement;
                                  el.style.color = color;
                                  el.style.background = `${color}14`;
                                  el.style.borderColor = `${color}30`;
                                }}
                                onMouseLeave={(e) => {
                                  const el = e.currentTarget as HTMLElement;
                                  el.style.color = "#8C8C91";
                                  el.style.background = "transparent";
                                  el.style.borderColor = "rgba(255,255,255,0.06)";
                                }}
                              >
                                {tag}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Right: source + time */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, flexShrink: 0 }}>
                      <span style={{ fontSize: 10, color: "#8C8C91", fontWeight: 400, whiteSpace: "nowrap" }}>
                        {article.sourceName}
                      </span>
                      <span style={{ fontSize: 10, color: "#8C8C91", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>
                        {timeAgo(article.publishedAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {loading && articles.length > 0 && (
          <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
            <svg style={{ width: 20, height: 20, color: "#C9A96E" }} className="animate-spin" fill="none" viewBox="0 0 24 24">
              <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          </div>
        )}
      </div>

      {/* Scroll to top */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          style={{
            position: "absolute",
            bottom: 16,
            right: 16,
            width: 28,
            height: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#2D2D32",
            border: "1px solid #2D2D32",
            borderRadius: 2,
            color: "#EBEBEB",
            cursor: "pointer",
          }}
          title="맨 위로"
        >
          <svg style={{ width: 14, height: 14 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
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
