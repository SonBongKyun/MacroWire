"use client";

import React, { useState, useMemo, useCallback } from "react";
import type { Article } from "@/types";

interface ResearchTabProps {
  articles: Article[];
  onSelectArticle: (article: Article) => void;
}

function highlightKeyword(text: string, keyword: string): React.ReactElement {
  if (!keyword.trim()) return <>{text}</>;
  const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <span key={i} style={{ color: "#C9A96E", fontWeight: 700 }}>{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export function ResearchTab({ articles, onSelectArticle }: ResearchTabProps) {
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSearch = useCallback(() => {
    setActiveQuery(query.trim());
    setSelectedId(null);
  }, [query]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSearch();
      }
    },
    [handleSearch]
  );

  const filtered = useMemo(() => {
    if (!activeQuery) return [];
    const q = activeQuery.toLowerCase();
    return articles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q)) ||
        (a.summary && a.summary.toLowerCase().includes(q)) ||
        a.sourceName.toLowerCase().includes(q)
    );
  }, [articles, activeQuery]);

  const selectedArticle = useMemo(
    () => filtered.find((a) => a.id === selectedId) || null,
    [filtered, selectedId]
  );

  // Tag frequency for filtered articles
  const tagFrequency = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of filtered) {
      for (const t of a.tags) {
        map[t] = (map[t] || 0) + 1;
      }
    }
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);
  }, [filtered]);

  // Source distribution
  const sourceDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of filtered) {
      map[a.sourceName] = (map[a.sourceName] || 0) + 1;
    }
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [filtered]);

  // Timeline: article count per day (last 7 days)
  const timeline = useMemo(() => {
    const days: { label: string; date: string; count: number }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const label = `${d.getMonth() + 1}.${d.getDate()}`;
      days.push({ label, date: dateStr, count: 0 });
    }
    for (const a of filtered) {
      const aDate = a.publishedAt.slice(0, 10);
      const day = days.find((d) => d.date === aDate);
      if (day) day.count++;
    }
    return days;
  }, [filtered]);

  const maxTimeline = Math.max(...timeline.map((d) => d.count), 1);

  // Related tags: tags that co-occur with the search term (excluding the search term itself)
  const relatedTags = useMemo(() => {
    if (!activeQuery) return [];
    const q = activeQuery.toLowerCase();
    const map: Record<string, number> = {};
    for (const a of filtered) {
      const matchesTag = a.tags.some((t) => t.toLowerCase().includes(q));
      if (matchesTag) {
        for (const t of a.tags) {
          if (!t.toLowerCase().includes(q)) {
            map[t] = (map[t] || 0) + 1;
          }
        }
      }
    }
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [filtered, activeQuery]);

  const maxTagFreq = tagFrequency.length > 0 ? tagFrequency[0][1] : 1;
  const maxSourceFreq = sourceDistribution.length > 0 ? sourceDistribution[0][1] : 1;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top section: Search */}
      <div
        style={{
          padding: "20px 24px 16px",
          borderBottom: "1px solid #2D2D32",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <span
            className="font-heading"
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#C9A96E",
              letterSpacing: "0.08em",
            }}
          >
            RESEARCH
          </span>
          {activeQuery && (
            <span
              className="font-mono"
              style={{
                fontSize: 10,
                color: "#8C8C91",
              }}
            >
              {filtered.length}건
            </span>
          )}
        </div>
        <div style={{ position: "relative" }}>
          <svg
            style={{
              position: "absolute",
              left: 14,
              top: "50%",
              transform: "translateY(-50%)",
              width: 16,
              height: 16,
              color: "#8C8C91",
            }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="키워드를 입력하고 Enter..."
            style={{
              width: "100%",
              fontSize: 16,
              padding: "12px 16px 12px 42px",
              background: "#1A1A1E",
              border: "1px solid #2D2D32",
              color: "#EBEBEB",
              fontFamily: "var(--font-body)",
              outline: "none",
              transition: "border-color 0.15s",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#C9A96E";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "#2D2D32";
            }}
          />
        </div>
      </div>

      {/* Main content: Two columns */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "60% 40%",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        {/* Left column: Research Results */}
        <div
          style={{
            borderRight: "1px solid #2D2D32",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: "12px 20px 8px",
              borderBottom: "1px solid #2D2D32",
            }}
          >
            <span
              className="font-heading"
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: "#8C8C91",
                letterSpacing: "0.1em",
              }}
            >
              RESEARCH RESULTS
            </span>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {!activeQuery && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  color: "#8C8C91",
                }}
              >
                <svg
                  style={{ width: 32, height: 32, opacity: 0.3, marginBottom: 12 }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#EBEBEB" }}>
                  검색어를 입력하세요
                </p>
                <p style={{ fontSize: 10, marginTop: 4 }}>키워드를 입력하고 Enter</p>
              </div>
            )}
            {activeQuery && filtered.length === 0 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  color: "#8C8C91",
                }}
              >
                <p style={{ fontSize: 12, fontWeight: 600, color: "#EBEBEB" }}>
                  결과 없음
                </p>
                <p style={{ fontSize: 10, marginTop: 4 }}>
                  &quot;{activeQuery}&quot;에 대한 기사가 없습니다
                </p>
              </div>
            )}
            {filtered.map((article) => {
              const isSelected = selectedId === article.id;
              return (
                <button
                  key={article.id}
                  onClick={() => {
                    setSelectedId(article.id);
                    onSelectArticle(article);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 20px",
                    borderBottom: "1px solid #1A1A1E",
                    background: isSelected ? "rgba(201,169,110,0.06)" : "transparent",
                    borderLeft: isSelected ? "2px solid #C9A96E" : "2px solid transparent",
                    cursor: "pointer",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = "transparent";
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#EBEBEB",
                      lineHeight: 1.4,
                      marginBottom: 4,
                    }}
                  >
                    {highlightKeyword(article.title, activeQuery)}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 10,
                      color: "#8C8C91",
                    }}
                  >
                    <span>{article.sourceName}</span>
                    <span style={{ opacity: 0.4 }}>|</span>
                    <span className="font-mono">
                      {new Date(article.publishedAt).toLocaleDateString("ko-KR", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {article.tags.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        gap: 4,
                        marginTop: 6,
                        flexWrap: "wrap",
                      }}
                    >
                      {article.tags.slice(0, 4).map((tag) => (
                        <span
                          key={tag}
                          style={{
                            fontSize: 9,
                            padding: "1px 6px",
                            background: tag.toLowerCase().includes(activeQuery.toLowerCase())
                              ? "rgba(201,169,110,0.15)"
                              : "rgba(255,255,255,0.04)",
                            color: tag.toLowerCase().includes(activeQuery.toLowerCase())
                              ? "#C9A96E"
                              : "#8C8C91",
                            border: "1px solid",
                            borderColor: tag.toLowerCase().includes(activeQuery.toLowerCase())
                              ? "rgba(201,169,110,0.3)"
                              : "#2D2D32",
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right column: Topic Analysis */}
        <div
          style={{
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: "12px 20px 8px",
              borderBottom: "1px solid #2D2D32",
            }}
          >
            <span
              className="font-heading"
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: "#8C8C91",
                letterSpacing: "0.1em",
              }}
            >
              TOPIC ANALYSIS
            </span>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
            {!activeQuery ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  color: "#8C8C91",
                  fontSize: 11,
                }}
              >
                검색 후 분석 결과가 표시됩니다
              </div>
            ) : (
              <>
                {/* Tag Frequency */}
                {tagFrequency.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <div
                      className="font-heading"
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: "#8C8C91",
                        letterSpacing: "0.08em",
                        marginBottom: 10,
                      }}
                    >
                      TAG FREQUENCY
                    </div>
                    {tagFrequency.map(([tag, count]) => (
                      <div
                        key={tag}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 5,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 10,
                            color: "#EBEBEB",
                            width: 70,
                            flexShrink: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {tag}
                        </span>
                        <div
                          style={{
                            flex: 1,
                            height: 14,
                            background: "#1A1A1E",
                            position: "relative",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${(count / maxTagFreq) * 100}%`,
                              background: "rgba(201,169,110,0.3)",
                              borderRight: "2px solid #C9A96E",
                              transition: "width 0.3s ease",
                            }}
                          />
                        </div>
                        <span
                          className="font-mono"
                          style={{
                            fontSize: 10,
                            color: "#C9A96E",
                            width: 24,
                            textAlign: "right",
                            flexShrink: 0,
                          }}
                        >
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Source Distribution */}
                {sourceDistribution.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <div
                      className="font-heading"
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: "#8C8C91",
                        letterSpacing: "0.08em",
                        marginBottom: 10,
                      }}
                    >
                      SOURCE DISTRIBUTION
                    </div>
                    {sourceDistribution.map(([source, count]) => (
                      <div
                        key={source}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 5,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 10,
                            color: "#EBEBEB",
                            width: 90,
                            flexShrink: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {source}
                        </span>
                        <div
                          style={{
                            flex: 1,
                            height: 14,
                            background: "#1A1A1E",
                            position: "relative",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${(count / maxSourceFreq) * 100}%`,
                              background: "rgba(201,169,110,0.15)",
                              borderRight: "2px solid rgba(201,169,110,0.5)",
                              transition: "width 0.3s ease",
                            }}
                          />
                        </div>
                        <span
                          className="font-mono"
                          style={{
                            fontSize: 10,
                            color: "#8C8C91",
                            width: 24,
                            textAlign: "right",
                            flexShrink: 0,
                          }}
                        >
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Timeline: SVG bar chart */}
                <div style={{ marginBottom: 24 }}>
                  <div
                    className="font-heading"
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: "#8C8C91",
                      letterSpacing: "0.08em",
                      marginBottom: 10,
                    }}
                  >
                    TIMELINE (7 DAYS)
                  </div>
                  <svg
                    width="100%"
                    viewBox="0 0 280 100"
                    preserveAspectRatio="xMidYMid meet"
                    style={{ display: "block" }}
                  >
                    {/* Grid lines */}
                    {[0, 25, 50, 75].map((y) => (
                      <line
                        key={y}
                        x1="0"
                        y1={y}
                        x2="280"
                        y2={y}
                        stroke="#2D2D32"
                        strokeWidth="0.5"
                      />
                    ))}
                    {/* Bars */}
                    {timeline.map((day, i) => {
                      const barWidth = 28;
                      const gap = 12;
                      const x = i * (barWidth + gap);
                      const barHeight = maxTimeline > 0 ? (day.count / maxTimeline) * 65 : 0;
                      return (
                        <g key={day.date}>
                          <rect
                            x={x}
                            y={75 - barHeight}
                            width={barWidth}
                            height={barHeight}
                            fill={day.count > 0 ? "rgba(201,169,110,0.4)" : "rgba(255,255,255,0.03)"}
                            stroke={day.count > 0 ? "#C9A96E" : "#2D2D32"}
                            strokeWidth="1"
                          />
                          <text
                            x={x + barWidth / 2}
                            y={90}
                            textAnchor="middle"
                            fill="#8C8C91"
                            fontSize="8"
                            fontFamily="var(--font-mono)"
                          >
                            {day.label}
                          </text>
                          {day.count > 0 && (
                            <text
                              x={x + barWidth / 2}
                              y={75 - barHeight - 4}
                              textAnchor="middle"
                              fill="#C9A96E"
                              fontSize="8"
                              fontFamily="var(--font-mono)"
                            >
                              {day.count}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Related Tags */}
                {relatedTags.length > 0 && (
                  <div>
                    <div
                      className="font-heading"
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: "#8C8C91",
                        letterSpacing: "0.08em",
                        marginBottom: 10,
                      }}
                    >
                      RELATED TAGS
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 6,
                      }}
                    >
                      {relatedTags.map(([tag, count]) => (
                        <span
                          key={tag}
                          style={{
                            fontSize: 10,
                            padding: "3px 10px",
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid #2D2D32",
                            color: "#EBEBEB",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          {tag}
                          <span
                            className="font-mono"
                            style={{ fontSize: 9, color: "#8C8C91" }}
                          >
                            {count}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
