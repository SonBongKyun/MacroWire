"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Bell,
  BookOpenText,
  BriefcaseBusiness,
  Calculator,
  ChartNoAxesCombined,
  ChevronDown,
  CircleHelp,
  FileText,
  FlaskConical,
  LayoutDashboard,
  Lightbulb,
  Menu,
  Newspaper,
  PanelLeftClose,
  Radio,
  RefreshCw,
  ScanText,
  Search,
  Siren,
  X,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { useVisibleInterval } from "@/hooks/useVisibleInterval";

export type MainTab = "dashboard" | "news" | "markets" | "analytics" | "ai" | "research" | "portfolio";

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
  unreadCount?: number;
  tags?: string[];
  onToggleSplit?: () => void;
  splitView?: boolean;
  onToggleCalculator?: () => void;
  calculatorOpen?: boolean;
  onOpenWeeklyReport?: () => void;
  onOpenNewsletter?: () => void;
  onToggleMemo?: () => void;
  memoOpen?: boolean;
  onToggleAlertFeed?: () => void;
  alertFeedOpen?: boolean;
  breakingCountdown?: number;
  lastBreakingUpdate?: string | null;
}

const SEARCH_HISTORY_KEY = "macro-wire-search-history";

const tabs = [
  { key: "dashboard" as const, label: "데스크", shortLabel: "데스크", icon: LayoutDashboard },
  { key: "news" as const, label: "와이어", shortLabel: "와이어", icon: Newspaper },
  { key: "markets" as const, label: "마켓", shortLabel: "마켓", icon: ChartNoAxesCombined },
  { key: "analytics" as const, label: "분석", shortLabel: "분석", icon: Activity },
  { key: "ai" as const, label: "브리핑", shortLabel: "브리핑", icon: ScanText },
  { key: "research" as const, label: "리서치", shortLabel: "리서치", icon: FlaskConical },
  { key: "portfolio" as const, label: "포트폴리오", shortLabel: "자산", icon: BriefcaseBusiness },
];

const mobilePrimaryTabs = tabs.filter((tab) =>
  ["dashboard", "news", "markets", "ai"].includes(tab.key)
);
const mobileMoreTabs = tabs.filter((tab) =>
  ["analytics", "research", "portfolio"].includes(tab.key)
);

