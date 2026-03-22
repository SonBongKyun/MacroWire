"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";

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
  tags?: string[];
  onToggleSplit?: () => void;
  splitView?: boolean;
}

const SEARCH_HISTORY_KEY = "ryzm-finance-search-history";

const tabs: { key: MainTab; label: string }[] = [
  { key: "dashboard", label: "\uD648" },
  { key: "news", label: "\uB274\uC2A4" },
  { key: "markets", label: "\uC2DC\uC7A5" },
  { key: "analytics", label: "\uBD84\uC11D" },
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
  tags = [],
  onToggleSplit,
  splitView = false,
}: PlatformNavProps) {
  const [now, setNow] = useState(Date.now());
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const autocompleteRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Load search history
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
      if (stored) setSearchHistory(JSON.parse(stored));
    } catch {}
  }, []);

  // Close autocomplete on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowAutocomplete(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const matchingTags = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return tags.filter((t) => t.toLowerCase().includes(q));
  }, [searchQuery, tags]);

  const recentSearches = useMemo(() => {
    return searchHistory.slice(0, 5);
  }, [searchHistory]);

  const shouldShowDropdown = searchFocused && searchQuery.trim().length > 0 && (matchingTags.length > 0 || recentSearches.length > 0);

  const saveSearchHistory = useCallback((query: string) => {
    if (!query.trim()) return;
    setSearchHistory((prev) => {
      const filtered = prev.filter((h) => h !== query);
      const next = [query, ...filtered].slice(0, 10);
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      saveSearchHistory(searchQuery.trim());
      setShowAutocomplete(false);
      (e.target as HTMLInputElement).blur();
    }
    if (e.key === "Escape") {
      setShowAutocomplete(false);
      (e.target as HTMLInputElement).blur();
    }
  }, [searchQuery, saveSearchHistory]);

  const handleSuggestionClick = useCallback((value: string) => {
    onSearchChange(value);
    saveSearchHistory(value);
    setShowAutocomplete(false);
  }, [onSearchChange, saveSearchHistory]);

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
    <header className="relative flex items-center gap-3 px-4 h-[48px] glass-header shrink-0 select-none z-20">
      {/* Logo — text only */}
      <div className="flex items-center gap-1 shrink-0">
        <span
          style={{
            fontFamily: "var(--font-heading), 'Space Grotesk', sans-serif",
            fontSize: 15,
            fontWeight: 700,
            color: "#C9A96E",
            letterSpacing: "0.06em",
          }}
        >
          RYZM
        </span>
        <span
          style={{
            fontFamily: "var(--font-heading), 'Space Grotesk', sans-serif",
            fontSize: 15,
            fontWeight: 300,
            color: "#8C8C91",
            letterSpacing: "0.06em",
          }}
        >
          FINANCE
        </span>
      </div>

      <div className="topbar-divider" />

      {/* Tab Navigation */}
      <nav className="flex items-center h-full shrink-0">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className="relative h-full flex items-center transition-colors"
              style={{
                padding: "0 20px",
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? "var(--accent)" : "var(--muted)",
              }}
            >
              {tab.label}
              {tab.key === "news" && newArticleCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[9px] font-bold rounded-full bg-[var(--danger)] text-white leading-none">
                  {newArticleCount > 99 ? "99+" : newArticleCount}
                </span>
              )}
              {isActive && (
                <span
                  className="absolute bottom-0 left-5 right-5"
                  style={{ height: 2, background: "#C9A96E" }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Split View Toggle — news tab only */}
      {activeTab === "news" && onToggleSplit && (
        <button
          onClick={onToggleSplit}
          className="flex items-center justify-center w-7 h-7 shrink-0 transition-all"
          style={{
            borderRadius: 2,
            border: splitView ? "1px solid #C9A96E" : "1px solid transparent",
            background: splitView ? "rgba(201,169,110,0.1)" : "transparent",
            color: splitView ? "#C9A96E" : "#8C8C91",
            cursor: "pointer",
          }}
          title="분할 뷰 (Ctrl+Shift+S)"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="1" y="2" width="14" height="12" rx="1" />
            <line x1="5.5" y1="2" x2="5.5" y2="14" />
            <line x1="10.5" y1="2" x2="10.5" y2="14" />
          </svg>
        </button>
      )}

      {/* Search */}
      <div ref={searchContainerRef} className="relative shrink-0" style={{ width: 240 }}>
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
          placeholder={"\uAE30\uC0AC, \uD0DC\uADF8, \uC18C\uC2A4 \uAC80\uC0C9..."}
          value={searchQuery}
          onChange={(e) => { onSearchChange(e.target.value); setShowAutocomplete(true); }}
          onFocus={() => { setSearchFocused(true); setShowAutocomplete(true); }}
          onBlur={() => { setTimeout(() => setSearchFocused(false), 150); }}
          onKeyDown={handleSearchKeyDown}
          className="w-full bg-[var(--surface-active)] border border-[var(--border)] rounded-[var(--radius-md)] pl-8 pr-14 py-[5px] text-[12px] placeholder-[var(--muted)] focus:outline-none search-input transition-all"
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {searchQuery ? (
            <button
              onClick={() => onSearchChange("")}
              className="text-[var(--muted)] hover:text-[var(--foreground)] text-xs w-4 h-4 flex items-center justify-center rounded-full hover:bg-[var(--surface-hover)] transition-colors"
            >
              x
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

        {/* Autocomplete dropdown */}
        {shouldShowDropdown && showAutocomplete && (
          <div
            ref={autocompleteRef}
            className="absolute top-full left-0 right-0 mt-1 glass-modal rounded-[var(--radius-md)] border border-[var(--border)] shadow-lg overflow-hidden z-50"
            style={{ maxHeight: 250, overflowY: "auto" }}
          >
            {matchingTags.length > 0 && (
              <div className="px-3 pt-2.5 pb-1">
                <span className="text-[9px] font-bold text-[var(--muted)] uppercase tracking-wider">{"\uD0DC\uADF8"}</span>
                <div className="mt-1.5 flex flex-col">
                  {matchingTags.map((tag) => (
                    <button
                      key={tag}
                      onMouseDown={(e) => { e.preventDefault(); handleSuggestionClick(tag); }}
                      className="text-left px-2 py-1.5 text-[11px] text-[var(--foreground)] hover:bg-[var(--surface-hover)] rounded-[var(--radius-sm)] transition-colors flex items-center gap-2"
                    >
                      <span className="text-[var(--accent)] text-[10px]">#</span>
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {recentSearches.length > 0 && (
              <div className="px-3 pt-2 pb-2.5">
                {matchingTags.length > 0 && <div className="border-t border-[var(--border-subtle)] mb-2" />}
                <span className="text-[9px] font-bold text-[var(--muted)] uppercase tracking-wider">{"\uCD5C\uADFC \uAC80\uC0C9"}</span>
                <div className="mt-1.5 flex flex-col">
                  {recentSearches.map((q, i) => (
                    <button
                      key={`${q}-${i}`}
                      onMouseDown={(e) => { e.preventDefault(); handleSuggestionClick(q); }}
                      className="text-left px-2 py-1.5 text-[11px] text-[var(--foreground-secondary)] hover:bg-[var(--surface-hover)] rounded-[var(--radius-sm)] transition-colors flex items-center gap-2"
                    >
                      <svg className="w-3 h-3 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="topbar-divider" />

      {/* Refresh */}
      <div className="flex items-center gap-1.5 shrink-0">
        {countdown > 0 && !ingesting && (
          <span className="text-[10px] text-[var(--muted)] tabular-nums font-medium">
            {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, "0")}
          </span>
        )}
        <button
          onClick={onIngest}
          disabled={ingesting}
          className={`flex items-center justify-center w-7 h-7 rounded-[var(--radius-sm)] transition-all ${
            ingesting
              ? "text-[var(--muted)] cursor-wait"
              : "text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--surface-hover)]"
          }`}
          title={ingesting ? "\uC218\uC9D1\uC911..." : "\uC0C8\uB85C\uACE0\uCE68"}
        >
          {ingesting ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
        </button>
      </div>

      {/* Dark mode only — no toggle */}
    </header>
  );
}
