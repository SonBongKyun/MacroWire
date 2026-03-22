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
    { label: "전체", value: total, color: "var(--accent)", dot: "var(--accent)" },
    { label: "안읽음", value: unread, color: "var(--accent)", dot: "var(--accent)" },
    { label: "저장됨", value: saved, color: "var(--gold)", dot: "var(--gold)" },
    { label: "소스", value: `${activeSources}/${sources.length}`, color: "var(--success)", dot: "var(--success)" },
  ];

  return (
    <div className="flex items-center gap-0 px-4 h-9 shrink-0 text-[11px]">
      {/* Stat items */}
      {stats.map((stat, i) => (
        <div key={stat.label} className="flex items-center">
          {i > 0 && <span className="text-[var(--border-strong)] mx-2.5 text-[8px]">|</span>}
          <span className="w-1.5 h-1.5 rounded-full mr-1.5 shrink-0" style={{ background: stat.dot }} />
          <span className="text-[var(--muted)] mr-1 text-[10px]">{stat.label}</span>
          <span className="font-bold tabular-nums text-[var(--foreground-bright)]">
            {stat.value}
          </span>
        </div>
      ))}

      {/* Top tags */}
      {topTags.length > 0 && (
        <>
          <div className="w-px h-3.5 bg-[var(--border)] mx-3" />
          <div className="flex items-center gap-2.5">
            <span className="text-[9px] font-bold text-[var(--muted)] tracking-wider uppercase">Hot</span>
            {topTags.map(([tag, count]) => (
              <span key={tag} className="flex items-center gap-1">
                <span className="text-[10px] font-semibold text-[var(--foreground-secondary)]">{tag}</span>
                <span className="text-[9px] text-[var(--muted)] tabular-nums">{count}</span>
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
