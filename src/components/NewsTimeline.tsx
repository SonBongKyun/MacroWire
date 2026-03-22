"use client";

import { useMemo } from "react";
import type { Article } from "@/types";

interface NewsTimelineProps {
  articles: Article[];
  onSelectArticle: (article: Article) => void;
}

const TAG_COLORS: Record<string, string> = {
  금리: "#b45309", 물가: "#dc2626", 연준: "#7c3aed", 환율: "#0e7490",
  미국: "#2563eb", 중국: "#e11d48", 일본: "#be185d", 유럽: "#4338ca",
  수출입: "#047857", 경기: "#4d7c0f", 부동산: "#c2410c", 가계부채: "#e11d48",
  재정: "#0369a1", 에너지: "#a16207", 반도체: "#0f766e", AI: "#15803d",
  지정학: "#9333ea",
};

interface TimelineGroup {
  label: string;
  date: string;
  articles: Article[];
}

export function NewsTimeline({ articles, onSelectArticle }: NewsTimelineProps) {
  const groups = useMemo(() => {
    const sorted = [...articles].sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );

    const map = new Map<string, Article[]>();
    for (const a of sorted) {
      const d = new Date(a.publishedAt);
      const now = new Date();
      const diffH = (now.getTime() - d.getTime()) / (1000 * 60 * 60);

      let key: string;
      if (diffH < 1) key = "방금 전";
      else if (diffH < 3) key = "1~3시간 전";
      else if (diffH < 6) key = "3~6시간 전";
      else if (diffH < 12) key = "6~12시간 전";
      else if (diffH < 24) key = "12~24시간 전";
      else {
        key = d.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });
      }

      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }

    const result: TimelineGroup[] = [];
    for (const [label, arts] of map) {
      result.push({ label, date: arts[0].publishedAt, articles: arts });
    }
    return result;
  }, [articles]);

  if (articles.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[11px] text-[var(--muted)]">타임라인에 표시할 기사가 없습니다</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="relative">
        {/* Vertical timeline line */}
        <div className="absolute left-[7px] top-0 bottom-0 w-[2px] bg-[var(--border)]" />

        {groups.map((group, gi) => (
          <div key={gi} className="mb-6 last:mb-0">
            {/* Time label */}
            <div className="flex items-center gap-3 mb-3 relative">
              <div className="w-4 h-4 rounded-full bg-[var(--accent)] border-2 border-[var(--surface)] z-10 shrink-0 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>
              <span className="text-[11px] font-bold text-[var(--foreground-bright)]">
                {group.label}
              </span>
              <span className="text-[9px] text-[var(--muted)] tabular-nums">
                {group.articles.length}건
              </span>
            </div>

            {/* Articles in this time group */}
            <div className="ml-8 space-y-1.5">
              {group.articles.slice(0, 10).map((article) => (
                <button
                  key={article.id}
                  onClick={() => onSelectArticle(article)}
                  className="w-full text-left px-3 py-2 rounded-[var(--radius-sm)] hover:bg-[var(--surface-hover)] transition-all group border border-transparent hover:border-[var(--border)]"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-[9px] text-[var(--muted)] tabular-nums shrink-0 mt-0.5 w-10">
                      {new Date(article.publishedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className={`text-[11px] leading-snug truncate ${
                        article.isRead ? "text-[var(--muted)]" : "text-[var(--foreground)] font-medium"
                      }`}>
                        {article.title}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[8px] text-[var(--muted)]">{article.sourceName}</span>
                        {article.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-[8px] font-bold px-1 rounded-[2px]"
                            style={{
                              color: TAG_COLORS[tag] || "var(--muted)",
                              background: `${TAG_COLORS[tag] || "var(--muted)"}15`,
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    {article.isSaved && (
                      <svg className="w-3 h-3 text-[var(--gold)] shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
              {group.articles.length > 10 && (
                <div className="text-[9px] text-[var(--muted)] pl-12 py-1">
                  +{group.articles.length - 10}건 더
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
