"use client";

interface FilterBarProps {
  selectedSourceName?: string;
  selectedTag: string | null;
  searchQuery: string;
  range: "24h" | "7d" | "30d";
  showSaved: boolean;
  regionFilter: string;
  readFilter: "all" | "unread" | "read";
  onClearSource: () => void;
  onClearTag: () => void;
  onClearSearch: () => void;
  onClearRange: () => void;
  onClearSaved: () => void;
  onClearRegion: () => void;
  onClearReadFilter: () => void;
  onClearAll: () => void;
}

const RANGE_LABELS: Record<string, string> = { "24h": "24시간", "7d": "7일", "30d": "30일" };
const READ_LABELS: Record<string, string> = { unread: "안읽음", read: "읽음" };

export function FilterBar({
  selectedSourceName,
  selectedTag,
  searchQuery,
  range,
  showSaved,
  regionFilter,
  readFilter,
  onClearSource,
  onClearTag,
  onClearSearch,
  onClearRange,
  onClearSaved,
  onClearRegion,
  onClearReadFilter,
  onClearAll,
}: FilterBarProps) {
  const chips: { label: string; onClear: () => void }[] = [];

  if (selectedSourceName) chips.push({ label: `소스: ${selectedSourceName}`, onClear: onClearSource });
  if (selectedTag) chips.push({ label: `태그: ${selectedTag}`, onClear: onClearTag });
  if (searchQuery) chips.push({ label: `검색: "${searchQuery}"`, onClear: onClearSearch });
  if (range !== "24h") chips.push({ label: `범위: ${RANGE_LABELS[range]}`, onClear: onClearRange });
  if (showSaved) chips.push({ label: "저장됨만", onClear: onClearSaved });
  if (regionFilter !== "전체") chips.push({ label: `구분: ${regionFilter}`, onClear: onClearRegion });
  if (readFilter !== "all") chips.push({ label: `상태: ${READ_LABELS[readFilter]}`, onClear: onClearReadFilter });

  if (chips.length === 0) return null;

  return (
    <div className="px-5 h-8 border-b border-[var(--border-subtle)] flex items-center gap-2 shrink-0 bg-[var(--accent-surface)] overflow-x-auto">
      <svg className="w-3 h-3 text-[var(--muted)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
      </svg>
      <span className="text-[9px] font-bold text-[var(--muted)] tracking-wider shrink-0">FILTER</span>
      <div className="flex items-center gap-1.5 flex-wrap">
        {chips.map((chip, i) => (
          <button
            key={i}
            onClick={chip.onClear}
            className="filter-chip"
          >
            {chip.label}
            <span className="chip-x">✕</span>
          </button>
        ))}
      </div>
      {chips.length > 1 && (
        <button
          onClick={onClearAll}
          className="ml-auto text-[11px] text-[var(--muted)] hover:text-[var(--accent)] transition-colors font-medium shrink-0"
        >
          전체 해제
        </button>
      )}
    </div>
  );
}
