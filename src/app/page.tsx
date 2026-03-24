"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { Source, Article, ArticlesResponse, IngestResult } from "@/types";
import { KeyboardHelp } from "@/components/KeyboardHelp";
import { MarketTicker } from "@/components/MarketTicker";
import { CommandPalette } from "@/components/CommandPalette";
import { useCollections } from "@/hooks/useCollections";
import { AddSourceModal } from "@/components/AddSourceModal";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useNotifications } from "@/hooks/useNotifications";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useThemeCustom } from "@/hooks/useThemeCustom";
import { useMultiView } from "@/hooks/useMultiView";
import { useDashboardLayout } from "@/hooks/useDashboardLayout";
import { useReadingGoals } from "@/hooks/useReadingGoals";
import { NotificationPanel } from "@/components/NotificationPanel";
import { ThemeSelector } from "@/components/ThemeSelector";
import { ExportPanel } from "@/components/ExportPanel";
import { PlatformNav, type MainTab } from "@/components/PlatformNav";
import { CurrencyCalculator } from "@/components/CurrencyCalculator";
import DashboardTab from "@/components/DashboardTab";
import { NewsTab } from "@/components/NewsTab";
import { MarketsTab } from "@/components/MarketsTab";
import { AnalyticsTab } from "@/components/AnalyticsTab";
import { ToastProvider, useToast } from "@/components/Toast";
import { SplitViewPanel } from "@/components/SplitViewPanel";
import { ArticleList } from "@/components/ArticleList";
import { ArticleDetail } from "@/components/ArticleDetail";
import { WeeklyReport } from "@/components/WeeklyReport";
import { NewsletterGenerator } from "@/components/NewsletterGenerator";
import { CuratedFeed } from "@/components/CuratedFeed";
import { InsightMemo } from "@/components/InsightMemo";
import { AlertFeed } from "@/components/AlertFeed";
import { FinancialCalculators } from "@/components/FinancialCalculators";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const POLL_INTERVAL = 5 * 60;

function getMarketStatusForBar(): { open: boolean; label: string } {
  const now = new Date();
  const kst = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  const day = kst.getDay();
  const hour = kst.getHours();
  const minute = kst.getMinutes();
  const timeVal = hour * 60 + minute;
  const isWeekday = day >= 1 && day <= 5;
  const isOpen = isWeekday && timeVal >= 540 && timeVal < 930;
  return { open: isOpen, label: isOpen ? "열림" : "마감" };
}

function StatusBar({ enabledSources, totalSources, articleCount, unreadCount, lastUpdated, activeFilterCount }: {
  enabledSources: number; totalSources: number; articleCount: number; unreadCount: number; lastUpdated: string | null; activeFilterCount: number;
}) {
  const [clock, setClock] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [marketStatus, setMarketStatus] = useState(getMarketStatusForBar);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      setDateStr(`${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`);
      setMarketStatus(getMarketStatusForBar());
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const ingestTime = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
    : "--:--";

  const sep = <span className="text-[8px] text-[var(--border-strong)] opacity-50 font-mono">&middot;</span>;

  return (
    <div className="status-bar px-5 h-7 flex items-center gap-2 shrink-0 select-none font-mono">
      <span className="text-[10px] tabular-nums text-[var(--muted)] font-medium">{dateStr}</span>
      {sep}
      <span className="text-[10px] tabular-nums text-[var(--foreground-secondary)] font-medium">{clock}</span>
      {sep}
      <span className={`text-[10px] font-bold ${marketStatus.open ? "text-[var(--success)]" : "text-[var(--muted)]"}`}>
        <span className={marketStatus.open ? "stat-dot-live" : ""} style={{ display: "inline-block" }}>{marketStatus.open ? "\u25CF" : "\u25CB"}</span> {marketStatus.label}
      </span>
      {sep}
      <span className="text-[10px] tabular-nums text-[var(--muted)]">{enabledSources}/{totalSources} 소스</span>
      {sep}
      <span className="text-[10px] tabular-nums text-[var(--muted)]" style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ display: "inline-block", verticalAlign: "middle" }}>
          <rect x="1" y="5" width="2" height="5" rx="0.5" fill="currentColor" opacity="0.5" />
          <rect x="4" y="3" width="2" height="7" rx="0.5" fill="currentColor" opacity="0.7" />
          <rect x="7" y="1" width="2" height="9" rx="0.5" fill="currentColor" />
        </svg>
        {articleCount}건
      </span>
      {unreadCount > 0 && (
        <>
          {sep}
          <span className="text-[10px] tabular-nums font-semibold text-[var(--accent)]">{unreadCount} 미독</span>
        </>
      )}
      {activeFilterCount > 0 && (
        <>
          {sep}
          <span className="text-[10px] tabular-nums font-semibold" style={{ background: "rgba(201,169,110,0.15)", color: "#C9A96E", padding: "1px 6px", borderRadius: 2, fontSize: 9 }}>{activeFilterCount} 필터</span>
        </>
      )}
      {sep}
      <span className="text-[9px] tabular-nums text-[var(--muted)] opacity-70">수집 {ingestTime}</span>
      <div className="flex-1" />
      <span className="text-[9px] text-[var(--muted)] opacity-40 tracking-wide">j/k  s  /  Tab  n  h  ?</span>
    </div>
  );
}

