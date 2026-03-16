"use client";

import { useState, useEffect, useCallback } from "react";
import type { Article, ArticleInsight } from "@/types";

interface InsightPanelProps {
  article: Article;
}

export function InsightPanel({ article }: InsightPanelProps) {
  const [insight, setInsight] = useState<ArticleInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset when article changes
  useEffect(() => {
    setInsight(null);
    setError(null);
    setLoading(false);
  }, [article.id]);

  // Auto-check cache on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/insights/article", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ articleId: article.id }),
          signal: AbortSignal.timeout(2000),
        });
        if (!cancelled && res.ok) {
          const data = await res.json();
          if (data.cached) setInsight(data.insight);
        }
      } catch {
        // Silently fail cache check
      }
    })();
    return () => { cancelled = true; };
  }, [article.id]);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/insights/article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId: article.id }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      const data = await res.json();
      setInsight(data.insight);
    } catch (err) {
      setError(err instanceof Error ? err.message : "분석 생성 실패");
    } finally {
      setLoading(false);
    }
  }, [article.id]);

  if (loading) {
    return (
      <div className="space-y-3 mt-4">
        <h3 className="section-label">AI 분석</h3>
        <div className="space-y-2">
          <div className="skeleton w-full h-4 rounded" />
          <div className="skeleton w-5/6 h-4 rounded" />
          <div className="skeleton w-4/6 h-4 rounded" />
          <div className="skeleton w-full h-4 rounded mt-3" />
          <div className="skeleton w-3/4 h-4 rounded" />
        </div>
        <p className="text-[10px] text-[var(--muted)] animate-pulse">분석 생성 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3 mt-4">
        <h3 className="section-label">AI 분석</h3>
        <div className="p-3 rounded-[var(--radius-sm)] bg-[#ef444415] border border-[#ef444430]">
          <p className="text-[11px] text-[#ef4444]">{error}</p>
        </div>
        <button
          onClick={generate}
          className="text-[11px] font-medium text-[var(--accent)] hover:underline"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (!insight) {
    return (
      <div className="mt-4">
        <button
          onClick={generate}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-[11px] font-semibold rounded-[var(--radius-sm)] metal-btn text-[var(--accent)] hover:bg-[var(--accent-surface)] transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          AI 분석 생성
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      <h3 className="section-label">AI 분석</h3>

      {/* Key Points */}
      <div>
        <h4 className="text-[10px] font-bold text-[var(--foreground-secondary)] uppercase tracking-wider mb-2">
          핵심 포인트
        </h4>
        <ul className="space-y-1.5">
          {insight.keyPoints.map((point, i) => (
            <li key={i} className="flex gap-2 text-[12px] leading-[1.6] text-[var(--foreground)]">
              <span className="text-[var(--accent)] font-bold shrink-0 mt-0.5">·</span>
              {point}
            </li>
          ))}
        </ul>
      </div>

      {/* Market Impact */}
      <div>
        <h4 className="text-[10px] font-bold text-[var(--foreground-secondary)] uppercase tracking-wider mb-2">
          시장 영향
        </h4>
        <p className="text-[12px] leading-[1.7] text-[var(--foreground)]">
          {insight.marketImpact}
        </p>
      </div>

      {/* Context */}
      <div>
        <h4 className="text-[10px] font-bold text-[var(--foreground-secondary)] uppercase tracking-wider mb-2">
          거시경제 맥락
        </h4>
        <p className="text-[12px] leading-[1.7] text-[var(--foreground)]">
          {insight.context}
        </p>
      </div>
    </div>
  );
}
