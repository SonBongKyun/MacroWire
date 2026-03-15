"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { Source, Article, ArticlesResponse, IngestResult } from "@/types";
import { SourcePanel } from "@/components/SourcePanel";
import { ArticleList } from "@/components/ArticleList";
import { ArticleDetail } from "@/components/ArticleDetail";
import { TopBar } from "@/components/TopBar";
import { StatsBar } from "@/components/StatsBar";
import { KeyboardHelp } from "@/components/KeyboardHelp";
import { TodayPulse } from "@/components/TodayPulse";
import { MarketTicker } from "@/components/MarketTicker";
import { CommandPalette } from "@/components/CommandPalette";
import { FilterBar } from "@/components/FilterBar";
import { useCollections } from "@/hooks/useCollections";
import { SpikeAlert } from "@/components/SpikeAlert";
import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";
import { AddSourceModal } from "@/components/AddSourceModal";
import { WatchlistPanel } from "@/components/WatchlistPanel";
import { useWatchlist } from "@/hooks/useWatchlist";

const POLL_INTERVAL = 5 * 60; // 300 seconds

/** Isolated StatusBar with live clock — prevents full page re-render every second */
function StatusBar({ enabledSources, totalSources, articleCount, unreadCount, selectedSourceName }: {
  enabledSources: number; totalSources: number; articleCount: number; unreadCount: number; selectedSourceName?: string;
}) {
  const [clock, setClock] = useState("");
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="status-bar px-5 h-8 flex items-center gap-3 shrink-0 select-none">
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)] stat-dot-live" />
        <span className="text-[11px] font-semibold text-[var(--success)]">Connected</span>
      </div>
      <div className="topbar-divider" style={{ height: 12 }} />
      <span className="text-[11px] tabular-nums font-mono font-bold text-[var(--accent)]">
        {clock}
      </span>
      <div className="topbar-divider" style={{ height: 12 }} />
      <div className="flex items-center gap-1">
        <span className="w-1 h-1 rounded-full" style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4)' }} />
        <span className="text-[11px] tabular-nums">
          {enabledSources}/{totalSources} 소스
        </span>
      </div>
      <div className="topbar-divider" style={{ height: 12 }} />
      <span className="text-[11px] tabular-nums">
        {articleCount}건
      </span>
      {unreadCount > 0 && (
        <>
          <div className="topbar-divider" style={{ height: 12 }} />
          <span className="text-[11px] tabular-nums text-[var(--accent)] font-semibold">
            {unreadCount}건 미독
          </span>
        </>
      )}
      {selectedSourceName && (
        <>
          <div className="topbar-divider" style={{ height: 12 }} />
          <span className="text-[11px] truncate max-w-[300px]">
            {selectedSourceName}
          </span>
        </>
      )}
      <div className="flex-1" />
      <span className="text-[11px] opacity-60">
        j/k 이동 · s 저장 · / 검색 · ? 도움말
      </span>
    </div>
  );
}