export default function Home() {
  return (
    <ToastProvider>
      <HomeInner />
    </ToastProvider>
  );
}

function HomeInner() {
  const { showToast } = useToast();
  // Core data
  const [sources, setSources] = useState<Source[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Platform tab
  const [activeMainTab, setActiveMainTab] = useState<MainTab>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("ryzm-finance-tab") as MainTab) || "dashboard";
    }
    return "dashboard";
  });

  // Filters
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [range, setRange] = useState<"24h" | "7d" | "30d">("24h");
  const [showSaved, setShowSaved] = useState(false);
  const [readFilter, setReadFilter] = useState<"all" | "unread" | "read">("all");
  const [regionFilter, setRegionFilter] = useState<string>("전체");
  const darkMode = true; // RYZM: dark only
  const [countdown, setCountdown] = useState(POLL_INTERVAL);
  const [showHelp, setShowHelp] = useState(false);
  const [newArticleCount, setNewArticleCount] = useState(0);
  const [newArticleIds, setNewArticleIds] = useState<string[]>([]);
  const prevArticleIds = useRef<Set<string>>(new Set());

  // Hooks
  const { store: collectionStore, assignArticle, createCollection, getCollection } = useCollections();
  const watchlist = useWatchlist();
  const notifications = useNotifications();
  const portfolio = usePortfolio();
  const themeCustom = useThemeCustom();
  const multiView = useMultiView();
  const dashboardLayout = useDashboardLayout();
  const readingGoals = useReadingGoals();

  // UI state
  const [addSourceOpen, setAddSourceOpen] = useState(false);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [themeSelectorOpen, setThemeSelectorOpen] = useState(false);
  const [exportPanelOpen, setExportPanelOpen] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "card">("list");
  const [timelineMode, setTimelineMode] = useState(false);
  const [splitView, setSplitView] = useState(false);
  const [weeklyReportOpen, setWeeklyReportOpen] = useState(false);
  const [newsletterOpen, setNewsletterOpen] = useState(false);
  const [curatedFeedOpen, setCuratedFeedOpen] = useState(false);
  const [memoOpen, setMemoOpen] = useState(false);
  const [alertFeedOpen, setAlertFeedOpen] = useState(false);
  const [financialCalcOpen, setFinancialCalcOpen] = useState(false);
  const themeToggleRef = useRef<HTMLButtonElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Persist active tab
  useEffect(() => {
    localStorage.setItem("ryzm-finance-tab", activeMainTab);
  }, [activeMainTab]);

  // Always dark mode (RYZM brand)
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  const toggleDarkMode = useCallback(() => {}, []);

  // Countdown
  useEffect(() => {
    countdownRef.current = setInterval(() => setCountdown((p) => (p > 0 ? p - 1 : 0)), 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, []);

  // Fetch sources
  const fetchSources = useCallback(async () => {
    try {
      const res = await fetch("/api/sources");
      const data = await res.json();
      setSources(Array.isArray(data) ? data : []);
    } catch (err) { console.error("Failed to fetch sources:", err); }
  }, []);

  // Build query
  const buildQuery = useCallback((cursor?: string | null) => {
    const params = new URLSearchParams();
    params.set("range", range);
    params.set("limit", "50");
    if (selectedSourceId) params.set("sourceId", selectedSourceId);
    if (selectedTag) params.set("tag", selectedTag);
    if (searchQuery) params.set("q", searchQuery);
    if (showSaved) params.set("saved", "true");
    if (cursor) params.set("cursor", cursor);
    return params.toString();
  }, [range, selectedSourceId, selectedTag, searchQuery, showSaved]);

  // Fetch articles
  const fetchArticles = useCallback(async (append = false) => {
    setLoading(true);
    try {
      const qs = buildQuery(append ? nextCursor : null);
      const res = await fetch(`/api/articles?${qs}`);
      const json: ArticlesResponse = await res.json();
      const items = Array.isArray(json?.data) ? json.data : [];
      if (append) {
        setArticles((prev) => [...prev, ...items]);
      } else {
        if (prevArticleIds.current.size > 0) {
          const newOnes = items.filter((a: Article) => !prevArticleIds.current.has(a.id));
          if (newOnes.length > 0) {
            setNewArticleCount((prev) => prev + newOnes.length);
            setNewArticleIds((prev) => [...prev, ...newOnes.map((a: Article) => a.id)]);
            if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
              const matched = newOnes.filter((a: Article) => notifications.checkArticle(a));
              if (matched.length > 0) {
                notifications.sendNotification("Ryzm Finance 알림", matched.length === 1 ? matched[0].title : `관심 기사 ${matched.length}건: ${matched[0].title}`);
              } else {
                new Notification("Ryzm Finance", { body: `새 기사 ${newOnes.length}건이 도착했습니다`, icon: "/icon.svg", tag: "ryzm-finance-new" });
              }
            }
          }
        }
        prevArticleIds.current = new Set(items.map((a: Article) => a.id));
        setArticles(items);
        setSelectedArticle(null);
      }
      setNextCursor(json?.nextCursor ?? null);
      setHasMore(json?.hasMore ?? false);
    } catch (err) { console.error("Failed to fetch articles:", err); }
    finally { setLoading(false); }
  }, [buildQuery, nextCursor]);

  // Ingest
  const runIngest = useCallback(async () => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") Notification.requestPermission();
    setIngesting(true);
    try {
      const res = await fetch("/api/ingest", { method: "POST" });
      const result: IngestResult = await res.json();
      setLastUpdated(result.lastUpdated);
      await fetchArticles();
      await fetchSources();
      setCountdown(POLL_INTERVAL);
      showToast(`기사 수집 완료: ${result.added ?? 0}건 추가`);
    } catch (err) { console.error("Ingest failed:", err); showToast("기사 수집 실패", "error"); }
    finally { setIngesting(false); }
  }, [fetchArticles, fetchSources, showToast]);

  const handleAddSource = useCallback(async (data: { name: string; feedUrl: string; category: string }) => {
    try {
      const res = await fetch("/api/sources/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (res.ok) { await fetchSources(); setAddSourceOpen(false); }
    } catch (err) { console.error("Add source failed:", err); }
  }, [fetchSources]);

  const toggleRead = useCallback(async (article: Article) => {
    try {
      const res = await fetch(`/api/articles/${article.id}/read`, { method: "POST" });
      const json = await res.json();
      setArticles((prev) => prev.map((a) => (a.id === article.id ? { ...a, isRead: json.isRead } : a)));
      if (selectedArticle?.id === article.id) setSelectedArticle((prev) => prev ? { ...prev, isRead: json.isRead } : null);
    } catch (err) { console.error("Toggle read failed:", err); }
  }, [selectedArticle]);

  const toggleSave = useCallback(async (article: Article) => {
    try {
      const res = await fetch(`/api/articles/${article.id}/save`, { method: "POST" });
      const json = await res.json();
      setArticles((prev) => prev.map((a) => (a.id === article.id ? { ...a, isSaved: json.isSaved } : a)));
      if (selectedArticle?.id === article.id) setSelectedArticle((prev) => prev ? { ...prev, isSaved: json.isSaved } : null);
      showToast(json.isSaved ? "저장됨" : "저장 해제");
    } catch (err) { console.error("Toggle save failed:", err); }
  }, [selectedArticle, showToast]);

  const selectArticle = useCallback((article: Article) => {
    setSelectedArticle(article);
    setNewArticleCount(0);
    setNewArticleIds((prev) => prev.filter((id) => id !== article.id));
    if (!article.isRead) {
      toggleRead(article);
      readingGoals.incrementRead();
    }
    if (activeMainTab !== "news") setActiveMainTab("news");
  }, [toggleRead, activeMainTab, readingGoals]);

  const markAllRead = useCallback(async () => {
    const unreadIds = articles.filter((a) => !a.isRead).map((a) => a.id);
    if (unreadIds.length === 0) return;
    try {
      await fetch("/api/articles/batch-read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ articleIds: unreadIds }) });
      setArticles((prev) => prev.map((a) => ({ ...a, isRead: true })));
      if (selectedArticle) setSelectedArticle((prev) => (prev ? { ...prev, isRead: true } : null));
      showToast("전체 읽음 처리");
    } catch (err) { console.error("Batch read failed:", err); }
  }, [articles, selectedArticle, showToast]);

  const exportSaved = useCallback(() => {
    const saved = articles.filter((a) => a.isSaved);
    if (saved.length === 0) return;
    const md = saved.map((a, i) => `### ${i + 1}. ${a.title}\n- **출처**: ${a.sourceName}\n- **시간**: ${new Date(a.publishedAt).toLocaleString("ko-KR")}\n- **태그**: ${a.tags.join(", ") || "없음"}\n- **URL**: ${a.url}\n` + (a.summary ? `- **요약**: ${a.summary}\n` : "")).join("\n---\n\n");
    const header = `# Ryzm Finance — 저장된 기사\n\n> 내보내기: ${new Date().toLocaleString("ko-KR")}\n> 총 ${saved.length}건\n\n---\n\n`;
    const blob = new Blob([header + md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ryzm-finance-saved-${new Date().toISOString().slice(0, 10)}.md`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("내보내기 완료");
  }, [articles, showToast]);

  // Initial load
  useEffect(() => { fetchSources(); }, [fetchSources]);

  // Refetch on filter change
  useEffect(() => {
    fetchArticles();
    setNewArticleCount(0);
    setNewArticleIds([]);
  }, [range, selectedSourceId, selectedTag, searchQuery, showSaved]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-poll
  useEffect(() => {
    intervalRef.current = setInterval(() => { setCountdown(POLL_INTERVAL); runIngest(); }, POLL_INTERVAL * 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [runIngest]);

  const handleTagClick = useCallback((tag: string) => {
    setSelectedTag((prev) => (prev === tag ? null : tag));
    setActiveMainTab("news");
  }, []);

  // Command palette
  const handlePaletteAction = useCallback((action: string) => {
    switch (action) {
      case "ingest": runIngest(); break;
      case "markAllRead": markAllRead(); break;
      case "export": exportSaved(); break;
      case "toggleDark": toggleDarkMode(); break;
      case "toggleSaved": setShowSaved((v) => !v); break;
      case "range24h": setRange("24h"); break;
      case "range7d": setRange("7d"); break;
      case "range30d": setRange("30d"); break;
      case "help": setShowHelp(true); break;
      case "analytics": setActiveMainTab("analytics"); break;
      case "watchlist": setActiveMainTab("markets"); break;
      case "addSource": setAddSourceOpen(true); break;
      case "notifications": setNotificationPanelOpen((v) => !v); break;
      case "portfolio": setActiveMainTab("markets"); break;
      case "theme": setThemeSelectorOpen((v) => !v); break;
      case "exportPanel": setExportPanelOpen((v) => !v); break;
      case "weeklyReport": setWeeklyReportOpen(true); break;
      case "newsletter": setNewsletterOpen(true); break;
      case "curatedFeed": setCuratedFeedOpen(true); break;
      case "insightMemo": setMemoOpen((v) => !v); break;
      case "financialCalc": setFinancialCalcOpen((v) => !v); break;
    }
  }, [runIngest, markAllRead, exportSaved, toggleDarkMode]);

  const allTags = ["금리", "물가", "연준", "환율", "미국", "중국", "일본", "유럽", "수출입", "경기", "부동산", "가계부채", "재정", "에너지", "반도체", "AI", "지정학"];

  // Filtered articles
  const REGION_TAGS: Record<string, string[]> = {
    "전체": [],
    "한국": ["경기", "부동산", "가계부채", "재정", "수출입"],
    "미국": ["연준", "미국"],
    "글로벌": ["중국", "일본", "유럽", "지정학"],
    "환율·에너지": ["환율", "에너지"],
  };

  const filteredArticles = useMemo(() => {
    let list = articles;
    if (regionFilter !== "전체") {
      const rTags = REGION_TAGS[regionFilter] || [];
      list = list.filter((a) => a.tags.some((t) => rTags.includes(t)));
    }
    const activeTab = multiView.getActiveTab();
    if (activeTab && activeTab.type !== "all") {
      switch (activeTab.type) {
        case "tag": list = list.filter((a) => a.tags.includes(activeTab.value)); break;
        case "source": list = list.filter((a) => a.sourceName === activeTab.value); break;
        case "search": list = list.filter((a) => a.title.toLowerCase().includes(activeTab.value.toLowerCase())); break;
        case "saved": list = list.filter((a) => a.isSaved); break;
      }
    }
    if (readFilter === "unread") list = list.filter((a) => !a.isRead);
    else if (readFilter === "read") list = list.filter((a) => a.isRead);
    return list;
  }, [articles, regionFilter, multiView, readFilter]);

  // Keyboard shortcuts
  useEffect(() => {
    const TAB_ORDER: MainTab[] = ["dashboard", "news", "markets", "analytics"];
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); setCommandPaletteOpen(true); return; }
      // Ctrl+Shift+S: toggle split view
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "S") { e.preventDefault(); setSplitView((v) => !v); return; }
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      // Shift+W: open weekly report
      if (e.shiftKey && e.key === "W") { e.preventDefault(); setWeeklyReportOpen(true); return; }
      // Shift+C: open curated feed
      if (e.shiftKey && e.key === "C") { e.preventDefault(); setCuratedFeedOpen((v) => !v); return; }
      // Shift+A: open alert feed
      if (e.shiftKey && e.key === "A") { e.preventDefault(); setAlertFeedOpen((v) => !v); return; }
      // Shift+M: open insight memo
      if (e.shiftKey && e.key === "M") { e.preventDefault(); setMemoOpen((v) => !v); return; }
      // Shift+F: open financial calculators
      if (e.shiftKey && e.key === "F") { e.preventDefault(); setFinancialCalcOpen((v) => !v); return; }
      // Tab / Shift+Tab: cycle main tabs
      if (e.key === "Tab") {
        e.preventDefault();
        const curIdx = TAB_ORDER.indexOf(activeMainTab);
        if (e.shiftKey) {
          const prevIdx = curIdx <= 0 ? TAB_ORDER.length - 1 : curIdx - 1;
          setActiveMainTab(TAB_ORDER[prevIdx]);
        } else {
          const nextIdx = curIdx >= TAB_ORDER.length - 1 ? 0 : curIdx + 1;
          setActiveMainTab(TAB_ORDER[nextIdx]);
        }
        return;
      }
      switch (e.key) {
        case "?": e.preventDefault(); setShowHelp((v) => !v); break;
        case "/": e.preventDefault(); document.getElementById("wire-search")?.focus(); break;
        case "j": if (activeMainTab === "news") { e.preventDefault(); const idx = filteredArticles.findIndex((a) => a.id === selectedArticle?.id); const next = idx < 0 ? 0 : Math.min(idx + 1, filteredArticles.length - 1); if (filteredArticles[next]) selectArticle(filteredArticles[next]); } break;
        case "k": if (activeMainTab === "news") { e.preventDefault(); const idx = filteredArticles.findIndex((a) => a.id === selectedArticle?.id); const prev = Math.max(idx - 1, 0); if (filteredArticles[prev]) selectArticle(filteredArticles[prev]); } break;
        case "s": if (selectedArticle) { e.preventDefault(); toggleSave(selectedArticle); } break;
        case "o": if (selectedArticle) { e.preventDefault(); window.open(selectedArticle.url, "_blank"); } break;
        case "n": e.preventDefault(); setActiveMainTab("news"); break;
        case "h": e.preventDefault(); setActiveMainTab("dashboard"); break;
        case "1": e.preventDefault(); setRange("24h"); break;
        case "2": e.preventDefault(); setRange("7d"); break;
        case "3": e.preventDefault(); setRange("30d"); break;
        case "r": e.preventDefault(); if (!ingesting) runIngest(); break;
        case "d": e.preventDefault(); toggleDarkMode(); break;
        case "m": e.preventDefault(); markAllRead(); break;
        case "e": e.preventDefault(); exportSaved(); break;
        case "Escape": setNotificationPanelOpen(false); setThemeSelectorOpen(false); setExportPanelOpen(false); setCalculatorOpen(false); setWeeklyReportOpen(false); setNewsletterOpen(false); setCuratedFeedOpen(false); setMemoOpen(false); setAlertFeedOpen(false); setFinancialCalcOpen(false); break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [ingesting, runIngest, toggleDarkMode, markAllRead, exportSaved, selectedArticle, filteredArticles, selectArticle, toggleSave, activeMainTab, splitView]);

  return (
    <div className="flex flex-col h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Platform Navigation */}
      <PlatformNav
        activeTab={activeMainTab}
        onTabChange={setActiveMainTab}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        darkMode={darkMode}
        onToggleDark={toggleDarkMode}
        onIngest={runIngest}
        ingesting={ingesting}
        countdown={countdown}
        lastUpdated={lastUpdated}
        onOpenPalette={() => setCommandPaletteOpen(true)}
        onShowHelp={() => setShowHelp(true)}
        themeToggleRef={themeToggleRef}
        notificationCount={notifications.store.rules.filter((r) => r.enabled).length}
        onToggleNotifications={() => setNotificationPanelOpen((v) => !v)}
        newArticleCount={newArticleCount}
        tags={allTags}
        onToggleSplit={() => setSplitView((v) => !v)}
        splitView={splitView}
        onToggleCalculator={() => setCalculatorOpen((v) => !v)}
        calculatorOpen={calculatorOpen}
        onOpenWeeklyReport={() => setWeeklyReportOpen(true)}
        onOpenNewsletter={() => setNewsletterOpen(true)}
        onToggleMemo={() => setMemoOpen((v) => !v)}
        memoOpen={memoOpen}
        onToggleAlertFeed={() => setAlertFeedOpen((v) => !v)}
        alertFeedOpen={alertFeedOpen}
      />

      {/* Market Ticker — always visible */}
      <div className="shrink-0 border-b border-[var(--border)]">
        <MarketTicker />
      </div>

      {/* Tab Content */}
      <ErrorBoundary key={activeMainTab}>
      <div className="tab-content-enter flex-1 overflow-hidden">
        {activeMainTab === "dashboard" && (
          <DashboardTab
            articles={articles}
            sources={sources}
            portfolioPrices={portfolio.prices}
            portfolioLoading={portfolio.loading}
            watchlistStore={watchlist.store}
            onSelectArticle={selectArticle}
            onTabChange={(tab) => setActiveMainTab(tab as MainTab)}
            layoutSections={dashboardLayout.currentSections}
            layouts={dashboardLayout.layouts}
            activeLayoutId={dashboardLayout.activeLayoutId}
            onSaveLayout={dashboardLayout.saveLayout}
            onLoadLayout={dashboardLayout.loadLayout}
            onDeleteLayout={dashboardLayout.deleteLayout}
            onToggleSection={dashboardLayout.toggleSection}
            readingGoal={readingGoals.goal}
            readingProgress={readingGoals.progress}
            readingStreak={readingGoals.getStreak()}
            onSetReadingGoal={readingGoals.setGoal}
          />
        )}

        {activeMainTab === "news" && !splitView && (
          <NewsTab
            articles={filteredArticles}
            selectedArticle={selectedArticle}
            loading={loading}
            hasMore={hasMore}
            sources={sources}
            selectedSourceId={selectedSourceId}
            selectedTag={selectedTag}
            range={range}
            showSaved={showSaved}
            readFilter={readFilter}
            regionFilter={regionFilter}
            searchQuery={searchQuery}
            viewMode={viewMode}
            timelineMode={timelineMode}
            newArticleIds={newArticleIds}
            onSelectArticle={selectArticle}
            onSelectSource={(id) => setSelectedSourceId((prev) => (prev === id ? null : id))}
            onSelectTag={(tag) => setSelectedTag((prev) => (prev === tag ? null : tag))}
            onRangeChange={setRange}
            onToggleSaved={() => setShowSaved((v) => !v)}
            onReadFilterChange={setReadFilter}
            onRegionFilterChange={setRegionFilter}
            onLoadMore={() => fetchArticles(true)}
            onToggleSave={toggleSave}
            onToggleRead={toggleRead}
            onTagClick={handleTagClick}
            onViewModeChange={setViewMode}
            onMarkAllRead={markAllRead}
            onExport={exportSaved}
            collectionName={selectedArticle ? getCollection(selectedArticle.id) : ""}
            collectionNames={collectionStore.names}
            onCollectionChange={assignArticle}
            onCreateCollection={createCollection}
          />
        )}

        {activeMainTab === "news" && splitView && (
          <div
            className="flex-1 min-h-0"
            style={{
              display: "grid",
              gridTemplateColumns: "30% 40% 30%",
              height: "100%",
            }}
          >
            {/* Left: Compact Article List */}
            <div className="overflow-y-auto border-r border-[#2D2D32]">
              <ArticleList
                articles={filteredArticles}
                loading={loading}
                selectedArticleId={selectedArticle?.id || null}
                onSelectArticle={selectArticle}
                onToggleSave={toggleSave}
                onToggleRead={toggleRead}
                hasMore={hasMore}
                onLoadMore={() => fetchArticles(true)}
                readFilter={readFilter}
                onReadFilterChange={setReadFilter}
                onTagClick={handleTagClick}
                newArticleIds={newArticleIds}
                viewMode="list"
                onViewModeChange={setViewMode}
              />
            </div>

            {/* Center: Article Detail */}
            <div className="overflow-y-auto border-r border-[#2D2D32]">
              {selectedArticle ? (
                <ArticleDetail
                  article={selectedArticle}
                  onToggleRead={toggleRead}
                  onToggleSave={toggleSave}
                  onTagClick={handleTagClick}
                  collectionName={selectedArticle ? getCollection(selectedArticle.id) : ""}
                  collectionNames={collectionStore.names}
                  onCollectionChange={assignArticle}
                  onCreateCollection={createCollection}
                  articles={filteredArticles}
                  onSelectArticle={selectArticle}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full" style={{ color: "#8C8C91" }}>
                  <div style={{ marginBottom: 12, opacity: 0.3 }}>
                    <svg style={{ width: 36, height: 36 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                    </svg>
                  </div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#EBEBEB" }}>기사를 선택하세요</p>
                </div>
              )}
            </div>

            {/* Right: Secondary Panel */}
            <SplitViewPanel
              portfolioPrices={portfolio.prices}
              portfolioLoading={portfolio.loading}
              articles={articles}
            />
          </div>
        )}

        {activeMainTab === "markets" && (
          <MarketsTab
            portfolioPrices={portfolio.prices}
            portfolioAssets={portfolio.store.assets}
            portfolioLoading={portfolio.loading}
            onAddAsset={portfolio.addAsset}
            onRemoveAsset={portfolio.removeAsset}
            onRefreshPrices={portfolio.fetchPrices}
          />
        )}

        {activeMainTab === "analytics" && (
          <AnalyticsTab articles={articles} />
        )}
      </div>
      </ErrorBoundary>

      {/* Status Bar */}
      <StatusBar
        enabledSources={sources.filter((s) => s.enabled).length}
        totalSources={sources.length}
        articleCount={articles.length}
        unreadCount={articles.filter((a) => !a.isRead).length}
        lastUpdated={lastUpdated}
        activeFilterCount={[selectedSourceId, selectedTag, searchQuery, showSaved && "saved", readFilter !== "all" && "read", regionFilter !== "전체" && "region"].filter(Boolean).length}
      />

      {/* Global Overlays */}
      <KeyboardHelp open={showHelp} onClose={() => setShowHelp(false)} />

      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        articles={articles}
        sources={sources}
        onSelectArticle={selectArticle}
        onSelectSource={(id) => { setSelectedSourceId((prev) => (prev === id ? null : id)); setActiveMainTab("news"); }}
        onSelectTag={(tag) => { setSelectedTag((prev) => (prev === tag ? null : tag)); setActiveMainTab("news"); }}
        onAction={handlePaletteAction}
        tags={allTags}
      />

      {addSourceOpen && (
        <AddSourceModal open={addSourceOpen} onClose={() => setAddSourceOpen(false)} onAdd={handleAddSource} />
      )}

      {/* Floating Panels */}
      {notificationPanelOpen && (
        <div className="fixed right-4 top-14 z-40 animate-fade-in">
          <NotificationPanel
            store={notifications.store}
            onAddRule={notifications.addRule}
            onRemoveRule={notifications.removeRule}
            onToggleRule={notifications.toggleRule}
            onToggleGlobal={notifications.toggleGlobal}
            onToggleSound={notifications.toggleSound}
            onRequestPermission={notifications.requestPermission}
            tags={allTags}
            sourceNames={sources.map((s) => s.name)}
          />
          <button onClick={() => setNotificationPanelOpen(false)} className="absolute top-2 right-2 text-[var(--muted)] hover:text-[var(--foreground)] w-5 h-5 flex items-center justify-center rounded-full hover:bg-[var(--surface-hover)] text-xs z-50">✕</button>
        </div>
      )}

      {/* Currency Calculator Panel */}
      {calculatorOpen && (
        <div className="fixed right-4 top-14 z-40 animate-fade-in">
          <CurrencyCalculator open={calculatorOpen} onClose={() => setCalculatorOpen(false)} />
        </div>
      )}

      {/* Financial Calculators Panel */}
      {financialCalcOpen && (
        <div className="fixed right-4 top-14 z-40 animate-fade-in">
          <FinancialCalculators open={financialCalcOpen} onClose={() => setFinancialCalcOpen(false)} />
        </div>
      )}

      {themeSelectorOpen && (
        <div className="fixed right-4 top-14 z-40 animate-fade-in">
          <ThemeSelector activeTheme={themeCustom.activeTheme} presets={themeCustom.presets} onSelect={themeCustom.selectTheme} onReset={themeCustom.resetTheme} />
          <button onClick={() => setThemeSelectorOpen(false)} className="absolute top-2 right-2 text-[var(--muted)] hover:text-[var(--foreground)] w-5 h-5 flex items-center justify-center rounded-full hover:bg-[var(--surface-hover)] text-xs z-50">✕</button>
        </div>
      )}

      {exportPanelOpen && (
        <div className="fixed right-4 top-14 z-40 animate-fade-in">
          <ExportPanel articles={articles} onClose={() => setExportPanelOpen(false)} />
        </div>
      )}

      <WeeklyReport
        open={weeklyReportOpen}
        onClose={() => setWeeklyReportOpen(false)}
        articles={articles}
        portfolioPrices={portfolio.prices}
      />

      <NewsletterGenerator
        open={newsletterOpen}
        onClose={() => setNewsletterOpen(false)}
        articles={articles}
        portfolioPrices={portfolio.prices}
      />

      <CuratedFeed
        open={curatedFeedOpen}
        onClose={() => setCuratedFeedOpen(false)}
        articles={articles}
      />

      <InsightMemo
        open={memoOpen}
        onClose={() => setMemoOpen(false)}
        articles={articles}
      />

      {/* Alert Feed Panel */}
      {alertFeedOpen && (
        <div className="fixed right-4 top-14 z-40 animate-fade-in">
          <AlertFeed
            articles={articles}
            rules={notifications.store.rules}
            onSelectArticle={selectArticle}
            onClose={() => setAlertFeedOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
