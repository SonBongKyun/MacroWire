"use client";

import { useMemo } from "react";
import type { Article } from "@/types";
import { findSimilarArticles } from "@/lib/ai/similarity";

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
  const similar = useMemo(() => findSimilarArticles(article, articles, 5), [article, articles]);

  if (similar.length === 0) return null;

  return (
    <div className="mt-4">
      <h3 className="section-label mb-2 flex items-center gap-1.5">
        <svg className="w-3 h-3 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        관련 기사
      </h3>
      <div>
        {similar.map((s) => (
          <button
            key={s.article.id}
            onClick={() => onSelectArticle(s.article)}
            className="w-full text-left group"
            style={{
              display: "block",
              padding: "8px 4px",
              borderBottom: "1px solid #1e1e22",
              background: "transparent",
              border: "none",
              borderBlockEnd: "1px solid #1e1e22",
              cursor: "pointer",
              transition: "background 0.15s ease",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(201,169,110,0.04)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            <p style={{
              fontSize: 11,
              lineHeight: 1.4,
              color: "#EBEBEB",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              margin: 0,
            }}>
              {s.article.title}
            </p>

            {/* Similarity score bar */}
            <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                flex: 1,
                height: 2,
                background: "#2D2D32",
                borderRadius: 1,
                overflow: "hidden",
              }}>
                <div style={{
                  width: `${Math.round(s.score * 100)}%`,
                  height: "100%",
                  background: "#C9A96E",
                  borderRadius: 1,
                  transition: "width 0.3s ease",
                }} />
              </div>
              <span style={{
                fontSize: 9,
                color: "#C9A96E",
                fontFamily: "var(--font-mono)",
                fontVariantNumeric: "tabular-nums",
                flexShrink: 0,
              }}>
                {Math.round(s.score * 100)}%
              </span>
            </div>

            {/* Reasons */}
            {s.reasons.length > 0 && (
              <div style={{ marginTop: 3 }}>
                <span style={{ fontSize: 9, color: "#8C8C91", fontStyle: "italic" }}>
                  {s.reasons.join(" · ")}
                </span>
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
              <span style={{ fontSize: 9, color: "#C9A96E", fontWeight: 500 }}>{s.article.sourceName}</span>
              <span style={{ fontSize: 9, color: "#8C8C91" }}>{timeAgo(s.article.publishedAt)}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
