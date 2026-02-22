"use client";

import { useState } from "react";
import type { Source } from "@/types";

interface SourcePanelProps {
  sources: Source[];
  selectedSourceId: string | null;
  onSelectSource: (id: string) => void;
  onToggleSource: (source: Source) => void;
  tags: string[];
  selectedTag: string | null;
  onSelectTag: (tag: string) => void;
}

const TAG_COLORS: Record<string, string> = {
  금리: "#92400e",
  물가: "#991b1b",
  연준: "#5b21b6",
  환율: "#155e75",
  미국: "#1e40af",
  중국: "#b91c1c",
  일본: "#9d174d",
  유럽: "#3730a3",
  수출입: "#065f46",
  경기: "#3f6212",
  부동산: "#9a3412",
  가계부채: "#be123c",
  재정: "#075985",
  에너지: "#854d0e",
  반도체: "#115e59",
  AI: "#166534",
  지정학: "#86198f",
};

const CATEGORY_LABELS: Record<string, string> = {
  policy: "정책·기관",
  macro: "매크로·경제",
  global: "글로벌·국제",
  fx: "환율·증권",
  semicon: "반도체·기술",
};

export function SourcePanel({
  sources,
  selectedSourceId,
  onSelectSource,
  onToggleSource,
  tags,
  selectedTag,
  onSelectTag,
}: SourcePanelProps) {
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const grouped = sources.reduce<Record<string, Source[]>>((acc, s) => {
    const cat = s.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const enabledCount = sources.filter((s) => s.enabled).length;

  return (
    <aside className="w-60 shrink-0 border-r border-[var(--border)] bg-[var(--surface-sidebar)] flex flex-col overflow-hidden select-none shadow-card">
      {/* Tags section */}
      <div className="p-3 border-b border-[var(--border)] metal-header">
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-[11px] font-semibold text-[var(--foreground-secondary)] tracking-wide">
            태그
          </h3>
          {selectedTag && (
            <button
              onClick={() => onSelectTag(selectedTag)}
              className="text-[10px] text-[var(--accent)] hover:text-[var(--accent-dim)] font-medium transition-colors"
            >
              초기화
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => {
            const color = TAG_COLORS[tag] || "#475569";
            const isActive = selectedTag === tag;
            return (
              <button
                key={tag}
                onClick={() => onSelectTag(tag)}
                style={{ color: isActive ? color : undefined }}
                className={`px-1.5 py-0.5 text-[10px] font-medium rounded-[var(--radius-sm)] transition-colors ${
                  isActive
                    ? "font-bold metal-btn !border-[var(--border-strong)]"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sources section */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--border)] sticky top-0 bg-[var(--surface-sidebar)] z-10 metal-header">
          <h3 className="text-[11px] font-semibold text-[var(--foreground-secondary)] tracking-wide">
            소스
          </h3>
          <span className="text-[10px] text-[var(--muted)] tabular-nums font-medium">
            <span className="text-[var(--success)]">{enabledCount}</span>
            <span className="mx-0.5">/</span>
            {sources.length}
          </span>
        </div>

        <div className="py-1">
          {Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([category, catSources]) => {
              const isCollapsed = collapsedCategories.has(category);
              const catEnabled = catSources.filter((s) => s.enabled).length;
              const label = CATEGORY_LABELS[category] || category;

              return (
                <div key={category} className="mb-0.5">
                  <button
                    onClick={() => toggleCategory(category)}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-[10px] font-semibold text-[var(--muted)] hover:text-[var(--foreground-secondary)] transition-colors"
                  >
                    <svg
                      className="w-2.5 h-2.5 transition-transform"
                      style={{ transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)" }}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                    <span className="uppercase tracking-wider">{label}</span>
                    <span className="ml-auto tabular-nums text-[var(--muted)]">{catEnabled}</span>
                  </button>

                  {!isCollapsed &&
                    catSources.map((source) => (
                      <div
                        key={source.id}
                        onClick={() => onSelectSource(source.id)}
                        className={`flex items-center gap-2 py-[5px] px-3 pl-7 cursor-pointer text-[12px] article-row rounded-r-md mr-1 ${
                          selectedSourceId === source.id
                            ? "bg-[var(--accent-glow)] text-[var(--accent)] font-medium"
                            : "hover:bg-[var(--surface-hover)] text-[var(--foreground)]"
                        }`}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleSource(source);
                          }}
                          className={`w-2 h-2 rounded-full shrink-0 transition-all border-2 ${
                            source.enabled
                              ? "bg-[var(--success)] border-[var(--success)]"
                              : "bg-transparent border-[var(--border-strong)]"
                          }`}
                          title={source.enabled ? "비활성화" : "활성화"}
                        />
                        <span
                          className={`flex-1 truncate ${
                            !source.enabled ? "text-[var(--muted)] line-through" : ""
                          }`}
                        >
                          {source.name}
                        </span>
                        {source._count && source._count.articles > 0 && (
                          <span className="text-[10px] text-[var(--muted)] tabular-nums">
                            {source._count.articles}
                          </span>
                        )}
                      </div>
                    ))}
                </div>
              );
            })}
        </div>
      </div>
    </aside>
  );
}
