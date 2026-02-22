"use client";

import { useMemo } from "react";
import type { Article } from "@/types";
import { computePulse } from "@/lib/analytics/pulse";

interface TodayPulseProps {
  articles: Article[];
}

export function TodayPulse({ articles }: TodayPulseProps) {
  const pulse = useMemo(() => computePulse(articles), [articles]);

  const stats = [
    { icon: "📰", label: "오늘 기사", value: pulse.todayCount, color: "var(--accent)" },
    { icon: "🇺🇸", label: "미국 관련", value: pulse.usCount, color: "#3b82f6" },
    { icon: "📈", label: "금리 관련", value: pulse.rateCount, color: "#f59e0b" },
    { icon: "💱", label: "환율 관련", value: pulse.fxCount, color: "#10b981" },
  ];

  const barColors = ["var(--accent)", "#3b82f6", "#10b981"];

  return (
    <aside className="w-[440px] shrink-0 bg-[var(--surface-flat)] border-l border-[var(--border)] flex flex-col overflow-hidden select-none">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--border)] metal-header">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center"
            style={{
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.25), 0 1px 3px rgba(0,0,0,0.12)",
            }}
          >
            <span className="text-white text-sm">📊</span>
          </div>
          <div>
            <h2 className="text-[13px] font-bold text-[var(--foreground-bright)]">
              Today Pulse
            </h2>
            <p className="text-[10px] text-[var(--muted)] mt-0.5">
              오늘의 매크로 동향 한눈에
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className="p-3.5 rounded-[var(--radius-md)] metal-surface"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base leading-none">{s.icon}</span>
                <span className="text-[10px] text-[var(--muted)] font-medium">
                  {s.label}
                </span>
              </div>
              <div
                className="text-[22px] font-bold tabular-nums leading-none"
                style={{ color: s.color }}
              >
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* Recent 1h highlight */}
        <div className="flex items-center gap-3 p-3.5 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--accent-surface)]">
          <span className="text-base">⏰</span>
          <div className="flex-1">
            <span className="text-[10px] text-[var(--muted)] font-medium">
              최근 1시간
            </span>
            <div className="text-[18px] font-bold tabular-nums text-[var(--accent)] leading-tight">
              {pulse.recentHourCount}건
            </div>
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse-dot" />
          <span className="text-[9px] text-[var(--success)] font-semibold tracking-wide">
            LIVE
          </span>
        </div>

        {/* Top tags */}
        {pulse.topTags.length > 0 && (
          <div>
            <h3 className="text-[10px] uppercase tracking-[0.1em] text-[var(--muted)] font-semibold mb-3">
              인기 태그 Top 3
            </h3>
            <div className="space-y-2.5">
              {pulse.topTags.map(([tag, count], i) => {
                const pct =
                  pulse.todayCount > 0
                    ? Math.round((count / pulse.todayCount) * 100)
                    : 0;
                return (
                  <div key={tag} className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-[var(--surface-active)] flex items-center justify-center text-[10px] font-bold text-[var(--foreground-secondary)] tabular-nums">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-semibold text-[var(--foreground)]">
                          {tag}
                        </span>
                        <span className="text-[10px] text-[var(--muted)] tabular-nums">
                          {count}건
                        </span>
                      </div>
                      <div className="h-1.5 bg-[var(--surface-active)] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{
                            width: `${Math.max(pct, 8)}%`,
                            backgroundColor: barColors[i] || "var(--accent)",
                          }}
                        />
                      </div>
                    </div>
                    <span className="text-[10px] font-bold tabular-nums text-[var(--muted)]">
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick help */}
        <div className="mt-4 p-3 rounded-[var(--radius-md)] metal-surface">
          <h4 className="text-[10px] font-semibold text-[var(--foreground-secondary)] mb-2">
            ⌨ 빠른 탐색
          </h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {[
              { key: "j / k", desc: "기사 이동" },
              { key: "s", desc: "저장 토글" },
              { key: "o", desc: "원문 열기" },
              { key: "/", desc: "검색" },
              { key: "r", desc: "읽음 토글" },
              { key: "?", desc: "전체 단축키" },
            ].map(({ key, desc }) => (
              <div key={key} className="flex items-center gap-1.5 py-0.5">
                <kbd className="text-[9px] font-semibold text-[var(--foreground-secondary)] bg-[var(--surface-active)] border border-[var(--border)] rounded-[3px] px-1.5 py-0.5 min-w-[28px] text-center">
                  {key}
                </kbd>
                <span className="text-[10px] text-[var(--muted)]">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
