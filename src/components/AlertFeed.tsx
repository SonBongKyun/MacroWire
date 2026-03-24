"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { Article } from "@/types";
import type { NotificationRule } from "@/hooks/useNotifications";
import { checkNewArticlesForAlerts } from "@/hooks/useNotifications";

const STORAGE_KEY = "ryzm-finance-alert-history";
const MAX_ALERTS = 20;

export interface AlertHistoryItem {
  id: string;
  timestamp: string;
  articleId: string;
  articleTitle: string;
  ruleType: NotificationRule["type"];
  ruleValue: string;
  read: boolean;
}

function loadAlertHistory(): AlertHistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function persistAlertHistory(items: AlertHistoryItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ALERTS)));
}

const RULE_ICONS: Record<string, string> = {
  keyword: "K",
  tag: "#",
  source: "S",
};

interface AlertFeedProps {
  articles: Article[];
  rules: NotificationRule[];
  onSelectArticle: (a: Article) => void;
  onClose: () => void;
}

export function AlertFeed({ articles, rules, onSelectArticle, onClose }: AlertFeedProps) {
  const [history, setHistory] = useState<AlertHistoryItem[]>([]);
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set());

  // Load on mount
  useEffect(() => {
    const loaded = loadAlertHistory();
    setHistory(loaded);
    setProcessedIds(new Set(loaded.map((h) => h.articleId)));
  }, []);

  // Check new articles against rules and add to history
  useEffect(() => {
    if (articles.length === 0 || rules.length === 0) return;
    const newArticles = articles.filter((a) => !processedIds.has(a.id));
    if (newArticles.length === 0) return;

    const { matches } = checkNewArticlesForAlerts(newArticles, rules);
    if (matches.length === 0) {
      // Still mark as processed
      setProcessedIds((prev) => {
        const next = new Set(prev);
        newArticles.forEach((a) => next.add(a.id));
        return next;
      });
      return;
    }

    const newItems: AlertHistoryItem[] = matches.map((m) => ({
      id: `alert-${m.article.id}-${Date.now()}`,
      timestamp: new Date().toISOString(),
      articleId: m.article.id,
      articleTitle: m.article.title,
      ruleType: m.matchedRules[0].type,
      ruleValue: m.matchedRules[0].value,
      read: false,
    }));

    setHistory((prev) => {
      const next = [...newItems, ...prev].slice(0, MAX_ALERTS);
      persistAlertHistory(next);
      return next;
    });

    setProcessedIds((prev) => {
      const next = new Set(prev);
      newArticles.forEach((a) => next.add(a.id));
      return next;
    });
  }, [articles, rules, processedIds]);

  const unreadCount = useMemo(() => history.filter((h) => !h.read).length, [history]);

  const markAllRead = useCallback(() => {
    setHistory((prev) => {
      const next = prev.map((h) => ({ ...h, read: true }));
      persistAlertHistory(next);
      return next;
    });
  }, []);

  const handleSelect = useCallback(
    (item: AlertHistoryItem) => {
      const article = articles.find((a) => a.id === item.articleId);
      if (article) {
        onSelectArticle(article);
      }
      // Mark this item as read
      setHistory((prev) => {
        const next = prev.map((h) => (h.id === item.id ? { ...h, read: true } : h));
        persistAlertHistory(next);
        return next;
      });
    },
    [articles, onSelectArticle]
  );

  return (
    <div
      style={{
        width: 380,
        maxHeight: 520,
        background: "#1A1A1E",
        border: "1px solid #2D2D32",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          borderBottom: "1px solid #2D2D32",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#EBEBEB",
              letterSpacing: "0.06em",
              fontFamily: "var(--font-heading)",
            }}
          >
            ALERT FEED
          </span>
          {unreadCount > 0 && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: "#0D0D0F",
                background: "#C9A96E",
                padding: "1px 6px",
                borderRadius: 2,
                fontFamily: "var(--font-mono)",
              }}
            >
              {unreadCount}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              style={{
                background: "none",
                border: "1px solid #2D2D32",
                color: "#8C8C91",
                fontSize: 10,
                padding: "3px 8px",
                cursor: "pointer",
                fontWeight: 600,
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.color = "#C9A96E";
                (e.target as HTMLElement).style.borderColor = "#C9A96E";
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.color = "#8C8C91";
                (e.target as HTMLElement).style.borderColor = "#2D2D32";
              }}
            >
              모두 읽음
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#8C8C91",
              fontSize: 14,
              cursor: "pointer",
              padding: "0 2px",
              lineHeight: 1,
            }}
          >
            &times;
          </button>
        </div>
      </div>

      {/* Alert List */}
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        {history.length === 0 ? (
          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
              color: "#8C8C91",
              fontSize: 12,
            }}
          >
            알림 규칙에 매칭되는 기사가 없습니다
          </div>
        ) : (
          history.map((item) => (
            <button
              key={item.id}
              onClick={() => handleSelect(item)}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "10px 14px",
                width: "100%",
                textAlign: "left",
                background: item.read ? "transparent" : "rgba(201,169,110,0.04)",
                border: "none",
                borderBottom: "1px solid rgba(45,45,50,0.5)",
                cursor: "pointer",
                borderLeft: item.read ? "2px solid transparent" : "2px solid #C9A96E",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "rgba(201,169,110,0.08)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = item.read
                  ? "transparent"
                  : "rgba(201,169,110,0.04)";
              }}
            >
              {/* Rule type icon */}
              <span
                style={{
                  width: 22,
                  height: 22,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  color: item.read ? "#8C8C91" : "#C9A96E",
                  background: item.read ? "rgba(140,140,145,0.1)" : "rgba(201,169,110,0.15)",
                  flexShrink: 0,
                  borderRadius: 2,
                }}
              >
                {RULE_ICONS[item.ruleType] || "?"}
              </span>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: item.read ? 400 : 600,
                    color: item.read ? "#8C8C91" : "#EBEBEB",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    lineHeight: 1.4,
                  }}
                >
                  {item.articleTitle}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginTop: 3,
                  }}
                >
                  <span
                    style={{
                      fontSize: 9,
                      fontFamily: "var(--font-mono)",
                      fontVariantNumeric: "tabular-nums",
                      color: "#8C8C91",
                    }}
                  >
                    {new Date(item.timestamp).toLocaleTimeString("ko-KR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 600,
                      color: item.read ? "#8C8C91" : "#C9A96E",
                      background: item.read ? "rgba(140,140,145,0.08)" : "rgba(201,169,110,0.12)",
                      padding: "1px 5px",
                      borderRadius: 2,
                    }}
                  >
                    {item.ruleValue}
                  </span>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
