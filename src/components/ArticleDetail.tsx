"use client";

import { useState, useCallback } from "react";
import type { Article } from "@/types";

interface ArticleDetailProps {
  article: Article | null;
  onToggleRead: (article: Article) => void;
  onToggleSave: (article: Article) => void;
  onTagClick?: (tag: string) => void;
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

export function ArticleDetail({
  article,
  onToggleRead,
  onToggleSave,
  onTagClick,
}: ArticleDetailProps) {
  const [toast, setToast] = useState<string | null>(null);
  const [toastExiting, setToastExiting] = useState(false);

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

  if (!article) {
    return (
      <aside className="w-[440px] shrink-0 bg-[var(--surface-flat)] border-l border-[var(--border)] flex flex-col items-center justify-center gap-4 select-none">
        <div className="w-16 h-16 rounded-2xl bg-[var(--background)] flex items-center justify-center">
          <svg className="w-8 h-8 text-[var(--border-strong)] opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-[13px] text-[var(--foreground-secondary)] font-medium">기사를 선택하세요</p>
          <p className="text-[11px] text-[var(--muted)] mt-1">↑↓ 또는 j/k로 이동</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-[440px] shrink-0 bg-[var(--surface-flat)] border-l border-[var(--border)] flex flex-col overflow-hidden relative">
      {/* Header */}
      <div className="p-5 pb-4 border-b border-[var(--border)] metal-header">
        {/* Status badges */}
        <div className="flex items-center gap-1.5 mb-3">
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
          <span className="text-[10px] text-[var(--muted)] ml-auto tabular-nums font-medium">
            {timeAgo(article.publishedAt)}
          </span>
        </div>

        {/* Title */}
        <h2 className="text-[15px] font-bold leading-[1.45] text-[var(--foreground-bright)] mb-3">
          {article.title}
        </h2>

        {/* Meta row */}
        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-[var(--accent)] font-semibold">{article.sourceName}</span>
          <span className="text-[var(--border-strong)]">·</span>
          <span className="text-[var(--muted)] tabular-nums">
            {formatDate(article.publishedAt)} {formatTime(article.publishedAt)}
          </span>
        </div>

        {/* Tags */}
        {article.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {article.tags.map((tag) => {
              const color = TAG_COLORS[tag] || "#475569";
              return (
                <button
                  key={tag}
                  style={{ color }}
                  className="text-[10px] font-semibold hover:underline cursor-pointer"
                  onClick={() => onTagClick?.(tag)}
                  title={`"${tag}" 태그로 필터`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="flex-1 overflow-y-auto p-5">
        {article.summary ? (
          <div className="space-y-3">
            <h3 className="text-[10px] uppercase tracking-[0.1em] text-[var(--muted)] font-semibold">
              요약
            </h3>
            <p className="text-[13px] leading-[1.7] text-[var(--foreground)]">
              {article.summary}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-28 gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--background)] flex items-center justify-center">
              <svg className="w-5 h-5 text-[var(--border-strong)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
              </svg>
            </div>
            <p className="text-[11px] text-[var(--muted)]">
              요약 정보가 없습니다
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-[var(--border)] metal-header flex gap-2">
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 py-2 text-[11px] font-semibold metal-btn !border-[var(--accent)] text-[var(--accent)] rounded-[var(--radius-sm)]"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          원문 보기
        </a>
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
    </aside>
  );
}
