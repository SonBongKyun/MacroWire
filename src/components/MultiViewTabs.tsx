"use client";

import { useState } from "react";
import type { ViewTab } from "@/hooks/useMultiView";

interface MultiViewTabsProps {
  tabs: ViewTab[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onRemoveTab: (id: string) => void;
  onAddTab: (tab: Omit<ViewTab, "id">) => void;
  tags: string[];
  sourceNames: string[];
}

const TAB_COLORS: Record<string, string> = {
  tag: "var(--accent)",
  source: "var(--gold)",
  search: "var(--info)",
  saved: "var(--saved)",
  all: "var(--muted)",
};

export function MultiViewTabs({
  tabs,
  activeTabId,
  onSelectTab,
  onRemoveTab,
  onAddTab,
  tags,
  sourceNames,
}: MultiViewTabsProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [addType, setAddType] = useState<ViewTab["type"]>("tag");
  const [addValue, setAddValue] = useState("");
  const [addLabel, setAddLabel] = useState("");

  const handleAdd = () => {
    if (addType === "all") return;
    const value = addValue.trim();
    if (!value) return;
    const label = addLabel.trim() || value;
    onAddTab({ label, type: addType, value, color: TAB_COLORS[addType] });
    setAddValue("");
    setAddLabel("");
    setShowAdd(false);
  };

  return (
    <div className="flex items-center gap-0.5 px-3 h-8 bg-[var(--surface)] border-b border-[var(--border)] shrink-0 overflow-x-auto scrollbar-none">
      {tabs.map((tab) => (
        <div key={tab.id} className="flex items-center shrink-0">
          <button
            onClick={() => onSelectTab(tab.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold rounded-t-[var(--radius-sm)] transition-all border-b-2 ${
              activeTabId === tab.id
                ? "text-[var(--foreground-bright)] border-[var(--accent)] bg-[var(--accent-surface)]"
                : "text-[var(--muted)] border-transparent hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
            }`}
          >
            <div
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: tab.color || TAB_COLORS[tab.type] }}
            />
            {tab.label}
          </button>
          {tab.id !== "all" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveTab(tab.id);
              }}
              className="text-[8px] text-[var(--muted)] hover:text-[var(--danger)] ml-0.5 w-3.5 h-3.5 flex items-center justify-center rounded-full hover:bg-[var(--surface-hover)] transition-all"
            >
              ✕
            </button>
          )}
        </div>
      ))}

      {/* Add tab button */}
      <div className="relative shrink-0 ml-1">
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="w-5 h-5 rounded-[var(--radius-xs)] metal-btn flex items-center justify-center text-[10px] text-[var(--muted)] hover:text-[var(--accent)]"
        >
          +
        </button>

        {showAdd && (
          <div className="absolute top-full left-0 mt-1 z-50 glass-modal w-56 p-3 space-y-2 animate-fade-in">
            <div className="text-[9px] font-bold text-[var(--muted)] tracking-wider uppercase">새 탭 추가</div>
            <div className="flex gap-1">
              {(["tag", "source", "search", "saved"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setAddType(t)}
                  className={`px-2 py-1 text-[8px] font-bold rounded-[var(--radius-xs)] transition-all ${
                    addType === t ? "bg-[var(--accent)] text-white" : "metal-btn text-[var(--muted)]"
                  }`}
                >
                  {{ tag: "태그", source: "소스", search: "검색", saved: "저장" }[t]}
                </button>
              ))}
            </div>

            {addType === "saved" ? (
              <button
                onClick={() => {
                  onAddTab({ label: "저장됨", type: "saved", value: "true", color: TAB_COLORS.saved });
                  setShowAdd(false);
                }}
                className="w-full btn-primary px-2 py-1.5 text-[10px] font-bold"
              >
                저장된 기사 탭 추가
              </button>
            ) : (
              <>
                {addType === "tag" ? (
                  <select
                    value={addValue}
                    onChange={(e) => { setAddValue(e.target.value); setAddLabel(e.target.value); }}
                    className="w-full px-2 py-1.5 text-[10px] rounded-[var(--radius-sm)] bg-[var(--surface)] border border-[var(--border)] outline-none focus:border-[var(--accent)]"
                  >
                    <option value="">태그 선택...</option>
                    {tags.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                ) : addType === "source" ? (
                  <select
                    value={addValue}
                    onChange={(e) => { setAddValue(e.target.value); setAddLabel(e.target.value); }}
                    className="w-full px-2 py-1.5 text-[10px] rounded-[var(--radius-sm)] bg-[var(--surface)] border border-[var(--border)] outline-none focus:border-[var(--accent)]"
                  >
                    <option value="">소스 선택...</option>
                    {sourceNames.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={addValue}
                    onChange={(e) => { setAddValue(e.target.value); if (!addLabel) setAddLabel(e.target.value); }}
                    placeholder="검색어..."
                    className="w-full px-2 py-1.5 text-[10px] rounded-[var(--radius-sm)] bg-[var(--surface)] border border-[var(--border)] outline-none focus:border-[var(--accent)]"
                    autoFocus
                  />
                )}
                <input
                  type="text"
                  value={addLabel}
                  onChange={(e) => setAddLabel(e.target.value)}
                  placeholder="탭 이름 (선택)"
                  className="w-full px-2 py-1.5 text-[10px] rounded-[var(--radius-sm)] bg-[var(--surface)] border border-[var(--border)] outline-none focus:border-[var(--accent)]"
                />
                <div className="flex gap-1.5">
                  <button onClick={handleAdd} className="flex-1 btn-primary px-2 py-1.5 text-[10px] font-bold">
                    추가
                  </button>
                  <button onClick={() => setShowAdd(false)} className="metal-btn px-2 py-1.5 text-[10px]">
                    취소
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
