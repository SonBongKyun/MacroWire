"use client";

import type { Article } from "@/types";
import { analyzeSentiment } from "@/lib/sentiment/sentiment";

interface PeekPopoverProps {
  article: Article;
  position: { x: number; y: number };
}

export function PeekPopover({ article, position }: PeekPopoverProps) {
  const sentiment = analyzeSentiment(article.title, article.summary);

  // Position adjustment if going off screen
  const adjustedTop = Math.min(position.y, (typeof window !== 'undefined' ? window.innerHeight : 800) - 200);
  const adjustedLeft = position.x + 320 > (typeof window !== 'undefined' ? window.innerWidth : 1200) ? position.x - 328 : position.x;

  return (
    <div
      className="fixed z-50 w-[320px] p-3 rounded-[var(--radius-md)] glass-modal border border-[var(--border)] shadow-xl animate-fade-in pointer-events-none"
      style={{ top: adjustedTop, left: adjustedLeft }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
          style={{ color: sentiment.color, backgroundColor: `${sentiment.color}18` }}
        >
          {sentiment.label}
        </span>
        <span className="text-[10px] text-[var(--accent)] font-semibold">{article.sourceName}</span>
      </div>
      <h4 className="text-[12px] font-bold text-[var(--foreground-bright)] leading-[1.5] mb-2">
        {article.title}
      </h4>
      {article.summary && (
        <p className="text-[11px] text-[var(--foreground-secondary)] leading-[1.6] line-clamp-4">
          {article.summary}
        </p>
      )}
      {article.tags.length > 0 && (
        <div className="flex gap-1 mt-2 flex-wrap">
          {article.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--surface-active)] text-[var(--muted)]">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
