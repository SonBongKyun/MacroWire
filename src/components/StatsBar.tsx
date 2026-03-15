"use client";

import type { Article, Source } from "@/types";

interface StatsBarProps {
  articles: Article[];
  sources: Source[];
}

export function StatsBar({ articles, sources }: StatsBarProps) {
  const total = articles.length;
  const unread = articles.filter((a) => !a.isRead).length;
  const saved = articles.filter((a) => a.isSaved).length;
  const activeSources = sources.filter((s) => s.enabled).length;

  // Tag frequency (top 3)
  const tagCount: Record<string, number> = {};
  articles.forEach((a) =>
    a.tags.forEach((t) => {
      tagCount[t] = (tagCount[t] || 0) + 1;
    })
  );
  const topTags = Object.entries(tagCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const stats = [
    { label: "전체", value: total, color: "var(--foreground-bright)", dot: "linear-gradient(135deg, #6366f1, #8b5cf6)" },
    { label: "안읽음", value: unread, color: "var(--foreground-bright)", dot: "linear-gradient(135deg, #3b82f6, #06b6d4)" },
    { label: "저장됨", value: saved, color: "var(--foreground-bright)", dot: "linear-gradient(135deg, #f59e0b, #f97316)" },
    { label: "소스", value: `${activeSources}/${sources.length}`, color: "var(--foreground-bright)", dot: "linear-gradient(135deg, #10b981, #06b6d4)" },
  ];

  return (
    <div className="flex items-center gap-0 px-4 h-8 shrink-0 text-[11px]">
      {/* Stat items */}
      {stats.map((stat, i) => (
        <div key={stat.label} className="flex items-center">
          {i > 0 && <span className="text-[var(--border-strong)] mx-2">·</span>}
          <span className="w-1.5 h-1.5 rounded-full mr-1.5 shrink-0" style={{ background: stat.dot }} />
          <span className="text-[var(--muted)] mr-1">{stat.label}</span>
          <span className="font-bold tabular-nums" style={{ color: stat.color }}>
            {stat.value}
          </span>
        </div>
      ))}

      {/* Top tags */}
      {topTags.length > 0 && (
        <>
          <div className="w-px h-3.5 bg-[var(--border)] mx-3" />
          <div className="flex items-center gap-2">
            <span className="text-[var(--muted)]">인기</span>
            {topTags.map(([tag, count]) => (
              <span key={tag} className="font-semibold text-[var(--accent)]">
                {tag}<span className="text-[var(--muted)] font-normal ml-0.5">{count}</span>
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
