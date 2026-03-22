"use client";

import { useState, useCallback } from "react";

interface ArticleSummaryProps {
  title: string;
  summary: string | null;
  url: string;
}

interface SummaryResult {
  keyPoints: string[];
  source: string;
}

export function ArticleSummary({ title, summary, url }: ArticleSummaryProps) {
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const generateSummary = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, summary, url }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult({ keyPoints: data.keyPoints, source: data.source });
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [title, summary, url]);

  if (result) {
    return (
      <div className="mt-3 p-3 rounded-[var(--radius-md)] bg-[var(--accent-surface)] border border-[var(--border-accent)]">
        <div className="flex items-center gap-1.5 mb-2">
          <svg className="w-3.5 h-3.5 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <span className="text-[10px] font-bold text-[var(--accent)]">핵심 요약</span>
          <span className="text-[8px] text-[var(--muted)] ml-auto">
            {result.source === "meta" ? "페이지 메타데이터" : result.source === "rss" ? "RSS 피드" : ""}
          </span>
        </div>
        <ul className="space-y-1.5">
          {result.keyPoints.map((point, i) => (
            <li key={i} className="text-[11px] text-[var(--foreground)] leading-relaxed flex gap-2">
              <span className="text-[var(--accent)] font-bold shrink-0 mt-0.5">{i + 1}.</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <button
      onClick={generateSummary}
      disabled={loading}
      className="mt-2 metal-btn px-3 py-1.5 text-[10px] font-semibold text-[var(--accent)] flex items-center gap-1.5"
    >
      {loading ? (
        <>
          <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          요약 생성 중...
        </>
      ) : error ? (
        <>
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          다시 시도
        </>
      ) : (
        <>
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          AI 요약 생성
        </>
      )}
    </button>
  );
}
