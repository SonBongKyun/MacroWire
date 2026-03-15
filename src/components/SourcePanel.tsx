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
  collapsed: boolean;
  onToggleCollapse: () => void;
  onAddSource?: () => void;
  onDeleteSource?: (source: Source) => void;
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

const CATEGORY_ICONS: Record<string, { label: string; color: string }> = {
  policy: { label: "P", color: "#5b21b6" },
  macro: { label: "M", color: "#b4637a" },
  global: { label: "G", color: "#10b981" },
  fx: { label: "F", color: "#f59e0b" },
  semicon: { label: "S", color: "#0ea5e9" },
  other: { label: "O", color: "#6b7280" },
};

export function SourcePanel({
  sources,
  selectedSourceId,
  onSelectSource,
  onToggleSource,
  tags,
  selectedTag,
  onSelectTag,
  collapsed,
  onToggleCollapse,
  onAddSource,
  onDeleteSource,
}: SourcePanelProps) {
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [sourceSearch, setSourceSearch] = useState("");

  const grouped = sources.reduce<Record<string, Source[]>>((acc, s) => {
    const cat = s.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  // Filter sources by search query
  const filteredGrouped = Object.entries(grouped).reduce<Record<string, Source[]>>((acc, [cat, srcs]) => {
    if (!sourceSearch.trim()) {
      acc[cat] = srcs;
    } else {
      const filtered = srcs.filter(s => s.name.toLowerCase().includes(sourceSearch.toLowerCase()));
      if (filtered.length > 0) acc[cat] = filtered;
    }
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
    <div className="relative flex shrink-0">
      <aside
        className={`sidebar-wrapper shrink-0 border-r border-[var(--border)] glass-sidebar flex flex-col overflow-hidden select-none shadow-card ${collapsed ? "collapsed" : ""}`}
        style={{ width: collapsed ? 0 : 240 }}
      >
      {/* Tags section */}
      <div className="p-3 border-b border-[var(--border)] glass-header">
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="section-label">
            태그
          </h3>
          {selectedTag && (
            <button
              onClick={() => onSelectTag(selectedTag)}
              className="text-[11px] text-[var(--accent)] hover:text-[var(--accent-dim)] font-medium transition-colors"
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
                className="tag-pill"
                style={isActive ? { color, backgroundColor: `${color}20`, borderColor: `${color}40` } : { color: 'var(--muted)' }}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sources section */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--border)] sticky top-0 glass-header z-10">
          <h3 className="section-label">
            소스
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[var(--muted)] tabular-nums font-medium">
              <span className="text-[var(--success)]">{enabledCount}</span>
              <span className="mx-0.5">/</span>
              {sources.length}
            </span>
            {onAddSource && (
              <button
                onClick={onAddSource}
                className="w-5 h-5 flex items-center justify-center rounded-[var(--radius-sm)] metal-btn text-[var(--accent)] text-[11px]"
                title="소스 추가"
              >
                +
              </button>
            )}
          </div>
        </div>

        {/* Source search */}
        <div className="px-3 py-2 border-b border-[var(--border-subtle)] relative">
          <svg className="w-3 h-3 absolute left-5 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={sourceSearch}
            onChange={(e) => setSourceSearch(e.target.value)}
            placeholder="소스 검색..."
            className="source-search"
          />
          {sourceSearch && (
            <button
              onClick={() => setSourceSearch("")}
              className="absolute right-5 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)] text-[11px]"
            >
              ✕
            </button>
          )}
        </div>

        <div className="py-1">
          {Object.entries(filteredGrouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([category, catSources]) => {
              const isCollapsed = collapsedCategories.has(category);
              const catEnabled = catSources.filter((s) => s.enabled).length;
              const label = CATEGORY_LABELS[category] || category;

              return (
                <div key={category} className="mb-0.5">
                  <button
                    onClick={() => toggleCategory(category)}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-[11px] font-semibold text-[var(--muted)] hover:text-[var(--foreground-secondary)] transition-colors group"
                  >
                    <span
                      className="cat-icon text-white"
                      style={{ backgroundColor: (CATEGORY_ICONS[category] || CATEGORY_ICONS.other).color }}
                    >
                      {(CATEGORY_ICONS[category] || CATEGORY_ICONS.other).label}
                    </span>
                    <svg
                      className="w-2.5 h-2.5 transition-transform text-[var(--border-strong)] group-hover:text-[var(--muted)]"
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
                          <span className="text-[11px] text-[var(--muted)] tabular-nums">
                            {source._count.articles}
                          </span>
                        )}
                        {onDeleteSource && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onDeleteSource(source); }}
                            className="w-4 h-4 flex items-center justify-center rounded-full text-[8px] text-[var(--muted)] hover:text-[var(--danger)] hover:bg-[var(--surface-hover)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            title="소스 삭제"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                </div>
              );
            })}
        </div>
      </div>
    </aside>

      {/* Toggle button */}
      <button
        onClick={onToggleCollapse}
        className="absolute top-1/2 -translate-y-1/2 z-30 w-5 h-10 flex items-center justify-center rounded-r-md border border-l-0 border-[var(--border)] bg-[var(--surface-flat)] hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-all duration-200 shadow-sm"
        style={{ left: collapsed ? 0 : 240, transition: "left 0.3s cubic-bezier(.4,0,.2,1)" }}
        title={collapsed ? "사이드바 펼치기 ([)" : "사이드바 접기 ([)"}
      >
        <svg
          className="w-3 h-3 transition-transform duration-200"
          style={{ transform: collapsed ? "rotate(0deg)" : "rotate(180deg)" }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
