"use client";

import { useState, useCallback } from "react";
import type { Article, ConnectionsInsight } from "@/types";

interface ConnectionsViewProps {
  articles: Article[];
}

export function ConnectionsView({ articles }: ConnectionsViewProps) {
  const [insight, setInsight] = useState<ConnectionsInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/insights/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articles }),
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
  }, [articles]);

  if (loading) {
    return (
      <div className="space-y-3">
        <h3 className="section-label">연결 고리</h3>
        <div className="space-y-2">
          <div className="skeleton w-full h-12 rounded" />
          <div className="skeleton w-full h-12 rounded" />
        </div>
        <p className="text-[10px] text-[var(--muted)] animate-pulse">인과관계 분석 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <h3 className="section-label">연결 고리</h3>
        <div className="p-3 rounded-[var(--radius-sm)] bg-[#ef444415] border border-[#ef444430]">
          <p className="text-[11px] text-[#ef4444]">{error}</p>
        </div>
        <button onClick={generate} className="text-[11px] text-[var(--accent)] hover:underline">
          다시 시도
        </button>
      </div>
    );
  }

  if (!insight) {
    return (
      <div>
        <button
          onClick={generate}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-[11px] font-semibold rounded-[var(--radius-sm)] metal-btn text-[var(--accent)] hover:bg-[var(--accent-surface)] transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          인과관계 분석
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="section-label">연결 고리</h3>

      {/* Chains */}
      {insight.chains.map((chain, i) => (
        <div key={i} className="space-y-2">
          {/* Visual chain */}
          <div className="flex items-center flex-wrap gap-1">
            {chain.nodes.map((node, j) => (
              <div key={j} className="flex items-center gap-1">
                <span className="inline-block px-2.5 py-1.5 text-[11px] font-semibold rounded-[var(--radius-sm)] bg-[var(--accent-surface)] text-[var(--accent)] border border-[var(--accent)]">
                  {node}
                </span>
                {j < chain.nodes.length - 1 && (
                  <span className="flex items-center gap-0.5 text-[9px] text-[var(--muted)]">
                    <span className="text-[var(--border-strong)]">—</span>
                    <span className="font-medium text-[var(--foreground-secondary)]">
                      {chain.relations[j] || "→"}
                    </span>
                    <span className="text-[var(--border-strong)]">→</span>
                  </span>
                )}
              </div>
            ))}
          </div>
          {/* Narrative */}
          <p className="text-[11px] leading-[1.6] text-[var(--muted)] pl-1">
            {chain.narrative}
          </p>
        </div>
      ))}

      {/* Summary */}
      <div className="detail-divider" />
      <p className="text-[12px] leading-[1.7] text-[var(--foreground)]">
        {insight.summary}
      </p>
    </div>
  );
}
