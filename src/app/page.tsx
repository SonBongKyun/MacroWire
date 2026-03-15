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

const POLL_INTERVAL = 5 * 60; // 300 seconds

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

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize dark mode from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("macro-wire-dark");
    if (stored === "true") {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  // Toggle dark mode
  const toggleDarkMode = useCallback(() => {
    setDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      localStorage.setItem("macro-wire-dark", String(next));
      return next;
    });
  }, []);

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

  const allTags = [
    "금리", "물가", "연준", "환율", "미국", "중국", "일본", "유럽",
    "수출입", "경기", "부동산", "가계부채", "재정", "에너지", "반도체", "AI", "지정학",
  ];

  const REGION_TAGS: Record<string, { tags: string[]; icon: string; color: string }> = {
    "전체": { tags: [], icon: "📋", color: "var(--accent)" },
    "한국": { tags: ["경기", "부동산", "가계부채", "재정", "수출입"], icon: "🇰🇷", color: "#e35169" },
    "미국": { tags: ["연준", "미국"], icon: "🇺🇸", color: "#3b82f6" },
    "글로벌": { tags: ["중국", "일본", "유럽", "지정학"], icon: "🌍", color: "#10b981" },
    "환율·에너지": { tags: ["환율", "에너지"], icon: "💱", color: "#f59e0b" },
  };

  // Apply region filter client-side
  const regionFilteredArticles =
    regionFilter === "전체"
      ? articles
      : articles.filter((a) => {
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
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [ingesting, runIngest, toggleDarkMode, markAllRead, exportSaved, selectedArticle, visibleArticles, selectArticle, toggleRead, toggleSave]);

  return (
    <div className="flex flex-col h-screen bg-[var(--background)] text-[var(--foreground)]">
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
      />

      <StatsBar articles={articles} sources={sources} />

      {/* 오늘의 구분 보기 Region Tabs */}
      <div className="px-5 h-11 border-b border-[var(--border)] metal-header flex items-center gap-2 shrink-0">
        <span className="text-[12px] font-bold text-[var(--muted)] shrink-0 tracking-[0.08em] uppercase mr-1">
          구분
        </span>
        <div className="flex items-center gap-1.5">
          {Object.entries(REGION_TAGS).map(([region, { icon, color }]) => {
            const isActive = regionFilter === region;
            const count = region === "전체"
              ? articles.length
              : articles.filter((a) => REGION_TAGS[region].tags.some((t) => a.tags.includes(t))).length;
            return (
              <button
                key={region}
                onClick={() => setRegionFilter(region)}
                className={`relative flex items-center gap-1.5 px-3.5 py-1.5 text-[13px] font-semibold rounded-[var(--radius-md)] transition-all duration-200 ${
                  isActive
                    ? "metal-btn text-[var(--foreground-bright)] shadow-sm"
                    : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
                }`}
                style={isActive ? { borderColor: color, boxShadow: `0 0 0 1px ${color}30, 0 1px 3px ${color}15` } : undefined}
              >
                {isActive && (
                  <span
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/5 h-[2px] rounded-full"
                    style={{ backgroundColor: color }}
                  />
                )}
                <span className="text-sm leading-none">{icon}</span>
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
            className="ml-auto text-[12px] text-[var(--muted)] hover:text-[var(--accent)] transition-colors flex items-center gap-1"
          >
            <span>✕</span> 필터 해제
          </button>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
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
        />

        <main className="flex flex-1 overflow-hidden">
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
          />

          {selectedArticle ? (
            <ArticleDetail
              article={selectedArticle}
              onToggleRead={toggleRead}
              onToggleSave={toggleSave}
              onTagClick={handleTagClick}
            />
          ) : (
            <TodayPulse articles={articles} />
          )}
        </main>
      </div>

      {/* Keyboard help overlay */}
      <KeyboardHelp open={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}
