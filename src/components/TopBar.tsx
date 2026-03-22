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
  themeToggleRef?: React.RefObject<HTMLButtonElement | null>;
  onOpenPalette?: () => void;
  onOpenAnalytics?: () => void;
  onToggleWatchlist?: () => void;
  onToggleNotifications?: () => void;
  onTogglePortfolio?: () => void;
  onToggleTimeline?: () => void;
  onToggleTheme?: () => void;
  onToggleExport?: () => void;
  onAddMultiViewTab?: () => void;
  timelineMode?: boolean;
  notificationCount?: number;
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
  themeToggleRef,
  onOpenPalette,
  onOpenAnalytics,
  onToggleWatchlist,
  onToggleNotifications,
  onTogglePortfolio,
  onToggleTimeline,
  onToggleTheme,
  onToggleExport,
  onAddMultiViewTab,
  timelineMode = false,
  notificationCount = 0,
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
        if (onOpenPalette) onOpenPalette();
        else document.getElementById("wire-search")?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onOpenPalette]);

  return (
    <header className="relative flex items-center gap-3 px-4 h-[54px] glass-header shrink-0 select-none z-20">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mr-1 shrink-0">
        <div className="logo-mark">
          <span style={{ position: 'relative', zIndex: 1 }}>RF</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[13px] font-extrabold leading-none tracking-[-0.03em] text-[var(--foreground-bright)]">
            Ryzm Finance
          </span>
          <span className="text-[8px] font-semibold tracking-[0.12em] text-[var(--muted)] uppercase leading-none mt-0.5">
            Financial Intelligence
          </span>
        </div>
      </div>

      <div className="topbar-divider" />

      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          id="wire-search"
          type="text"
          placeholder="기사 검색... (Ctrl+K)"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-[var(--surface-active)] border border-[var(--border)] rounded-[var(--radius-md)] pl-9 pr-16 py-[7px] text-[11px] placeholder-[var(--muted)] focus:outline-none search-input transition-all"
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
            <kbd className="kbd-key" style={{ fontSize: '9px', padding: '1px 5px', minWidth: 'auto', height: '18px' }}>
              Ctrl+K
            </kbd>
          )}
        </div>
      </div>

      <div className="topbar-divider" />

      {/* Range toggle */}
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="flex bg-[var(--surface-active)] rounded-[var(--radius-sm)] p-0.5 border border-[var(--border-subtle)]">
          {ranges.map((r) => (
            <button
              key={r.key}
              onClick={() => onRangeChange(r.key)}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-[3px] transition-all duration-150 ${
                range === r.key
                  ? "bg-[var(--accent)] text-white shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <button
          onClick={onToggleSaved}
          className={`flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold rounded-[var(--radius-sm)] transition-all ${
            showSaved
              ? "bg-[var(--gold-surface)] border border-[var(--gold)] text-[var(--gold)]"
              : "metal-btn text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          <span className="text-xs leading-none">{showSaved ? "★" : "☆"}</span>
          저장됨
        </button>
      </div>

      {/* Counter + New badge */}
      <div className="flex items-center gap-1.5 shrink-0">
        {articleCount > 0 && (
          <span className="text-[10px] text-[var(--muted)] tabular-nums font-semibold">
            {articleCount}건
          </span>
        )}
        {newArticleCount > 0 && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-[var(--gold)] text-white shadow-sm">
            +{newArticleCount}
          </span>
        )}
      </div>

      <div className="topbar-divider" />

      {/* Action buttons */}
      <div className="flex items-center gap-0.5 shrink-0">
        {onOpenAnalytics && (
          <button
            onClick={onOpenAnalytics}
            className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-surface)] transition-all"
            title="애널리틱스 (A)"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </button>
        )}
        {onToggleWatchlist && (
          <button
            onClick={onToggleWatchlist}
            className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-surface)] transition-all"
            title="워치리스트 (W)"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
        )}
        {onTogglePortfolio && (
          <button
            onClick={onTogglePortfolio}
            className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--muted)] hover:text-[var(--gold)] hover:bg-[var(--gold-surface)] transition-all"
            title="포트폴리오"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </button>
        )}
        {onToggleTimeline && (
          <button
            onClick={onToggleTimeline}
            className={`w-7 h-7 flex items-center justify-center rounded-[var(--radius-sm)] transition-all ${
              timelineMode
                ? "text-[var(--accent)] bg-[var(--accent-surface)]"
                : "text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-surface)]"
            }`}
            title="타임라인 뷰"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        )}
        {onToggleNotifications && (
          <button
            onClick={onToggleNotifications}
            className="relative w-7 h-7 flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-surface)] transition-all"
            title="알림 설정"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {notificationCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[var(--danger)] text-white text-[7px] font-bold flex items-center justify-center">
                {notificationCount > 9 ? "9+" : notificationCount}
              </span>
            )}
          </button>
        )}
        {onAddMultiViewTab && (
          <button
            onClick={onAddMultiViewTab}
            className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-surface)] transition-all"
            title="멀티 뷰 탭 추가"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
          </button>
        )}
        {onMarkAllRead && (
          <button
            onClick={onMarkAllRead}
            className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--muted)] hover:text-[var(--success)] hover:bg-[rgba(5,150,105,0.06)] transition-all"
            title="전체 읽음 처리 (M)"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        )}
        {(onExport || onToggleExport) && (
          <button
            onClick={onToggleExport || onExport}
            className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-surface)] transition-all"
            title="내보내기 (E)"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
        )}
        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-surface)] transition-all"
            title="테마 설정"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
          </button>
        )}
        {onShowHelp && (
          <button
            onClick={onShowHelp}
            className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-surface)] transition-all text-[11px] font-bold"
            title="단축키 도움말 (?)"
          >
            ?
          </button>
        )}
      </div>

      <div className="topbar-divider" />

      {/* Countdown + Ingest */}
      <div className="flex items-center gap-2 shrink-0">
        {countdown > 0 && !ingesting && (
          <span className="text-[10px] text-[var(--muted)] tabular-nums font-medium">
            {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, "0")}
          </span>
        )}
        <button
          onClick={onIngest}
          disabled={ingesting}
          className={`flex items-center gap-1.5 px-3.5 py-[7px] text-[10px] font-bold rounded-[var(--radius-sm)] transition-all ripple-btn ${
            ingesting
              ? "metal-btn !border-[var(--border)] text-[var(--muted)] cursor-wait"
              : "btn-primary ingest-pulse"
          }`}
        >
          {ingesting ? (
            <>
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              수집 중...
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

      <div className="topbar-divider" />

      {/* Dark toggle + Updated */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          ref={themeToggleRef}
          onClick={onToggleDark}
          className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-all"
          title={darkMode ? "라이트 모드 (D)" : "다크 모드 (D)"}
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
        {lastUpdated && (
          <span className="text-[9px] text-[var(--muted)] whitespace-nowrap tabular-nums">
            {updatedAgo()}
          </span>
        )}
      </div>
    </header>
  );
}
