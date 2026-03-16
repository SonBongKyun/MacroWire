"use client";

import { useState, useCallback } from "react";
import type { Article, ClusterInsight as ClusterInsightType } from "@/types";

interface ClusterInsightProps {
  clusterId: string;
  articles: Article[];
  label: string;
}

export function ClusterInsight({ clusterId, articles, label }: ClusterInsightProps) {
  const [insight, setInsight] = useState<ClusterInsightType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/insights/cluster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articles, clusterId, clusterLabel: label }),
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
  }, [articles, clusterId, label]);

  if (loading) {
    return (
      <div className="px-8 py-3 border-b border-[var(--border-subtle)] bg-[var(--surface-flat)]">
        <div className="space-y-2">
          <div className="skeleton w-full h-3.5 rounded" />
          <div className="skeleton w-5/6 h-3.5 rounded" />
          <div className="skeleton w-3/4 h-3.5 rounded" />
        </div>
        <p className="text-[10px] text-[var(--muted)] mt-2 animate-pulse">클러스터 분석 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-8 py-3 border-b border-[var(--border-subtle)] bg-[var(--surface-flat)]">
        <p className="text-[10px] text-[#ef4444]">{error}</p>
        <button onClick={generate} className="text-[10px] text-[var(--accent)] hover:underline mt-1">
          다시 시도
        </button>
      </div>
    );
  }

  if (!insight) {
    return (
      <div className="px-8 py-2 border-b border-[var(--border-subtle)]">
        <button
          onClick={generate}
          className="flex items-center gap-1.5 text-[10px] font-semibold text-[var(--accent)] hover:underline"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          클러스터 AI 분석
        </button>
      </div>
    );
  }

  return (
    <div className="px-8 py-3 border-b border-[var(--border-subtle)] bg-[var(--surface-flat)] space-y-3">
      {/* Synthesis */}
      <div>
        <h4 className="text-[9px] font-bold text-[var(--accent)] uppercase tracking-wider mb-1">종합 분석</h4>
        <p className="text-[11px] leading-[1.65] text-[var(--foreground)]">{insight.synthesis}</p>
      </div>

      {/* Media Tones */}
      {insight.mediaTones.length > 0 && (
        <div>
          <h4 className="text-[9px] font-bold text-[var(--accent)] uppercase tracking-wider mb-1">매체별 논조</h4>
          <div className="space-y-1">
            {insight.mediaTones.map((mt, i) => (
              <div key={i} className="flex gap-2 text-[10px]">
                <span className="font-semibold text-[var(--foreground-secondary)] shrink-0">{mt.source}</span>
                <span className="text-[var(--muted)]">{mt.tone}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Consensus & Divergence */}
      <div className="flex gap-3">
        <div className="flex-1">
          <h4 className="text-[9px] font-bold text-[#22c55e] uppercase tracking-wider mb-1">합의</h4>
          <p className="text-[10px] leading-[1.5] text-[var(--foreground)]">{insight.consensus}</p>
        </div>
        <div className="flex-1">
          <h4 className="text-[9px] font-bold text-[#ef4444] uppercase tracking-wider mb-1">분기</h4>
          <p className="text-[10px] leading-[1.5] text-[var(--foreground)]">{insight.divergence}</p>
        </div>
      </div>

      {/* Outlook */}
      <div>
        <h4 className="text-[9px] font-bold text-[var(--foreground-secondary)] uppercase tracking-wider mb-1">전망</h4>
        <p className="text-[10px] leading-[1.5] text-[var(--foreground)]">{insight.outlook}</p>
      </div>
    </div>
  );
}
