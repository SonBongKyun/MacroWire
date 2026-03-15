"use client";

import { useMemo } from "react";
import type { Article } from "@/types";
import { findRelatedArticles } from "@/lib/analytics/trends";

interface RelatedArticlesProps {
  article: Article;
  articles: Article[];
  onSelectArticle: (article: Article) => void;
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

export function RelatedArticles({ article, articles, onSelectArticle }: RelatedArticlesProps) {
  const related = useMemo(() => findRelatedArticles(article, articles, 5), [article, articles]);

  if (related.length === 0) return null;

  return (
    <div className="mt-4">
      <h3 className="section-label mb-2 flex items-center gap-1.5">
        <svg className="w-3 h-3 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        관련 기사
      </h3>
      <div className="space-y-1">
        {related.map((a) => (
          <button
            key={a.id}
            onClick={() => onSelectArticle(a)}
            className="w-full text-left p-2 rounded-[var(--radius-sm)] hover:bg-[var(--surface-hover)] transition-colors group"
          >
            <p className="text-[11px] leading-[1.4] text-[var(--foreground)] line-clamp-1 group-hover:text-[var(--accent)]">
              {a.title}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[9px] text-[var(--accent)] font-medium">{a.sourceName}</span>
              <span className="text-[9px] text-[var(--muted)]">{timeAgo(a.publishedAt)}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
