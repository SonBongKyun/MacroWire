"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import type { Article } from "@/types";
import { analyzeSentiment } from "@/lib/sentiment/sentiment";
import { RelatedArticles } from "@/components/RelatedArticles";
import { ArticleSummary } from "@/components/ArticleSummary";
import { TAG_COLORS } from "@/lib/constants/colors";
import { useArticleNotes } from "@/hooks/useArticleNotes";
import { generateSmartSummary } from "@/lib/ai/summarizer";
import type { SmartSummary } from "@/lib/ai/summarizer";

interface ArticleDetailProps {
  article: Article | null;
  onToggleRead: (article: Article) => void;
  onToggleSave: (article: Article) => void;
  onTagClick?: (tag: string) => void;
  collectionName?: string;
  collectionNames?: string[];
  onCollectionChange?: (articleId: string, name: string) => void;
  onCreateCollection?: (name: string) => void;
  articles?: Article[];
  onSelectArticle?: (article: Article) => void;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금";
  if (mins < 60) return `${mins}분 전`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}시간 전`;
  return `${Math.floor(hrs / 24)}일 전`;
}

/** Estimate reading time in minutes based on Korean text */
function estimateReadingTime(text: string): number {
  // Korean reading speed ~500 chars/min; English ~200 words/min
  const koreanChars = (text.match(/[\uac00-\ud7a3]/g) || []).length;
  const words = text.split(/\s+/).filter(Boolean).length;
  const koreanMins = koreanChars / 500;
  const englishMins = (words - koreanChars * 0.5) / 200;
  return Math.max(1, Math.round(koreanMins + Math.max(0, englishMins)));
}

export function ArticleDetail({
  article,
  onToggleRead,
  onToggleSave,
  onTagClick,
  collectionName = "",
  collectionNames = [],
  onCollectionChange,
  onCreateCollection,
  articles = [],
  onSelectArticle,
}: ArticleDetailProps) {
  const [toast, setToast] = useState<string | null>(null);
  const [toastExiting, setToastExiting] = useState(false);
  const [newCollectionInput, setNewCollectionInput] = useState("");
  const [readProgress, setReadProgress] = useState(0);
  const [notesOpen, setNotesOpen] = useState(false);
  const [highlightInput, setHighlightInput] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Article notes hook
  const articleNotes = useArticleNotes();
  const currentNote = article ? articleNotes.getNote(article.id) : null;
  const noteText = currentNote?.text || "";
  const highlights = currentNote?.highlights || [];

  const setNoteText = useCallback(
    (text: string) => {
      if (article) articleNotes.saveNote(article.id, text);
    },
    [article, articleNotes]
  );

  // ESC to close fullscreen
  useEffect(() => {
    if (!fullscreen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [fullscreen]);

  // Reset scroll on article change
  useEffect(() => {
    setReadProgress(0);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [article?.id]);

  const hasNote = noteText.trim().length > 0 || highlights.length > 0;

  // Count articles per tag for tooltip
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of articles) {
      for (const t of a.tags) {
        counts[t] = (counts[t] || 0) + 1;
      }
    }
    return counts;
  }, [articles]);

  // Auto-generate smart summary for selected article
  const smartSummary: SmartSummary | null = useMemo(() => {
    if (!article) return null;
    return generateSmartSummary(article);
  }, [article]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const pct = el.scrollHeight - el.clientHeight;
    setReadProgress(pct > 0 ? Math.min(1, el.scrollTop / pct) : 0);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setToastExiting(false);
    setTimeout(() => {
      setToastExiting(true);
      setTimeout(() => setToast(null), 200);
    }, 1500);
  }, []);

  const copyUrl = useCallback(() => {
    if (!article) return;
    navigator.clipboard.writeText(article.url).then(() => {
      showToast("URL이 복사되었습니다");
    });
  }, [article, showToast]);

  const copyTitleAndUrl = useCallback(() => {
    if (!article) return;
    const text = `${article.title}\n${article.url}`;
    navigator.clipboard.writeText(text).then(() => {
      showToast("제목 + URL이 복사되었습니다");
    });
  }, [article, showToast]);

  const shareArticle = useCallback(() => {
    if (!article) return;
    const text = `${article.title}\n${article.url}\n\nvia MacroWire`;
    navigator.clipboard.writeText(text).then(() => {
      showToast("공유 텍스트가 복사되었습니다");
    });
  }, [article, showToast]);

  if (!article) {
    return (
      <aside className="shrink-0 bg-[#0D0D0F] flex flex-col items-center justify-center gap-4 select-none" style={{ width: "100%", height: "100%" }}>
        <div style={{ opacity: 0.3 }}>
          <svg style={{ width: 40, height: 40, color: "#8C8C91" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
        </div>
        <div style={{ textAlign: "center", padding: "0 32px" }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#EBEBEB" }}>기사를 선택하세요</p>
          <p style={{ fontSize: 11, color: "#8C8C91", marginTop: 8, lineHeight: 1.6 }}>
            왼쪽 목록에서 기사를 클릭하거나
          </p>
          <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 8 }}>
            <kbd style={{ fontSize: 9, fontFamily: "var(--font-mono)", padding: "2px 6px", border: "1px solid #2D2D32", borderRadius: 2, color: "#8C8C91" }}>j</kbd>
            <kbd style={{ fontSize: 9, fontFamily: "var(--font-mono)", padding: "2px 6px", border: "1px solid #2D2D32", borderRadius: 2, color: "#8C8C91" }}>k</kbd>
            <span style={{ fontSize: 10, color: "#8C8C91" }}>키로 이동</span>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside key={article.id} className="shrink-0 bg-[#0D0D0F] flex flex-col overflow-hidden relative detail-enter" style={{ width: "100%", height: "100%", borderTop: "2px solid #C9A96E" }}>
      {/* Reading progress bar */}
      <div className="reading-progress" style={{ width: `${readProgress * 100}%` }} />

      {/* Header */}
      <div className="p-5 pb-4 border-b border-[var(--border)]">
        {/* Source badge */}
        <div className="flex items-center gap-2.5 mb-3">
          <div className="source-badge">
            <span className="source-badge-initial">{article.sourceName.charAt(0).toUpperCase()}</span>
            <span className="source-badge-name">{article.sourceName}</span>
          </div>
          <div className="flex-1" />
          {/* Status badges */}
          <div className="flex items-center gap-1.5">
            {(() => {
              const s = analyzeSentiment(article.title, article.summary);
              return (
                <span
                  className="text-[9px] font-semibold px-1.5 py-0.5 rounded-[2px]"
                  style={{ color: s.color, backgroundColor: `${s.color}18` }}
                >
                  {s.label}
                </span>
              );
            })()}
            {article.isRead && (
              <span className="text-[9px] font-semibold text-[var(--muted)]">
                읽음
              </span>
            )}
            {article.isSaved && (
              <span className="text-[9px] font-semibold text-[var(--accent)]">
                ★ 저장됨
              </span>
            )}
            {hasNote && (
              <span className="text-[9px] font-semibold text-[var(--foreground-secondary)]">
                메모
              </span>
            )}
            <span className="reading-time-badge">
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {estimateReadingTime((article.title || "") + " " + (article.summary || ""))}분
            </span>
          </div>
        </div>

        {/* Reading progress indicator */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] text-[var(--muted)] tabular-nums font-medium flex items-center gap-2 ml-auto">
            {readProgress > 0 && readProgress < 1 && (
              <span className="text-[9px] text-[var(--accent)] font-semibold">{Math.round(readProgress * 100)}%</span>
            )}
            {readProgress >= 1 && (
              <span className="text-[9px] text-[var(--success)] font-semibold flex items-center gap-0.5">
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                완독
              </span>
            )}
            {timeAgo(article.publishedAt)}
          </span>
        </div>

        {/* Title */}
        <h2 className="text-[18px] font-heading font-extrabold leading-[1.45] text-[var(--foreground-bright)] mb-3 tracking-[-0.01em]" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>
          {article.title}
        </h2>

        {/* Meta row */}
        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-[var(--muted)] tabular-nums">
            {formatDate(article.publishedAt)} {formatTime(article.publishedAt)}
          </span>
        </div>

        {/* Tags */}
        {article.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {article.tags.map((tag) => {
              const color = TAG_COLORS[tag] || "#475569";
              return (
                <button
                  key={tag}
                  className="tag-pill tag-pill-lg"
                  style={{ color, backgroundColor: `${color}15`, borderColor: `${color}30` }}
                  onClick={() => onTagClick?.(tag)}
                  title={`${tag} — ${tagCounts[tag] || 0}건`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="flex-1 overflow-y-auto p-5" ref={scrollRef} onScroll={handleScroll}>
        {article.summary ? (
          <div className="space-y-4">
            <h3 className="section-label">
              요약
            </h3>
            <p className="article-summary text-[13px] leading-[1.8] text-[var(--foreground)] selection:bg-[var(--accent-surface)]">
              {article.summary}
            </p>
            <ArticleSummary title={article.title} summary={article.summary} url={article.url} />

            {/* AI Smart Summary */}
            {smartSummary && (
              <div style={{ marginTop: 12 }}>
                <div style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#C9A96E",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase" as const,
                  marginBottom: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#C9A96E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                  </svg>
                  AI 분석
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
                  {/* Key Entities */}
                  {smartSummary.keyEntities.length > 0 && smartSummary.keyEntities.map((entity) => (
                    <span
                      key={entity}
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: "#C9A96E",
                        border: "1px solid rgba(201,169,110,0.3)",
                        padding: "1px 6px",
                        background: "rgba(201,169,110,0.06)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {entity}
                    </span>
                  ))}

                  {/* Impact Level Badge */}
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      padding: "2px 6px",
                      color: smartSummary.impactLevel === "high" ? "#0D0D0F" : smartSummary.impactLevel === "medium" ? "#EBEBEB" : "#8C8C91",
                      background: smartSummary.impactLevel === "high" ? "#C9A96E" : smartSummary.impactLevel === "medium" ? "#2D2D32" : "rgba(45,45,50,0.5)",
                      textTransform: "uppercase" as const,
                    }}
                  >
                    {smartSummary.impactLevel === "high" ? "HIGH" : smartSummary.impactLevel === "medium" ? "MED" : "LOW"}
                  </span>

                  {/* Sentiment Indicator */}
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, color: "#8C8C91" }}>
                    <span style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: smartSummary.sentiment === "positive" ? "#22c55e" : smartSummary.sentiment === "negative" ? "#ef4444" : "#94a3b8",
                    }} />
                    {smartSummary.sentiment === "positive" ? "긍정" : smartSummary.sentiment === "negative" ? "부정" : "중립"}
                  </span>
                </div>

                {/* Related Topics */}
                {smartSummary.relatedTopics.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                    {smartSummary.relatedTopics.map((topic) => (
                      <button
                        key={topic}
                        onClick={() => onTagClick?.(topic)}
                        style={{
                          fontSize: 9,
                          color: "#8C8C91",
                          background: "rgba(140,140,145,0.08)",
                          border: "none",
                          padding: "1px 5px",
                          cursor: "pointer",
                        }}
                      >
                        #{topic}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="detail-divider mt-4" />
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[9px] text-[var(--muted)] font-medium">발행일</span>
              <span className="text-[10px] text-[var(--foreground-secondary)] tabular-nums">
                {formatDate(article.publishedAt)} {formatTime(article.publishedAt)}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-28 gap-3">
            <div className="empty-state-icon" style={{ width: 40, height: 40, borderRadius: 12 }}>
              <svg className="w-5 h-5 text-[var(--border-strong)] opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
              </svg>
            </div>
            <p className="text-[11px] text-[var(--muted)]">
              요약 정보가 없습니다
            </p>
            <ArticleSummary title={article.title} summary={article.summary} url={article.url} />
          </div>
        )}

        {/* Notes & Highlights section */}
        <div className="mt-4">
          <button
            onClick={() => setNotesOpen((v) => !v)}
            className="flex items-center gap-1.5 w-full text-left group"
          >
            <svg className={`w-2.5 h-2.5 text-[var(--muted)] transition-transform ${notesOpen ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            <span className="section-label" style={{ marginBottom: 0 }}>메모 &amp; 하이라이트</span>
            {hasNote && (
              <span className="text-[9px] text-[var(--accent)] font-semibold">
                {(noteText.trim() ? 1 : 0) + highlights.length}
              </span>
            )}
          </button>
          {notesOpen && (
            <div className="mt-2 space-y-3">
              <textarea
                rows={3}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="이 기사에 대한 메모..."
                className="w-full bg-[var(--surface-active)] border border-[var(--border)] px-3 py-2 text-[12px] text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent-light)] resize-none metal-inset"
                style={{ fontSize: 12 }}
              />

              {/* Highlights */}
              {highlights.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[9px] font-bold text-[var(--muted)] uppercase tracking-wider">하이라이트</span>
                  {highlights.map((h, i) => (
                    <div
                      key={i}
                      className="relative pl-3 py-2 pr-7 text-[11px] leading-[1.7] text-[var(--foreground-secondary)]"
                      style={{
                        borderLeft: "2px solid #C9A96E",
                        background: "rgba(201,169,110,0.06)",
                      }}
                    >
                      {h}
                      <button
                        onClick={() => article && articleNotes.removeHighlight(article.id, h)}
                        className="absolute top-1 right-1 w-4 h-4 flex items-center justify-center text-[var(--muted)] hover:text-[var(--danger)] text-[10px] transition-colors"
                        title="삭제"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add highlight input */}
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={highlightInput}
                  onChange={(e) => setHighlightInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && highlightInput.trim() && article) {
                      articleNotes.addHighlight(article.id, highlightInput.trim());
                      setHighlightInput("");
                    }
                  }}
                  placeholder="하이라이트 추가..."
                  className="flex-1 bg-[var(--surface-active)] border border-[var(--border)] px-2.5 py-1.5 text-[11px] text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent-light)] metal-inset"
                  style={{ fontSize: 11 }}
                />
                <button
                  onClick={() => {
                    if (highlightInput.trim() && article) {
                      articleNotes.addHighlight(article.id, highlightInput.trim());
                      setHighlightInput("");
                    }
                  }}
                  className="px-2 py-1.5 text-[10px] font-semibold metal-btn transition-colors"
                  style={{ color: "#C9A96E", borderColor: "rgba(201,169,110,0.3)" }}
                >
                  + 추가
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Related Articles (#7) */}
        {articles.length > 0 && onSelectArticle && (
          <RelatedArticles
            article={article}
            articles={articles}
            onSelectArticle={onSelectArticle}
          />
        )}
      </div>

      {/* Collection picker (when article is saved) */}
      {article.isSaved && onCollectionChange && (
        <div className="px-4 py-2.5 border-t border-[var(--border-subtle)] bg-[var(--accent-surface)]">
          <div className="flex items-center gap-2">
            <svg className="w-3 h-3 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <select
              value={collectionName}
              onChange={(e) => onCollectionChange(article.id, e.target.value)}
              className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-[var(--radius-sm)] px-2 py-1 text-[10px] text-[var(--foreground)] focus:outline-none focus:border-[var(--accent-light)] metal-inset"
            >
              <option value="">분류 없음</option>
              {collectionNames.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={newCollectionInput}
                onChange={(e) => setNewCollectionInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newCollectionInput.trim()) {
                    onCreateCollection?.(newCollectionInput.trim());
                    onCollectionChange(article.id, newCollectionInput.trim());
                    setNewCollectionInput("");
                  }
                }}
                placeholder="새 컬렉션…"
                className="w-20 bg-[var(--background)] border border-[var(--border)] rounded-[var(--radius-sm)] px-2 py-1 text-[10px] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent-light)] metal-inset"
              />
              <button
                onClick={() => {
                  if (newCollectionInput.trim()) {
                    onCreateCollection?.(newCollectionInput.trim());
                    onCollectionChange(article.id, newCollectionInput.trim());
                    setNewCollectionInput("");
                  }
                }}
                className="w-6 h-6 flex items-center justify-center rounded-[var(--radius-sm)] metal-btn text-[var(--muted)] hover:text-[var(--accent)] text-xs"
                title="컬렉션 추가"
              >
                +
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="p-4 border-t border-[var(--border)] flex gap-2 bg-[var(--surface)]">
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 py-2.5 text-[11px] font-bold btn-primary"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          원문 보기
        </a>
        {/* Fullscreen reading mode */}
        <button
          onClick={() => setFullscreen(true)}
          className="px-3 py-2 text-[11px] font-medium rounded-[var(--radius-sm)] metal-btn text-[var(--muted)] hover:text-[var(--foreground)]"
          title="전체 화면"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
          </svg>
        </button>
        {/* Copy URL */}
        <button
          onClick={copyUrl}
          className="px-3 py-2 text-[11px] font-medium rounded-[var(--radius-sm)] metal-btn text-[var(--muted)] hover:text-[var(--foreground)]"
          title="URL 복사"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </button>
        {/* Copy title + URL */}
        <button
          onClick={copyTitleAndUrl}
          className="px-3 py-2 text-[11px] font-medium rounded-[var(--radius-sm)] metal-btn text-[var(--muted)] hover:text-[var(--foreground)]"
          title="제목 + URL 복사"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
          </svg>
        </button>
        {/* Share */}
        <button
          onClick={shareArticle}
          className="px-3 py-2 text-[11px] font-medium rounded-[var(--radius-sm)] metal-btn text-[var(--muted)] hover:text-[var(--foreground)]"
          title="공유"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        </button>
        <button
          onClick={() => onToggleRead(article)}
          className={`px-3 py-2 text-[11px] font-medium rounded-[var(--radius-sm)] metal-btn transition-colors ${
            article.isRead
              ? "text-[var(--muted)] hover:text-[var(--foreground)]"
              : "!border-[var(--accent)] text-[var(--accent)]"
          }`}
          title={article.isRead ? "읽지 않음으로 표시" : "읽음으로 표시"}
        >
          {article.isRead ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 19V5a2 2 0 012-2h14a2 2 0 012 2v14l-3.5-2L14 19l-2.5-2L9 19l-2.5-2L3 19z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
        <button
          onClick={() => onToggleSave(article)}
          className={`px-3 py-2 text-sm font-medium rounded-[var(--radius-sm)] metal-btn transition-colors ${
            article.isSaved
              ? "!border-[var(--accent)] text-[var(--accent)]"
              : "text-[var(--muted)] hover:text-[var(--accent)] hover:!border-[var(--accent)]"
          }`}
          title={article.isSaved ? "저장 해제" : "저장"}
        >
          {article.isSaved ? "★" : "☆"}
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`absolute bottom-16 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-[var(--radius-md)] bg-[var(--foreground-bright)] text-white text-[11px] font-medium shadow-lg ${toastExiting ? "toast-exit" : "toast-enter"}`}>
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-[var(--success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {toast}
          </div>
        </div>
      )}

      {/* Fullscreen reading overlay */}
      {fullscreen && (
        <div
          className="fullscreen-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setFullscreen(false); }}
        >
          <div className="fullscreen-reader">
            {/* Close button */}
            <button
              onClick={() => setFullscreen(false)}
              className="fullscreen-close"
              title="닫기 (ESC)"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Source badge */}
            <div className="flex items-center gap-2.5 mb-5">
              <div className="source-badge">
                <span className="source-badge-initial">{article.sourceName.charAt(0).toUpperCase()}</span>
                <span className="source-badge-name">{article.sourceName}</span>
              </div>
              <span className="text-[12px] text-[var(--muted)] tabular-nums">
                {formatDate(article.publishedAt)} {formatTime(article.publishedAt)}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-[24px] font-heading font-extrabold leading-[1.4] text-[var(--foreground-bright)] mb-4 tracking-[-0.02em]">
              {article.title}
            </h1>

            {/* Tags */}
            {article.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {article.tags.map((tag) => {
                  const color = TAG_COLORS[tag] || "#475569";
                  return (
                    <span
                      key={tag}
                      className="tag-pill tag-pill-lg"
                      style={{ color, backgroundColor: `${color}15`, borderColor: `${color}30` }}
                    >
                      {tag}
                    </span>
                  );
                })}
              </div>
            )}

            <div className="detail-divider mb-6" />

            {/* Summary */}
            {article.summary && (
              <div className="mb-6">
                <h3 className="section-label mb-3">요약</h3>
                <p className="text-[13px] leading-[1.8] text-[var(--foreground)] selection:bg-[var(--accent-surface)]">
                  {article.summary}
                </p>
              </div>
            )}

            {/* Actions at bottom */}
            <div className="detail-divider mb-5" />
            <div className="flex gap-2">
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-[12px] font-bold btn-primary"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                원문 보기
              </a>
              <button
                onClick={copyUrl}
                className="px-4 py-2 text-[12px] font-medium rounded-[var(--radius-sm)] metal-btn text-[var(--muted)] hover:text-[var(--foreground)]"
                title="URL 복사"
              >
                URL 복사
              </button>
              <button
                onClick={shareArticle}
                className="px-4 py-2 text-[12px] font-medium rounded-[var(--radius-sm)] metal-btn text-[var(--muted)] hover:text-[var(--foreground)]"
                title="공유"
              >
                공유
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
