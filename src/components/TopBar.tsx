"use client";

import { useEffect, useState } from "react";

interface TopBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  range: "24h" | "7d" | "30d";
  onRangeChange: (r: "24h" | "7d" | "30d") => void;
  onIngest: () => void;
  ingesting: boolean;
  lastUpdated: string | null;
  showSaved: boolean;
  onToggleSaved: () => void;
  articleCount?: number;
  darkMode: boolean;
  onToggleDark: () => void;
  countdown: number;
  newArticleCount?: number;
  onMarkAllRead?: () => void;
  onExport?: () => void;
  onShowHelp?: () => void;
}

export function TopBar({
  searchQuery,
  onSearchChange,
  range,
  onRangeChange,
  onIngest,
  ingesting,
  lastUpdated,
  showSaved,
  onToggleSaved,
  articleCount = 0,
  darkMode,
  onToggleDark,
  countdown,
  newArticleCount = 0,
  onMarkAllRead,
  onExport,
  onShowHelp,
}: TopBarProps) {
  const ranges: { key: "24h" | "7d" | "30d"; label: string }[] = [
    { key: "24h", label: "24H" },
    { key: "7d", label: "7D" },
    { key: "30d", label: "30D" },
  ];

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  function updatedAgo(): string {
    if (!lastUpdated) return "";
    const diff = now - new Date(lastUpdated).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "방금";
    if (mins < 60) return `${mins}분 전`;
    return `${Math.floor(mins / 60)}시간 전`;
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        document.getElementById("wire-search")?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <header className="flex items-center gap-3 px-5 h-12 border-b border-[var(--border)] metal-header shrink-0 select-none">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-2">
        <div className="w-6 h-6 rounded-[var(--radius-sm)] bg-[var(--accent)] flex items-center justify-center" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 1px 2px rgba(0,0,0,0.12)' }}>
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div className="flex flex-col">
          <span className="text-[14px] font-bold text-[var(--foreground-bright)] leading-none">
            Macro Wire
          </span>
          <div className="flex items-center gap-1 mt-0.5">
            <div className="w-1 h-1 rounded-full bg-[var(--success)]" />
            <span className="text-[10px] text-[var(--muted)] tracking-wider">LIVE</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          id="wire-search"
          type="text"
          placeholder="기사 검색…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-[var(--background)] border border-[var(--border)] rounded-[var(--radius-md)] pl-9 pr-16 py-2 text-[13px] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent-light)] focus:ring-2 focus:ring-[var(--accent)]/10 transition-all metal-inset"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {searchQuery ? (
            <button
              onClick={() => onSearchChange("")}
              className="text-[var(--muted)] hover:text-[var(--foreground)] text-xs w-5 h-5 flex items-center justify-center rounded-full hover:bg-[var(--surface-hover)] transition-colors"
            >
              ✕
            </button>
          ) : (
            <kbd className="text-[11px] text-[var(--muted)] bg-[var(--surface-raised)] border border-[var(--border)] rounded-[4px] px-1.5 py-0.5 leading-none font-medium">
              ⌘K
            </kbd>
          )}
        </div>
      </div>

      {/* Range toggle */}
      <div className="flex border border-[var(--border)] rounded-[var(--radius-sm)] p-0.5 metal-surface">
        {ranges.map((r) => (
          <button
            key={r.key}
            onClick={() => onRangeChange(r.key)}
            className={`px-2.5 py-1 text-[12px] font-semibold rounded-[3px] transition-colors ${
              range === r.key
                ? "bg-[var(--foreground-bright)] text-white shadow-sm"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Saved toggle */}
      <button
        onClick={onToggleSaved}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium rounded-[var(--radius-sm)] transition-colors metal-btn ${
          showSaved
            ? "!border-[var(--accent)] text-[var(--accent)]"
            : "text-[var(--muted)] hover:text-[var(--foreground)]"
        }`}
      >
        <span className="text-xs leading-none">{showSaved ? "★" : "☆"}</span>
        저장됨
      </button>

      {/* Counter + New badge */}
      <div className="flex items-center gap-1.5">
        {articleCount > 0 && (
          <span className="text-[12px] text-[var(--muted)] tabular-nums font-medium">
            {articleCount}건
          </span>
        )}
        {newArticleCount > 0 && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[12px] font-bold rounded-full bg-[var(--accent)] text-white animate-pulse">
            +{newArticleCount}
          </span>
        )}
      </div>

      {/* Action buttons: Mark read, Export, Help */}
      <div className="flex items-center gap-1">
        {onMarkAllRead && (
          <button
            onClick={onMarkAllRead}
            className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-sm)] metal-btn text-[var(--muted)] hover:text-[var(--success)] transition-colors"
            title="전체 읽음 처리 (M)"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        )}
        {onExport && (
          <button
            onClick={onExport}
            className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-sm)] metal-btn text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
            title="저장 기사 내보내기 (E)"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
        )}
        {onShowHelp && (
          <button
            onClick={onShowHelp}
            className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-sm)] metal-btn text-[var(--muted)] hover:text-[var(--accent)] transition-colors text-[13px] font-bold"
            title="단축키 도움말 (?)"
          >
            ?
          </button>
        )}
      </div>

      {/* Countdown + Ingest */}
      <div className="flex items-center gap-1.5">
        {countdown > 0 && !ingesting && (
          <div className="flex items-center gap-1.5 text-[12px] text-[var(--muted)] tabular-nums font-medium">
            <svg className="w-4 h-4" viewBox="0 0 20 20">
              <circle
                cx="10" cy="10" r="8"
                fill="none"
                stroke="var(--border)"
                strokeWidth="2"
              />
              <circle
                cx="10" cy="10" r="8"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="50.27"
                strokeDashoffset={50.27 * (1 - countdown / 300)}
                transform="rotate(-90 10 10)"
                className="transition-all duration-1000 ease-linear"
              />
            </svg>
            {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, "0")}
          </div>
        )}
        <button
          onClick={onIngest}
          disabled={ingesting}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-[var(--radius-sm)] transition-colors ${
            ingesting
              ? "metal-btn !border-[var(--border)] text-[var(--muted)] cursor-wait"
              : "metal-btn !border-[var(--accent)] text-[var(--accent)]"
          }`}
        >
          {ingesting ? (
            <>
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              수집 중…
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              새로고침
            </>
          )}
        </button>
      </div>

      {/* Dark mode toggle */}
      <button
        onClick={onToggleDark}
        className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-sm)] metal-btn text-[var(--muted)] hover:text-[var(--foreground)]"
        title={darkMode ? "라이트 모드" : "다크 모드"}
      >
        {darkMode ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )}
      </button>

      {/* Last updated */}
      {lastUpdated && (
        <span className="text-[12px] text-[var(--muted)] whitespace-nowrap tabular-nums">
          {updatedAgo()}
        </span>
      )}
    </header>
  );
}
