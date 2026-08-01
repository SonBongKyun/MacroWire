"use client";

import { useState, useMemo } from "react";
import type { Article } from "@/types";
import type { PortfolioPrice } from "@/hooks/usePortfolio";

type PanelMode = "market" | "pulse";

interface SplitViewPanelProps {
  portfolioPrices: PortfolioPrice[];
  portfolioLoading: boolean;
  articles: Article[];
}

function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(2);
  return price.toFixed(4);
}

export function SplitViewPanel({
  portfolioPrices,
  portfolioLoading,
  articles,
}: SplitViewPanelProps) {
  const [mode, setMode] = useState<PanelMode>("market");

  const todayStats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayArticles = articles.filter(
      (a) => new Date(a.publishedAt).getTime() >= todayStart
    );
    const tagCounts: Record<string, number> = {};
    for (const a of todayArticles) {
      for (const tag of a.tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }
    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    const sourceCounts: Record<string, number> = {};
    for (const a of todayArticles) {
      sourceCounts[a.sourceName] = (sourceCounts[a.sourceName] || 0) + 1;
    }
    const topSources = Object.entries(sourceCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      total: todayArticles.length,
      unread: articles.filter((a) => !a.isRead).length,
      saved: articles.filter((a) => a.isSaved).length,
      topTags,
      topSources,
    };
  }, [articles]);

  return (
    <div
      className="h-full overflow-y-auto"
      style={{
        borderLeft: "1px solid var(--border)",
        background: "var(--background)",
      }}
    >
      {/* Mode Toggle */}
      <div
        className="flex items-center shrink-0"
        style={{
          borderBottom: "1px solid var(--border)",
          height: 32,
          padding: "0 12px",
          gap: 0,
        }}
      >
        {(["market", "pulse"] as PanelMode[]).map((m) => {
          const isActive = mode === m;
          return (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 10,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? "var(--accent)" : "var(--muted)",
                padding: "0 10px",
                height: 32,
                position: "relative",
                fontFamily: "var(--font-mono)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {m === "market" ? "MARKET" : "PULSE"}
              {isActive && (
                <span
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 10,
                    right: 10,
                    height: 2,
                    background: "var(--accent)",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ padding: 12 }}>
        {mode === "market" ? (
          <div>
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: 10,
              }}
            >
              Portfolio Prices
            </div>
            {portfolioLoading ? (
              <div style={{ fontSize: 11, color: "var(--muted)" }}>로딩...</div>
            ) : portfolioPrices.length === 0 ? (
              <div style={{ fontSize: 11, color: "var(--muted)" }}>포트폴리오 비어있음</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {portfolioPrices.map((item) => (
                  <div
                    key={item.symbol}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "6px 0",
                      borderBottom: "1px solid color-mix(in srgb, var(--border) 50%, transparent)",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: "var(--foreground)",
                        }}
                      >
                        {item.label}
                      </span>
                      <span
                        style={{
                          fontSize: 9,
                          fontFamily: "var(--font-mono)",
                          color: "var(--muted)",
                          textTransform: "uppercase",
                        }}
                      >
                        {item.symbol}
                      </span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1 }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          fontFamily: "var(--font-mono)",
                          color: "var(--foreground)",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {formatPrice(item.price)}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          fontFamily: "var(--font-mono)",
                          fontVariantNumeric: "tabular-nums",
                          color: item.changePct >= 0 ? "var(--success)" : "var(--danger)",
                        }}
                      >
                        {item.changePct >= 0 ? "+" : ""}{item.changePct.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: 10,
              }}
            >
              Today&apos;s Pulse
            </div>

            {/* Stats grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                marginBottom: 16,
              }}
            >
              {[
                { label: "오늘 기사", value: todayStats.total },
                { label: "읽지 않음", value: todayStats.unread },
                { label: "저장됨", value: todayStats.saved },
                { label: "전체 기사", value: articles.length },
              ].map((stat) => (
                <div
                  key={stat.label}
                  style={{
                    padding: "8px 10px",
                    border: "1px solid var(--border)",
                    borderRadius: 2,
                  }}
                >
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 800,
                      color: "var(--accent)",
                      fontFamily: "var(--font-mono)",
                      fontVariantNumeric: "tabular-nums",
                      lineHeight: 1,
                    }}
                  >
                    {stat.value}
                  </div>
                  <div
                    style={{
                      fontSize: 9,
                      color: "var(--muted)",
                      fontWeight: 500,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginTop: 4,
                    }}
                  >
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Top Tags */}
            {todayStats.topTags.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: "var(--muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    marginBottom: 8,
                  }}
                >
                  Trending Tags
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {todayStats.topTags.map(([tag, count]) => (
                    <span
                      key={tag}
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: "2px 8px",
                        border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)",
                        borderRadius: 2,
                        color: "var(--accent)",
                        background: "color-mix(in srgb, var(--accent) 5%, transparent)",
                      }}
                    >
                      {tag}
                      <span
                        style={{
                          marginLeft: 4,
                          fontSize: 9,
                          color: "var(--muted)",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {count}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Top Sources */}
            {todayStats.topSources.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: "var(--muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    marginBottom: 8,
                  }}
                >
                  Active Sources
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {todayStats.topSources.map(([source, count]) => (
                    <div
                      key={source}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "5px 0",
                        borderBottom: "1px solid color-mix(in srgb, var(--border) 50%, transparent)",
                      }}
                    >
                      <span style={{ fontSize: 11, color: "var(--foreground)", fontWeight: 500 }}>
                        {source}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontFamily: "var(--font-mono)",
                          color: "var(--muted)",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {count}건
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
