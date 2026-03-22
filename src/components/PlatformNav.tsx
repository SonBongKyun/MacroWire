"use client";

import { useEffect, useState } from "react";

export type MainTab = "dashboard" | "news" | "markets" | "analytics";

interface PlatformNavProps {
  activeTab: MainTab;
  onTabChange: (tab: MainTab) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  darkMode: boolean;
  onToggleDark: () => void;
  onIngest: () => void;
  ingesting: boolean;
  countdown: number;
  lastUpdated: string | null;
  onOpenPalette: () => void;
  onShowHelp: () => void;
  themeToggleRef: React.RefObject<HTMLButtonElement | null>;
  notificationCount: number;
  onToggleNotifications: () => void;
  newArticleCount: number;
}

const tabs: { key: MainTab; label: string; icon: React.ReactNode }[] = [
  {
    key: "dashboard",
    label: "\uB300\uC2DC\uBCF4\uB4DC",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
      </svg>
    ),
  },
  {
    key: "news",
    label: "\uB274\uC2A4",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
      </svg>
    ),
  },
  {
    key: "markets",
    label: "\uC2DC\uC7A5",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    key: "analytics",
    label: "\uBD84\uC11D",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
];

export function PlatformNav({
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  darkMode,
  onToggleDark,
  onIngest,
  ingesting,
  countdown,
  lastUpdated,
  onOpenPalette,
  onShowHelp,
  themeToggleRef,
  notificationCount,
  onToggleNotifications,
  newArticleCount,
}: PlatformNavProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  function updatedAgo(): string {
    if (!lastUpdated) return "";
    const diff = now - new Date(lastUpdated).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "\uBC29\uAE08";
    if (mins < 60) return `${mins}\uBD84 \uC804`;
    return `${Math.floor(mins / 60)}\uC2DC\uAC04 \uC804`;
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        onOpenPalette();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onOpenPalette]);

  return (
    <header className="relative flex items-center gap-3 px-4 h-[56px] glass-header shrink-0 select-none z-20">
      {/* Logo */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="logo-mark">
          <span style={{ position: "relative", zIndex: 1 }}>MW</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[13px] font-extrabold leading-none tracking-[-0.03em] text-[var(--foreground-bright)]">
            Macro Wire
          </span>
          <span className="text-[8px] font-medium leading-none mt-[3px] text-[var(--muted)] tracking-[0.04em] uppercase">
            Economic Intelligence
          </span>
        </div>
      </div>

      <div className="topbar-divider" />

      {/* Center: Tab Navigation */}
      <nav className="flex items-center gap-0.5 shrink-0">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`relative flex items-center gap-1.5 px-4 py-2 text-[13px] rounded-[var(--radius-sm)] transition-all ${
                isActive
                  ? "font-bold text-[var(--accent)] bg-[var(--accent-surface)]"
                  : "font-medium text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.key === "news" && newArticleCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-bold rounded-full bg-[var(--accent)] text-white leading-none">
                  {newArticleCount > 99 ? "99+" : newArticleCount}
                </span>
              )}
              {isActive && (
                <span
                  className="absolute bottom-0 left-2 right-2 h-[3px] rounded-full"
                  style={{ background: "var(--accent-gradient, var(--accent))" }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side: Search */}
      <div className="relative shrink-0" style={{ width: 260, maxWidth: 260 }}>
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--muted)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          id="wire-search"
          type="text"
          placeholder="\uAE30\uC0AC, \uD0DC\uADF8, \uC18C\uC2A4 \uAC80\uC0C9..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-[var(--surface-active)] border border-[var(--border)] rounded-[var(--radius-md)] pl-8 pr-14 py-[6px] text-[12px] placeholder-[var(--muted)] focus:outline-none search-input transition-all"
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {searchQuery ? (
            <button
              onClick={() => onSearchChange("")}
              className="text-[var(--muted)] hover:text-[var(--foreground)] text-xs w-4 h-4 flex items-center justify-center rounded-full hover:bg-[var(--surface-hover)] transition-colors"
            >
              ✕
            </button>
          ) : (
            <kbd
              className="kbd-key"
              style={{ fontSize: "9px", padding: "1px 4px", minWidth: "auto", height: "16px" }}
            >
              Ctrl+K
            </kbd>
          )}
        </div>
      </div>

      <div className="topbar-divider" />

      {/* Countdown + Refresh */}
      <div className="flex items-center gap-1.5 shrink-0">
        {countdown > 0 && !ingesting && (
          <span className="text-[10px] text-[var(--muted)] tabular-nums font-medium">
            {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, "0")}
          </span>
        )}
        <button
          onClick={onIngest}
          disabled={ingesting}
          className={`flex items-center gap-1.5 px-3 py-[5px] text-[11px] font-bold rounded-[var(--radius-sm)] transition-all ripple-btn ${
            ingesting
              ? "metal-btn !border-[var(--border)] text-[var(--muted)] cursor-wait"
              : "btn-primary ingest-pulse"
          }`}
        >
          {ingesting ? (
            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
          <span>{ingesting ? "\uC218\uC9D1\uC911..." : "\uC0C8\uB85C\uACE0\uCE68"}</span>
        </button>
        {lastUpdated && (
          <span className="text-[9px] text-[var(--muted)] whitespace-nowrap tabular-nums">
            {updatedAgo()}
          </span>
        )}
      </div>

      <div className="topbar-divider" />

      {/* Dark mode toggle */}
      <button
        ref={themeToggleRef}
        onClick={onToggleDark}
        className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-all shrink-0"
        data-tip={darkMode ? "\uB77C\uC774\uD2B8 \uBAA8\uB4DC" : "\uB2E4\uD06C \uBAA8\uB4DC"}
        title={darkMode ? "\uB77C\uC774\uD2B8 \uBAA8\uB4DC" : "\uB2E4\uD06C \uBAA8\uB4DC"}
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

      {/* Notification bell */}
      <button
        onClick={onToggleNotifications}
        className="relative w-8 h-8 flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-surface)] transition-all shrink-0"
        data-tip="\uC54C\uB9BC"
        title="\uC54C\uB9BC"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {notificationCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[var(--danger)] text-white text-[8px] font-bold flex items-center justify-center">
            {notificationCount > 9 ? "9+" : notificationCount}
          </span>
        )}
      </button>

      {/* Help button */}
      <button
        onClick={onShowHelp}
        className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-surface)] transition-all text-[12px] font-bold shrink-0"
        data-tip="\uB2E8\uCD95\uD0A4 \uB3C4\uC6C0\uB9D0 (?)"
        title="\uB2E8\uCD95\uD0A4 \uB3C4\uC6C0\uB9D0 (?)"
      >
        ?
      </button>
    </header>
  );
}
