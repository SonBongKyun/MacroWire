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
    { label: "전체", value: total },
    { label: "안읽음", value: unread },
    { label: "저장됨", value: saved },
    { label: "소스", value: `${activeSources}/${sources.length}` },
  ];

  return (
    <div className="flex items-center gap-0 px-5 h-8 border-b border-[var(--border)] metal-header shrink-0 text-[10px]">
      {/* Stat items */}
      {stats.map((stat, i) => (
        <div key={stat.label} className="flex items-center">
          {i > 0 && <span className="text-[var(--border-strong)] mx-2.5">·</span>}
          <span className="text-[var(--muted)] mr-1">{stat.label}</span>
          <span className="font-bold text-[var(--foreground-bright)] tabular-nums">
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
