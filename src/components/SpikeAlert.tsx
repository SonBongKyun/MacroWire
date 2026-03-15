"use client";

import { useMemo } from "react";
import type { Article } from "@/types";
import { detectSpikes } from "@/lib/analytics/spike";

interface SpikeAlertProps {
  articles: Article[];
  onTagClick?: (tag: string) => void;
}

export function SpikeAlert({ articles, onTagClick }: SpikeAlertProps) {
  const spikes = useMemo(() => detectSpikes(articles), [articles]);

  if (spikes.length === 0) return null;

  return (
    <div className="px-5 h-9 border-b border-[var(--border-subtle)] flex items-center gap-2 shrink-0 bg-red-500/5 overflow-x-auto hide-in-focus">
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <span className="text-[9px] font-bold text-red-500 tracking-wider uppercase">SPIKE</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {spikes.slice(0, 3).map((s) => (
          <button
            key={s.tag}
            onClick={() => onTagClick?.(s.tag)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors hover:opacity-80 shrink-0 whitespace-nowrap"
            style={{ color: s.color, backgroundColor: `${s.color}15`, border: `1px solid ${s.color}30` }}
          >
            <span>🔥</span>
            <span>{s.tag}</span>
            <span className="text-[9px] opacity-70">
              {s.currentCount}건 ({s.ratio > 10 ? "10x+" : `${s.ratio}x`})
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