function formatCountdown(value: number) {
  const safe = Math.max(0, value);
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

export function PlatformNav(props: PlatformNavProps) {
  const {
    activeTab,
    onTabChange,
    searchQuery,
    onSearchChange,
    onIngest,
    ingesting,
    countdown,
    lastUpdated,
    onOpenPalette,
    onShowHelp,
    notificationCount,
    onToggleNotifications,
    newArticleCount,
    unreadCount = 0,
    tags = [],
    onToggleSplit,
    splitView = false,
    onToggleCalculator,
    calculatorOpen = false,
    onOpenWeeklyReport,
    onOpenNewsletter,
    onToggleMemo,
    memoOpen = false,
    onToggleAlertFeed,
    alertFeedOpen = false,
    breakingCountdown = 0,
    lastBreakingUpdate,
  } = props;

  const [reportDropdownOpen, setReportDropdownOpen] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [now, setNow] = useState(0);
  const reportDropdownRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNow(Date.now());
    try {
      const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
      if (stored) setSearchHistory(JSON.parse(stored));
    } catch {
      setSearchHistory([]);
    }
  }, []);

  useVisibleInterval(
    useCallback(() => setNow(Date.now()), []),
    60_000
  );

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowAutocomplete(false);
      }
      if (reportDropdownRef.current && !reportDropdownRef.current.contains(event.target as Node)) {
        setReportDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenPalette();
      }
      if (event.key === "Escape") {
        setMobileMoreOpen(false);
        setReportDropdownOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onOpenPalette]);

  const matchingTags = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];
    return tags.filter((tag) => tag.toLowerCase().includes(query)).slice(0, 6);
  }, [searchQuery, tags]);

  const recentSearches = useMemo(() => searchHistory.slice(0, 4), [searchHistory]);
  const shouldShowDropdown =
    searchFocused &&
    showAutocomplete &&
    searchQuery.trim().length > 0 &&
    (matchingTags.length > 0 || recentSearches.length > 0);

  const saveSearchHistory = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setSearchHistory((previous) => {
      const next = [trimmed, ...previous.filter((item) => item !== trimmed)].slice(0, 10);
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const selectSuggestion = useCallback((value: string) => {
    onSearchChange(value);
    saveSearchHistory(value);
    setShowAutocomplete(false);
  }, [onSearchChange, saveSearchHistory]);

  const updatedAgo = useMemo(() => {
    if (!lastUpdated || !now) return "동기화 대기";
    const minutes = Math.max(0, Math.floor((now - new Date(lastUpdated).getTime()) / 60_000));
    if (minutes < 1) return "방금 동기화";
    if (minutes < 60) return `${minutes}분 전 동기화`;
    return `${Math.floor(minutes / 60)}시간 전 동기화`;
  }, [lastUpdated, now]);

  const newsCount = newArticleCount || unreadCount;

  return (
    <>
      <header className="wire-header" data-testid="wire-header">
        <div className="wire-brand">
          <Logo size="sm" />
          <span className="wire-brand-meta">서울 · 글로벌 데스크</span>
        </div>

        <nav className="platform-tabs" aria-label="주요 화면">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            const badge = tab.key === "news" ? newsCount : 0;
            return (
              <button
                key={tab.key}
                type="button"
                className={`wire-tab ${isActive ? "is-active" : ""}`}
                onClick={() => onTabChange(tab.key)}
                aria-current={isActive ? "page" : undefined}
                title={tab.label}
              >
                <Icon aria-hidden="true" size={15} strokeWidth={1.8} />
                <span>{tab.label}</span>
                {badge > 0 && (
                  <span className={`wire-count ${newArticleCount > 0 ? "is-new" : ""}`}>
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="wire-header-spacer" />

        <div ref={searchContainerRef} className="wire-search">
          <Search aria-hidden="true" size={15} strokeWidth={1.8} />
          <input
            id="wire-search"
            type="search"
            aria-label="기사, 태그, 소스 검색"
            placeholder="헤드라인, 태그, 소스"
            value={searchQuery}
            onChange={(event) => {
              onSearchChange(event.target.value);
              setShowAutocomplete(true);
            }}
            onFocus={() => {
              setSearchFocused(true);
              setShowAutocomplete(true);
            }}
            onBlur={() => window.setTimeout(() => setSearchFocused(false), 150)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && searchQuery.trim()) {
                saveSearchHistory(searchQuery);
                setShowAutocomplete(false);
                event.currentTarget.blur();
              }
              if (event.key === "Escape") {
                setShowAutocomplete(false);
                event.currentTarget.blur();
              }
            }}
          />
          {searchQuery ? (
            <button type="button" className="wire-search-clear" onClick={() => onSearchChange("")} aria-label="검색어 지우기">
              <X size={14} />
            </button>
          ) : (
            <kbd>Ctrl K</kbd>
          )}

          {shouldShowDropdown && (
            <div className="wire-search-results">
              {matchingTags.length > 0 && (
                <div className="wire-search-group">
                  <span className="wire-search-label">태그</span>
                  {matchingTags.map((tag) => (
                    <button type="button" key={tag} onMouseDown={(event) => {
                      event.preventDefault();
                      selectSuggestion(tag);
                    }}>
                      <span>#</span>
                      {tag}
                    </button>
                  ))}
                </div>
              )}
              {recentSearches.length > 0 && (
                <div className="wire-search-group">
                  <span className="wire-search-label">최근 검색</span>
                  {recentSearches.map((query) => (
                    <button type="button" key={query} onMouseDown={(event) => {
                      event.preventDefault();
                      selectSuggestion(query);
                    }}>
                      <BookOpenText size={13} />
                      {query}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="wire-live" title={lastBreakingUpdate ? `최근 수집 데이터 ${new Date(lastBreakingUpdate).toLocaleTimeString("ko-KR")}` : "새 기사 자동 확인 대기 중"}>
          <span className="wire-live-dot" aria-hidden="true" />
          <span>수신</span>
          <b>{breakingCountdown}s</b>
        </div>

        <div className="wire-tools" aria-label="빠른 도구">
          <button type="button" onClick={onToggleNotifications} aria-label="알림 규칙" title="알림 규칙">
            <Bell size={17} />
            {notificationCount > 0 && <span className="tool-dot" />}
          </button>
          {onToggleAlertFeed && (
            <button type="button" className={alertFeedOpen ? "is-active" : ""} onClick={onToggleAlertFeed} aria-label="알림 피드" title="알림 피드">
              <Siren size={17} />
            </button>
          )}
          {activeTab === "news" && onToggleSplit && (
            <button type="button" className={splitView ? "is-active" : ""} onClick={onToggleSplit} aria-label="분할 보기" title="분할 보기">
              <PanelLeftClose size={17} />
            </button>
          )}
          {onToggleCalculator && (
            <button type="button" className={calculatorOpen ? "is-active" : ""} onClick={onToggleCalculator} aria-label="환율 계산기" title="환율 계산기">
              <Calculator size={17} />
            </button>
          )}
          {onToggleMemo && (
            <button type="button" className={memoOpen ? "is-active" : ""} onClick={onToggleMemo} aria-label="인사이트 메모" title="인사이트 메모">
              <Lightbulb size={17} />
            </button>
          )}

          {(onOpenWeeklyReport || onOpenNewsletter) && (
            <div ref={reportDropdownRef} className="wire-report-menu">
              <button
                type="button"
                className={reportDropdownOpen ? "is-active" : ""}
                onClick={() => setReportDropdownOpen((open) => !open)}
                aria-label="리포트 메뉴"
                aria-expanded={reportDropdownOpen}
                title="리포트"
              >
                <FileText size={17} />
                <ChevronDown size={12} />
              </button>
              {reportDropdownOpen && (
                <div className="wire-tool-popover">
                  {onOpenWeeklyReport && (
                    <button type="button" onClick={() => {
                      setReportDropdownOpen(false);
                      onOpenWeeklyReport();
                    }}>
                      <FileText size={15} />
                      주간 리포트
                    </button>
                  )}
                  {onOpenNewsletter && (
                    <button type="button" onClick={() => {
                      setReportDropdownOpen(false);
                      onOpenNewsletter();
                    }}>
                      <BookOpenText size={15} />
                      뉴스레터 생성
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          className="wire-mobile-search"
          onClick={onOpenPalette}
          aria-label="검색 열기"
        >
          <Search size={18} />
        </button>

        <button
          type="button"
          className="wire-refresh"
          onClick={onIngest}
          disabled={ingesting}
          aria-label={ingesting ? "뉴스 확인 중" : "뉴스 새로고침"}
          title={`${updatedAgo} · 다음 확인 ${formatCountdown(countdown)}`}
        >
          <RefreshCw size={17} className={ingesting ? "is-spinning" : ""} />
          <span>{ingesting ? "확인 중" : formatCountdown(countdown)}</span>
        </button>
      </header>

      <nav className="mobile-tabbar" aria-label="모바일 주요 화면">
        {mobilePrimaryTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              type="button"
              key={tab.key}
              className={isActive ? "is-active" : ""}
              onClick={() => {
                onTabChange(tab.key);
                setMobileMoreOpen(false);
              }}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="mobile-tab-icon">
                <Icon size={20} strokeWidth={1.8} />
                {tab.key === "news" && newsCount > 0 && <i>{newsCount > 99 ? "99+" : newsCount}</i>}
              </span>
              <span>{tab.shortLabel}</span>
            </button>
          );
        })}
        <button
          type="button"
          className={mobileMoreOpen || mobileMoreTabs.some((tab) => tab.key === activeTab) ? "is-active" : ""}
          onClick={() => setMobileMoreOpen((open) => !open)}
          aria-expanded={mobileMoreOpen}
        >
          <Menu size={20} strokeWidth={1.8} />
          <span>더보기</span>
        </button>
      </nav>

      {mobileMoreOpen && (
        <div className="mobile-more-backdrop" onClick={() => setMobileMoreOpen(false)}>
          <div className="mobile-more-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="mobile-sheet-handle" />
            <div className="mobile-sheet-head">
              <div>
                <strong>도구</strong>
                <span>{updatedAgo}</span>
              </div>
              <button type="button" onClick={() => setMobileMoreOpen(false)} aria-label="더보기 닫기">
                <X size={19} />
              </button>
            </div>

            <div className="mobile-more-grid">
              {mobileMoreTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button type="button" key={tab.key} className={activeTab === tab.key ? "is-active" : ""} onClick={() => {
                    onTabChange(tab.key);
                    setMobileMoreOpen(false);
                  }}>
                    <Icon size={20} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
              {onToggleAlertFeed && (
                <button type="button" onClick={() => {
                  onToggleAlertFeed();
                  setMobileMoreOpen(false);
                }}>
                  <Siren size={20} />
                  <span>알림 피드</span>
                </button>
              )}
              <button type="button" onClick={() => {
                onToggleNotifications();
                setMobileMoreOpen(false);
              }}>
                <Bell size={20} />
                <span>알림 규칙</span>
              </button>
              {onToggleCalculator && (
                <button type="button" onClick={() => {
                  onToggleCalculator();
                  setMobileMoreOpen(false);
                }}>
                  <Calculator size={20} />
                  <span>환율 계산기</span>
                </button>
              )}
              {onToggleMemo && (
                <button type="button" onClick={() => {
                  onToggleMemo();
                  setMobileMoreOpen(false);
                }}>
                  <Lightbulb size={20} />
                  <span>인사이트 메모</span>
                </button>
              )}
              {onOpenWeeklyReport && (
                <button type="button" onClick={() => {
                  onOpenWeeklyReport();
                  setMobileMoreOpen(false);
                }}>
                  <FileText size={20} />
                  <span>주간 리포트</span>
                </button>
              )}
              <button type="button" onClick={() => {
                onShowHelp();
                setMobileMoreOpen(false);
              }}>
                <CircleHelp size={20} />
                <span>단축키</span>
              </button>
            </div>

            <div className="mobile-live-row">
              <Radio size={16} />
              <span>피드 자동 확인</span>
              <b>{breakingCountdown}초 후 확인</b>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
