"use client";

import { useState } from "react";
import type { Article } from "@/types";
import type { WatchlistStore } from "@/hooks/useWatchlist";

interface WatchlistPanelProps {
  store: WatchlistStore;
  articles: Article[];
  onAdd: (keyword: string) => void;
  onRemove: (keyword: string) => void;
  onSelectArticle: (article: Article) => void;
}

export function WatchlistPanel({ store, articles, onAdd, onRemove, onSelectArticle }: WatchlistPanelProps) {
  const [input, setInput] = useState("");

  const handleAdd = () => {
    if (input.trim()) {
      onAdd(input.trim());
      setInput("");
    }
  };

  // Count matching articles for each keyword
  const keywordMatches = store.items.map((item) => {
    const kw = item.keyword.toLowerCase();
    const matches = articles.filter((a) =>
      a.title.toLowerCase().includes(kw) || (a.summary?.toLowerCase().includes(kw))
    );
    return { ...item, matches };
  });

  return (
    <div className="p-3 border-b border-[var(--border)] glass-header">
      <div className="flex items-center justify-between mb-2">
        <h3 className="section-label flex items-center gap-1.5">
          <svg className="w-3 h-3 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          워치리스트
        </h3>
      </div>
      <div className="flex items-center gap-1 mb-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
          placeholder="키워드 추가…"
          className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-[var(--radius-sm)] px-2 py-1 text-[10px] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent-light)] metal-inset"
        />
        <button
          onClick={handleAdd}
          className="w-6 h-6 flex items-center justify-center rounded-[var(--radius-sm)] metal-btn text-[var(--accent)] text-xs"
        >
          +
        </button>
      </div>
      {keywordMatches.length === 0 ? (
        <p className="text-[10px] text-[var(--muted)] text-center py-2">키워드를 추가하면 관련 기사 알림을 받습니다</p>
      ) : (
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {keywordMatches.map(({ keyword, matches }) => (
            <div key={keyword} className="flex items-center gap-1.5 group">
              <button
                onClick={() => onRemove(keyword)}
                className="w-4 h-4 flex items-center justify-center rounded-full text-[8px] text-[var(--muted)] hover:text-[var(--danger)] hover:bg-[var(--surface-hover)] opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ✕
              </button>
              <span className="text-[10px] font-semibold text-[var(--foreground)] flex-1">{keyword}</span>
              {matches.length > 0 && (
                <span className="text-[9px] font-bold text-[var(--accent)] tabular-nums px-1.5 py-0.5 rounded-full bg-[var(--accent-surface)]">
                  {matches.length}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