export default function Home() {
  const [sources, setSources] = useState<Source[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Filters
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [range, setRange] = useState<"24h" | "7d" | "30d">("24h");
  const [showSaved, setShowSaved] = useState(false);
  const [readFilter, setReadFilter] = useState<"all" | "unread" | "read">("all");

  // Dark mode
  const [darkMode, setDarkMode] = useState(false);

  // Region filter (오늘의 구분 보기)
  const [regionFilter, setRegionFilter] = useState<string>("전체");

  // Countdown
  const [countdown, setCountdown] = useState(POLL_INTERVAL);

  // Keyboard help overlay
  const [showHelp, setShowHelp] = useState(false);

  // New articles badge
  const [newArticleCount, setNewArticleCount] = useState(0);
  const [newArticleIds, setNewArticleIds] = useState<string[]>([]);
  const prevArticleIds = useRef<Set<string>>(new Set());

  // Collections
  const { store: collectionStore, assignArticle, createCollection, getCollection } = useCollections();
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);

  // Watchlist (#14)
  const watchlist = useWatchlist();

  // Analytics & new feature states
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [addSourceOpen, setAddSourceOpen] = useState(false);
  const [watchlistOpen, setWatchlistOpen] = useState(false);

  // Resizable panels (#11) - stored widths
  const [sidebarWidth, setSidebarWidth] = useState(220);
  const [listWidth, setListWidth] = useState(380);
  const resizingRef = useRef<"sidebar" | "list" | null>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  // v6 UI states
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "card">("list");
  const [focusMode, setFocusMode] = useState(false);
  const themeToggleRef = useRef<HTMLButtonElement>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize dark mode from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("macro-wire-dark");
    if (stored === "true") {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    }
    // Position memory (#12) - restore panel widths
    const sw = localStorage.getItem("macro-wire-sidebar-w");
    const lw = localStorage.getItem("macro-wire-list-w");
    if (sw) setSidebarWidth(Math.max(160, Math.min(400, Number(sw))));
    if (lw) setListWidth(Math.max(280, Math.min(600, Number(lw))));
  }, []);

  // Toggle dark mode with circle reveal animation
  const toggleDarkMode = useCallback(() => {
    const btn = themeToggleRef.current;
    const rect = btn?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top + rect.height / 2 : 0;

    setDarkMode((prev) => {
      const next = !prev;

      // Create circle reveal overlay
      const overlay = document.createElement("div");
      overlay.className = "theme-transition-overlay theme-reveal";
      overlay.style.cssText = `--tx:${x}px;--ty:${y}px;background:${next ? "#0c0f1a" : "#f8f9fb"};`;
      document.body.appendChild(overlay);

      // Apply theme after small delay for visual effect
      requestAnimationFrame(() => {
        if (next) {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      });

      // Remove overlay after animation
      setTimeout(() => overlay.remove(), 550);

      localStorage.setItem("macro-wire-dark", String(next));
      return next;
    });
  }, []);

  // Resizable panel handlers (#11)
  const startResize = useCallback((which: "sidebar" | "list", e: React.MouseEvent) => {
    e.preventDefault();
    resizingRef.current = which;
    startXRef.current = e.clientX;
    startWidthRef.current = which === "sidebar" ? sidebarWidth : listWidth;

    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startXRef.current;
      if (resizingRef.current === "sidebar") {
        const newW = Math.max(160, Math.min(400, startWidthRef.current + delta));
        setSidebarWidth(newW);
      } else {
        const newW = Math.max(280, Math.min(600, startWidthRef.current + delta));
        setListWidth(newW);
      }
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      // persist
      if (resizingRef.current === "sidebar") {
        localStorage.setItem("macro-wire-sidebar-w", String(sidebarWidth));
      } else {
        localStorage.setItem("macro-wire-list-w", String(listWidth));
      }
      resizingRef.current = null;
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [sidebarWidth, listWidth]);

  // Countdown timer (tick every second)
  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  // Fetch sources
  const fetchSources = useCallback(async () => {
    try {
      const res = await fetch("/api/sources");
      const data = await res.json();
      setSources(data);
    } catch (err) {
      console.error("Failed to fetch sources:", err);
    }
  }, []);

  // Build query string
  const buildQuery = useCallback(
    (cursor?: string | null) => {
      const params = new URLSearchParams();
      params.set("range", range);
      params.set("limit", "50");
      if (selectedSourceId) params.set("sourceId", selectedSourceId);
      if (selectedTag) params.set("tag", selectedTag);
      if (searchQuery) params.set("q", searchQuery);
      if (showSaved) params.set("saved", "true");
      if (cursor) params.set("cursor", cursor);
      return params.toString();
    },
    [range, selectedSourceId, selectedTag, searchQuery, showSaved]
  );

  // Fetch articles
  const fetchArticles = useCallback(
    async (append = false) => {
      setLoading(true);
      try {
        const qs = buildQuery(append ? nextCursor : null);
        const res = await fetch(`/api/articles?${qs}`);
        const json: ArticlesResponse = await res.json();

        if (append) {
          setArticles((prev) => [...prev, ...json.data]);
        } else {
          // Track new articles for badge
          if (prevArticleIds.current.size > 0) {
            const newOnes = json.data.filter(
              (a: Article) => !prevArticleIds.current.has(a.id)
            );
            if (newOnes.length > 0) {
              setNewArticleCount((prev) => prev + newOnes.length);
              setNewArticleIds((prev) => [...prev, ...newOnes.map((a: Article) => a.id)]);
              // Desktop notification
              if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
                new Notification("Macro Wire", {
                  body: `새 기사 ${newOnes.length}건이 도착했습니다`,
                  icon: "/icon.svg",
                  tag: "macro-wire-new",
                });
              }
            }
          }
          // Update known IDs
          const allIds = new Set(json.data.map((a: Article) => a.id));
          prevArticleIds.current = allIds;

          setArticles(json.data);
          setSelectedArticle(null);
        }
        setNextCursor(json.nextCursor);
        setHasMore(json.hasMore);
      } catch (err) {
        console.error("Failed to fetch articles:", err);
      } finally {
        setLoading(false);
      }
    },
    [buildQuery, nextCursor]
  );

  // Ingest
  const runIngest = useCallback(async () => {
    // Request notification permission on first manual ingest
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    setIngesting(true);
    try {
      const res = await fetch("/api/ingest", { method: "POST" });
      const result: IngestResult = await res.json();
      setLastUpdated(result.lastUpdated);
      await fetchArticles();
      await fetchSources();
      setCountdown(POLL_INTERVAL); // Reset countdown
    } catch (err) {
      console.error("Ingest failed:", err);
    } finally {
      setIngesting(false);
    }
  }, [fetchArticles, fetchSources]);

  // Add source handler (#16)
  const handleAddSource = useCallback(async (data: { name: string; feedUrl: string; category: string }) => {
    try {
      const res = await fetch("/api/sources/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        await fetchSources();
        setAddSourceOpen(false);
      }
    } catch (err) {
      console.error("Add source failed:", err);
    }
  }, [fetchSources]);

  // Delete source handler (#16)
  const handleDeleteSource = useCallback(async (source: Source) => {
    if (!confirm(`"${source.name}" 소스를 삭제하시겠습니까? 관련 기사도 모두 삭제됩니다.`)) return;
    try {
      const res = await fetch(`/api/sources/${source.id}/delete`, { method: "DELETE" });
      if (res.ok) {
        await fetchSources();
        if (selectedSourceId === source.id) setSelectedSourceId(null);
        await fetchArticles();
      }
    } catch (err) {
      console.error("Delete source failed:", err);
    }
  }, [fetchSources, fetchArticles, selectedSourceId]);

  // Toggle read
  const toggleRead = useCallback(
    async (article: Article) => {
      try {
        const res = await fetch(`/api/articles/${article.id}/read`, {
          method: "POST",
        });
        const json = await res.json();
        setArticles((prev) =>
          prev.map((a) => (a.id === article.id ? { ...a, isRead: json.isRead } : a))
        );
        if (selectedArticle?.id === article.id) {
          setSelectedArticle((prev) =>
            prev ? { ...prev, isRead: json.isRead } : null
          );
        }
      } catch (err) {
        console.error("Toggle read failed:", err);
      }
    },
    [selectedArticle]
  );

  // Toggle save
  const toggleSave = useCallback(
    async (article: Article) => {
      try {
        const res = await fetch(`/api/articles/${article.id}/save`, {
          method: "POST",
        });
        const json = await res.json();
        setArticles((prev) =>
          prev.map((a) =>
            a.id === article.id ? { ...a, isSaved: json.isSaved } : a
          )
        );
        if (selectedArticle?.id === article.id) {
          setSelectedArticle((prev) =>
            prev ? { ...prev, isSaved: json.isSaved } : null
          );
        }
      } catch (err) {
        console.error("Toggle save failed:", err);
      }
    },
    [selectedArticle]
  );

  // Toggle source enabled
  const toggleSource = useCallback(async (source: Source) => {
    try {
      const res = await fetch(`/api/sources/${source.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !source.enabled }),
      });
      const updated = await res.json();
      setSources((prev) =>
        prev.map((s) => (s.id === updated.id ? { ...s, enabled: updated.enabled } : s))
      );
    } catch (err) {
      console.error("Toggle source failed:", err);
    }
  }, []);

  // Select article and mark as read
  const selectArticle = useCallback(
    (article: Article) => {
      setSelectedArticle(article);
      setNewArticleCount(0); // Clear badge on interaction
      setNewArticleIds((prev) => prev.filter((id) => id !== article.id));
      if (!article.isRead) {
        toggleRead(article);
      }
    },
    [toggleRead]
  );

  // Batch mark all visible as read
  const markAllRead = useCallback(async () => {
    const unreadIds = articles.filter((a) => !a.isRead).map((a) => a.id);
    if (unreadIds.length === 0) return;
    try {
      await fetch("/api/articles/batch-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleIds: unreadIds }),
      });
      setArticles((prev) => prev.map((a) => ({ ...a, isRead: true })));
      if (selectedArticle) {
        setSelectedArticle((prev) => (prev ? { ...prev, isRead: true } : null));
      }
    } catch (err) {
      console.error("Batch read failed:", err);
    }
  }, [articles, selectedArticle]);

  // Export saved articles
  const exportSaved = useCallback(() => {
    const saved = articles.filter((a) => a.isSaved);
    if (saved.length === 0) return;

    const md = saved
      .map(
        (a, i) =>
          `### ${i + 1}. ${a.title}\n` +
          `- **출처**: ${a.sourceName}\n` +
          `- **시간**: ${new Date(a.publishedAt).toLocaleString("ko-KR")}\n` +
          `- **태그**: ${a.tags.join(", ") || "없음"}\n` +
          `- **URL**: ${a.url}\n` +
          (a.summary ? `- **요약**: ${a.summary}\n` : "")
      )
      .join("\n---\n\n");

    const header = `# Macro Wire — 저장된 기사\n\n> 내보내기: ${new Date().toLocaleString("ko-KR")}\n> 총 ${saved.length}건\n\n---\n\n`;
    const blob = new Blob([header + md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `macro-wire-saved-${new Date().toISOString().slice(0, 10)}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }, [articles]);

  // Initial load
  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  // Refetch articles when filters change
  useEffect(() => {
    fetchArticles();
    setNewArticleCount(0); // Clear badge on filter change
    setNewArticleIds([]);
  }, [range, selectedSourceId, selectedTag, searchQuery, showSaved]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-poll every 5 minutes
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCountdown(POLL_INTERVAL);
      runIngest();
    }, POLL_INTERVAL * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [runIngest]);

  // Tag click handler (from ArticleList/ArticleDetail)
  const handleTagClick = useCallback((tag: string) => {
    setSelectedTag((prev) => (prev === tag ? null : tag));
  }, []);

  // Command palette action handler
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
      case "focusMode": setFocusMode((v) => !v); break;
      case "analytics": setAnalyticsOpen(true); break;
      case "watchlist": setWatchlistOpen((v) => !v); break;
      case "addSource": setAddSourceOpen(true); break;
    }
  }, [runIngest, markAllRead, exportSaved, toggleDarkMode]);

  const allTags = [
    "금리", "물가", "연준", "환율", "미국", "중국", "일본", "유럽",
    "수출입", "경기", "부동산", "가계부채", "재정", "에너지", "반도체", "AI", "지정학",
  ];

  const REGION_TAGS: Record<string, { tags: string[]; icon: React.ReactNode; color: string }> = {
    "전체": { tags: [], icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>, color: "var(--accent)" },
    "한국": { tags: ["경기", "부동산", "가계부채", "재정", "수출입"], icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 000 20M2 12h20" /></svg>, color: "#e35169" },
    "미국": { tags: ["연준", "미국"], icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 21V5a2 2 0 012-2h4l2 3h8a2 2 0 012 2v3M3 21l6-6m0 0l4 4m-4-4v6" /><path strokeLinecap="round" d="M14 3v4h4" /></svg>, color: "#3b82f6" },
    "글로벌": { tags: ["중국", "일본", "유럽", "지정학"], icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></svg>, color: "#10b981" },
    "환율·에너지": { tags: ["환율", "에너지"], icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" /></svg>, color: "#f59e0b" },
  };

  // Apply collection filter (when viewing saved with collection selected)
  const collectionFilteredArticles = useMemo(() => {
    if (!showSaved || !selectedCollection) return articles;
    return articles.filter((a) => collectionStore.assignments[a.id] === selectedCollection);
  }, [articles, showSaved, selectedCollection, collectionStore.assignments]);

  // Apply region filter client-side
  const regionFilteredArticles =
    regionFilter === "전체"
      ? collectionFilteredArticles
      : collectionFilteredArticles.filter((a) => {
          const rTags = REGION_TAGS[regionFilter]?.tags || [];
          return a.tags.some((t) => rTags.includes(t));
        });

  // Compute visible articles for keyboard navigation
  const visibleArticles = useMemo(() => {
    let list = regionFilteredArticles;
    if (readFilter === "unread") list = list.filter((a) => !a.isRead);
    else if (readFilter === "read") list = list.filter((a) => a.isRead);
    return list;
  }, [regionFilteredArticles, readFilter]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Cmd+K opens command palette from anywhere
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }

      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      switch (e.key) {
        case "?":
          e.preventDefault();
          setShowHelp((v) => !v);
          break;
        case "/":
          e.preventDefault();
          document.getElementById("wire-search")?.focus();
          break;
        case "j": {
          e.preventDefault();
          const idx = visibleArticles.findIndex((a) => a.id === selectedArticle?.id);
          const next = idx < 0 ? 0 : Math.min(idx + 1, visibleArticles.length - 1);
          if (visibleArticles[next]) selectArticle(visibleArticles[next]);
          break;
        }
        case "k": {
          e.preventDefault();
          const idx = visibleArticles.findIndex((a) => a.id === selectedArticle?.id);
          const prev = Math.max(idx - 1, 0);
          if (visibleArticles[prev]) selectArticle(visibleArticles[prev]);
          break;
        }
        case "s":
          if (selectedArticle) {
            e.preventDefault();
            toggleSave(selectedArticle);
          }
          break;
        case "o":
          if (selectedArticle) {
            e.preventDefault();
            window.open(selectedArticle.url, "_blank");
          }
          break;
        case "g":
          e.preventDefault();
          if (visibleArticles.length > 0) selectArticle(visibleArticles[0]);
          break;
        case "1":
          e.preventDefault();
          setRange("24h");
          break;
        case "2":
          e.preventDefault();
          setRange("7d");
          break;
        case "3":
          e.preventDefault();
          setRange("30d");
          break;
        case "r":
          e.preventDefault();
          if (selectedArticle) {
            toggleRead(selectedArticle);
          } else if (!ingesting) {
            runIngest();
          }
          break;
        case "d":
          e.preventDefault();
          toggleDarkMode();
          break;
        case "m":
          e.preventDefault();
          markAllRead();
          break;
        case "e":
          e.preventDefault();
          exportSaved();
          break;
        case "[":
          e.preventDefault();
          setSidebarCollapsed((v) => !v);
          break;
        case "f":
          e.preventDefault();
          setFocusMode((v) => !v);
          break;
        case "v":
          e.preventDefault();
          setViewMode((v) => v === "list" ? "card" : "list");
          break;
        case "a":
          e.preventDefault();
          setAnalyticsOpen((v) => !v);
          break;
        case "w":
          e.preventDefault();
          setWatchlistOpen((v) => !v);
          break;
        case "Escape":
          if (analyticsOpen) {
            e.preventDefault();
            setAnalyticsOpen(false);
          } else if (watchlistOpen) {
            e.preventDefault();
            setWatchlistOpen(false);
          } else if (focusMode) {
            e.preventDefault();
            setFocusMode(false);
          }
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [ingesting, runIngest, toggleDarkMode, markAllRead, exportSaved, selectedArticle, visibleArticles, selectArticle, toggleRead, toggleSave, focusMode]);

  // Get selected source name for filter bar
  const selectedSourceName = sources.find((s) => s.id === selectedSourceId)?.name;

  return (
    <div className={`flex flex-col h-screen bg-[var(--background)] text-[var(--foreground)] ${focusMode ? "focus-mode" : ""}`}>
      <div className="content-layer flex flex-col h-screen">
      <TopBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        range={range}
        onRangeChange={setRange}
        onIngest={runIngest}
        ingesting={ingesting}
        lastUpdated={lastUpdated}
        showSaved={showSaved}
        onToggleSaved={() => setShowSaved((v) => !v)}
        articleCount={articles.length}
        darkMode={darkMode}
        onToggleDark={toggleDarkMode}
        countdown={countdown}
        newArticleCount={newArticleCount}
        onMarkAllRead={markAllRead}
        onExport={exportSaved}
        onShowHelp={() => setShowHelp(true)}
        themeToggleRef={themeToggleRef}
        onOpenPalette={() => setCommandPaletteOpen(true)}
        onOpenAnalytics={() => setAnalyticsOpen(true)}
        onToggleWatchlist={() => setWatchlistOpen((v) => !v)}
      />

      <div className="hide-in-focus shrink-0">
        <div className="flex items-center border-b border-[var(--border)] shrink-0">
          <div className="shrink-0"><StatsBar articles={articles} sources={sources} /></div>
          <div className="flex-1 overflow-hidden"><MarketTicker /></div>
        </div>
      </div>

      {/* Region Tabs */}
      <div className="hide-in-focus" style={{ flexShrink: 0 }}>
      <div className="px-4 border-b border-[var(--border)] flex items-center gap-2" style={{ height: 40, flexShrink: 0, overflow: 'hidden' }}>
        <span className="text-[12px] font-bold text-[var(--muted)] tracking-[0.08em] uppercase mr-0.5" style={{ flexShrink: 0 }}>
          구분
        </span>
        <div className="flex items-center gap-2" style={{ flex: '1 1 0%', minWidth: 0, overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {Object.entries(REGION_TAGS).map(([region, { icon, color }]) => {
            const isActive = regionFilter === region;
            const count = region === "전체"
              ? articles.length
              : articles.filter((a) => REGION_TAGS[region].tags.some((t) => a.tags.includes(t))).length;
            return (
              <button
                key={region}
                onClick={() => setRegionFilter(region)}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold rounded-[var(--radius-sm)] transition-all duration-150 ${
                  isActive
                    ? "bg-[var(--surface)] text-[var(--foreground-bright)] shadow-sm border border-[var(--border)]"
                    : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
                }`}
                style={{ flex: '0 0 auto', whiteSpace: 'nowrap', ...(isActive ? { borderColor: `${color}50` } : {}) }}
              >
                <span className="text-sm leading-none" style={{ color: isActive ? color : undefined }}>{icon}</span>
                <span>{region}</span>
                {count > 0 && (
                  <span
                    className={`text-[11px] tabular-nums font-bold px-1.5 py-0.5 rounded-full leading-none ${
                      isActive ? "text-white" : "text-[var(--muted)] bg-[var(--surface-active)]"
                    }`}
                    style={isActive ? { backgroundColor: color } : undefined}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {regionFilter !== "전체" && (
          <button
            onClick={() => setRegionFilter("전체")}
            className="ml-auto shrink-0 text-[11px] text-[var(--muted)] hover:text-[var(--accent)] transition-colors flex items-center gap-1"
          >
            <span>✕</span> 필터 해제
          </button>
        )}
      </div>
      </div>

      {/* Active Filter Summary Bar */}
      <FilterBar
        selectedSourceName={selectedSourceName}
        selectedTag={selectedTag}
        searchQuery={searchQuery}
        range={range}
        showSaved={showSaved}
        regionFilter={regionFilter}
        readFilter={readFilter}
        onClearSource={() => setSelectedSourceId(null)}
        onClearTag={() => setSelectedTag(null)}
        onClearSearch={() => setSearchQuery("")}
        onClearRange={() => setRange("24h")}
        onClearSaved={() => setShowSaved(false)}
        onClearRegion={() => setRegionFilter("전체")}
        onClearReadFilter={() => setReadFilter("all")}
        onClearAll={() => {
          setSelectedSourceId(null);
          setSelectedTag(null);
          setSearchQuery("");
          setRange("24h");
          setShowSaved(false);
          setRegionFilter("전체");
          setReadFilter("all");
        }}
      />

      {/* Collection filter tabs (when viewing saved) */}
      {showSaved && collectionStore.names.length > 0 && (
        <div className="px-5 h-9 border-b border-[var(--border-subtle)] flex items-center gap-2 shrink-0 bg-[var(--accent-surface)]">
          <svg className="w-3 h-3 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <span className="text-[10px] font-bold text-[var(--muted)] tracking-[0.08em]">COLLECTION</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSelectedCollection(null)}
              className={`px-2.5 py-1 text-[10px] font-semibold rounded-[var(--radius-sm)] transition-colors ${
                !selectedCollection
                  ? "bg-[var(--foreground-bright)] text-white shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--foreground)] metal-btn"
              }`}
            >
              전체
            </button>
            {collectionStore.names.map((name) => (
              <button
                key={name}
                onClick={() => setSelectedCollection(name === selectedCollection ? null : name)}
                className={`px-2.5 py-1 text-[10px] font-semibold rounded-[var(--radius-sm)] transition-colors ${
                  selectedCollection === name
                    ? "bg-[var(--accent)] text-white shadow-sm"
                    : "text-[var(--muted)] hover:text-[var(--foreground)] metal-btn"
                }`}
              >
                {name}
                <span className="ml-1 text-[9px] opacity-70">
                  {Object.values(collectionStore.assignments).filter((v) => v === name).length}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <div style={{ width: sidebarCollapsed || focusMode ? 0 : sidebarWidth }} className="shrink-0 relative transition-all duration-300 overflow-hidden">
        <SourcePanel
          sources={sources}
          selectedSourceId={selectedSourceId}
          onSelectSource={(id) =>
            setSelectedSourceId((prev) => (prev === id ? null : id))
          }
          onToggleSource={toggleSource}
          tags={allTags}
          selectedTag={selectedTag}
          onSelectTag={(tag) =>
            setSelectedTag((prev) => (prev === tag ? null : tag))
          }
          collapsed={sidebarCollapsed || focusMode}
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
          onAddSource={() => setAddSourceOpen(true)}
          onDeleteSource={handleDeleteSource}
        />
        {/* Sidebar resize handle */}
        {!sidebarCollapsed && !focusMode && (
          <div
            onMouseDown={(e) => startResize("sidebar", e)}
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-[var(--accent)] hover:opacity-40 transition-colors z-10"
          />
        )}
        </div>

        <main className="flex flex-1 overflow-hidden relative">

          <div style={{ width: listWidth }} className="shrink-0 flex flex-col relative">
          {/* Spike Alert Bar (#3) — in flow before article list */}
          <SpikeAlert articles={articles} />
          <ArticleList
            articles={regionFilteredArticles}
            loading={loading}
            selectedArticleId={selectedArticle?.id ?? null}
            onSelectArticle={selectArticle}
            onToggleSave={toggleSave}
            hasMore={hasMore}
            onLoadMore={() => fetchArticles(true)}
            readFilter={readFilter}
            onReadFilterChange={setReadFilter}
            onTagClick={handleTagClick}
            newArticleIds={newArticleIds}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
          {/* List resize handle */}
          <div
            onMouseDown={(e) => startResize("list", e)}
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-[var(--accent)] hover:opacity-40 transition-colors z-10"
          />
          </div>

          {selectedArticle ? (
            <ArticleDetail
              article={selectedArticle}
              onToggleRead={toggleRead}
              onToggleSave={toggleSave}
              onTagClick={handleTagClick}
              collectionName={getCollection(selectedArticle.id)}
              collectionNames={collectionStore.names}
              onCollectionChange={assignArticle}
              onCreateCollection={createCollection}
              articles={articles}
              onSelectArticle={selectArticle}
            />
          ) : (
            <TodayPulse articles={articles} />
          )}
        </main>
      </div>

      {/* Keyboard help overlay */}
      <KeyboardHelp open={showHelp} onClose={() => setShowHelp(false)} />

      {/* Command Palette */}
      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        articles={articles}
        sources={sources}
        onSelectArticle={selectArticle}
        onSelectSource={(id) => setSelectedSourceId((prev) => (prev === id ? null : id))}
        onSelectTag={(tag) => setSelectedTag((prev) => (prev === tag ? null : tag))}
        onAction={handlePaletteAction}
        tags={allTags}
      />

      {/* Analytics Dashboard (#1-5, #17-20) */}
      {analyticsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setAnalyticsOpen(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div className="relative w-[90vw] max-w-[1100px] h-[80vh] rounded-[var(--radius-xl)] glass-modal overflow-hidden animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)] glass-header">
              <h3 className="text-[13px] font-extrabold text-[var(--foreground-bright)] flex items-center gap-2">
                <svg className="w-4 h-4 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                애널리틱스 대시보드
              </h3>
              <button onClick={() => setAnalyticsOpen(false)} className="text-[var(--muted)] hover:text-[var(--foreground)] w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--surface-hover)]">✕</button>
            </div>
            <div className="h-[calc(80vh-48px)] overflow-y-auto">
              <AnalyticsDashboard articles={articles} />
            </div>
          </div>
        </div>
      )}

      {/* Add Source Modal (#16) */}
      {addSourceOpen && (
        <AddSourceModal
          open={addSourceOpen}
          onClose={() => setAddSourceOpen(false)}
          onAdd={handleAddSource}
        />
      )}

      {/* Watchlist Panel (#14) */}
      {watchlistOpen && (
        <div className="fixed right-4 top-14 z-40 w-72 animate-fade-in">
          <WatchlistPanel
            store={watchlist.store}
            articles={articles}
            onAdd={watchlist.addKeyword}
            onRemove={watchlist.removeKeyword}
            onSelectArticle={selectArticle}
          />
          <button
            onClick={() => setWatchlistOpen(false)}
            className="absolute top-2 right-2 text-[var(--muted)] hover:text-[var(--foreground)] w-5 h-5 flex items-center justify-center rounded-full hover:bg-[var(--surface-hover)] text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Focus mode indicator */}
      {focusMode && (
        <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2 px-3.5 py-2 rounded-full focus-indicator text-[10px] text-[var(--accent)] font-semibold select-none">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          포커스 모드
          <kbd className="kbd-key" style={{ fontSize: '9px', padding: '1px 4px', minWidth: 'auto', height: 'auto' }}>ESC</kbd>
        </div>
      )}

      {/* Bottom status bar */}
      {!focusMode && (
        <StatusBar
          enabledSources={sources.filter((s) => s.enabled).length}
          totalSources={sources.length}
          articleCount={articles.length}
          unreadCount={articles.filter(a => !a.isRead).length}
          selectedSourceName={selectedArticle?.sourceName}
        />
      )}
      </div>{/* end content-layer */}
    </div>
  );
}
