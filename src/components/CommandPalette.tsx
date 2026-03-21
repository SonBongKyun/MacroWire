"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import type { Article, Source } from "@/types";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  articles: Article[];
  sources: Source[];
  onSelectArticle: (article: Article) => void;
  onSelectSource: (id: string) => void;
  onSelectTag: (tag: string) => void;
  onAction: (action: string) => void;
  tags: string[];
}

type PaletteItem = {
  id: string;
  type: "article" | "source" | "tag" | "action";
  label: string;
  sub?: string;
  icon: "article" | "source" | "tag" | "action";
};

const ACTIONS: { id: string; label: string; shortcut?: string }[] = [
  { id: "ingest", label: "새로고침 (RSS 수집)", shortcut: "R" },
  { id: "markAllRead", label: "전체 읽음 처리", shortcut: "M" },
  { id: "export", label: "저장 기사 내보내기", shortcut: "E" },
  { id: "toggleDark", label: "테마 전환 (다크/라이트)", shortcut: "D" },
  { id: "toggleSaved", label: "저장 기사 필터 토글" },
  { id: "range24h", label: "범위: 24시간", shortcut: "1" },
  { id: "range7d", label: "범위: 7일", shortcut: "2" },
  { id: "range30d", label: "범위: 30일", shortcut: "3" },
  { id: "help", label: "키보드 단축키 도움말", shortcut: "?" },
  { id: "focusMode", label: "포커스 리딩 모드 토글", shortcut: "F" },
  { id: "analytics", label: "애널리틱스 대시보드 열기", shortcut: "A" },
  { id: "watchlist", label: "키워드 워치리스트 토글", shortcut: "W" },
  { id: "addSource", label: "새 소스 추가" },
];

function fuzzyMatch(text: string, query: string): boolean {
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  let qi = 0;
  for (let i = 0; i < lower.length && qi < q.length; i++) {
    if (lower[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

const ICON_MAP = {
  article: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
    </svg>
  ),
  source: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7m-6 0a1 1 0 110-2 1 1 0 010 2z" />
    </svg>
  ),
  tag: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  ),
  action: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
};

export function CommandPalette({
  open,
  onClose,
  articles,
  sources,
  onSelectArticle,
  onSelectSource,
  onSelectTag,
  onAction,
  tags,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Build items
  const allItems = useMemo<PaletteItem[]>(() => {
    const items: PaletteItem[] = [];

    // Actions first
    ACTIONS.forEach((a) => {
      items.push({
        id: `action-${a.id}`,
        type: "action",
        label: a.label,
        sub: a.shortcut ? `⌨ ${a.shortcut}` : undefined,
        icon: "action",
      });
    });

    // Tags
    tags.forEach((t) => {
      items.push({
        id: `tag-${t}`,
        type: "tag",
        label: t,
        sub: "태그 필터",
        icon: "tag",
      });
    });

    // Sources
    sources.forEach((s) => {
      items.push({
        id: `source-${s.id}`,
        type: "source",
        label: s.name,
        sub: s.category || "소스",
        icon: "source",
      });
    });

    // Recent articles (limit 30)
    articles.slice(0, 30).forEach((a) => {
      items.push({
        id: `article-${a.id}`,
        type: "article",
        label: a.title,
        sub: a.sourceName,
        icon: "article",
      });
    });

    return items;
  }, [articles, sources, tags]);

  // Filter
  const filtered = useMemo(() => {
    if (!query.trim()) return allItems.slice(0, 12);
    return allItems.filter((item) => fuzzyMatch(item.label, query) || (item.sub && fuzzyMatch(item.sub, query))).slice(0, 15);
  }, [query, allItems]);

  // Keep activeIndex in bounds
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Scroll active into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const active = list.children[activeIndex] as HTMLElement | undefined;
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const executeItem = useCallback(
    (item: PaletteItem) => {
      onClose();
      switch (item.type) {
        case "article": {
          const a = articles.find((x) => `article-${x.id}` === item.id);
          if (a) onSelectArticle(a);
          break;
        }
        case "source": {
          const sid = item.id.replace("source-", "");
          onSelectSource(sid);
          break;
        }
        case "tag":
          onSelectTag(item.label);
          break;
        case "action": {
          const aid = item.id.replace("action-", "");
          onAction(aid);
          break;
        }
      }
    },
    [articles, onClose, onSelectArticle, onSelectSource, onSelectTag, onAction]
  );

  // Keyboard nav
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (filtered[activeIndex]) executeItem(filtered[activeIndex]);
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, filtered, activeIndex, executeItem, onClose]);

  if (!open) return null;

  // Group by type
  const grouped = new Map<string, PaletteItem[]>();
  filtered.forEach((item) => {
    const key = item.type;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(item);
  });

  const TYPE_LABELS: Record<string, string> = {
    action: "명령",
    tag: "태그",
    source: "소스",
    article: "기사",
  };

  let itemIdx = 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] palette-backdrop"
      style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-[540px] max-h-[60vh] glass-modal overflow-hidden shadow-2xl palette-enter border border-[var(--border)]">
        {/* Search */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[var(--border)]">
          <svg className="w-4 h-4 text-[var(--accent)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="명령, 기사, 소스, 태그 검색..."
            className="flex-1 bg-transparent text-[13px] text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none font-medium"
          />
          <kbd className="kbd-key" style={{ fontSize: '9px', height: '20px', minWidth: '32px' }}>
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="overflow-y-auto max-h-[calc(60vh-52px)]" ref={listRef}>
          {filtered.length === 0 && (
            <div className="flex items-center justify-center h-24 text-[12px] text-[var(--muted)]">
              결과 없음
            </div>
          )}
          {Array.from(grouped.entries()).map(([type, items]) => (
            <div key={type}>
              <div className="px-4 pt-2 pb-1">
                <span className="text-[9px] font-bold text-[var(--muted)] tracking-wider uppercase">
                  {TYPE_LABELS[type] || type}
                </span>
              </div>
              {items.map((item) => {
                const idx = itemIdx++;
                const isActive = idx === activeIndex;
                return (
                  <div
                    key={item.id}
                    className={`palette-item flex items-center gap-3 px-4 py-2 cursor-pointer ${isActive ? "active" : ""}`}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => executeItem(item)}
                  >
                    <span className="text-[var(--muted)] shrink-0">{ICON_MAP[item.icon]}</span>
                    <span className="text-[12px] text-[var(--foreground)] truncate flex-1">{item.label}</span>
                    {item.sub && (
                      <span className="text-[10px] text-[var(--muted)] shrink-0">{item.sub}</span>
                    )}
                    {isActive && (
                      <span className="text-[10px] text-[var(--muted)] shrink-0">↵</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
