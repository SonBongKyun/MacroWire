"use client";

import { useMemo } from "react";
import type { Article } from "@/types";
import { analyzeSentiment } from "@/lib/sentiment/sentiment";

interface SourceAnalysisProps {
  articles: Article[];
}

interface SourceStat {
  sourceId: string;
  sourceName: string;
  articleCount: number;
  topTags: string[];
  avgSentiment: "bullish" | "bearish" | "neutral";
  sentimentScore: number; // -1 to 1
  articlesPerDay: number;
  readRate: number;
  saveRate: number;
  qualityScore: number;
}

export function SourceAnalysis({ articles }: SourceAnalysisProps) {
  const sourceStats = useMemo(() => {
    if (articles.length === 0) return [];

    // Group articles by source
    const bySource: Record<string, Article[]> = {};
    for (const a of articles) {
      if (!bySource[a.sourceId]) bySource[a.sourceId] = [];
      bySource[a.sourceId].push(a);
    }

    const stats: SourceStat[] = [];

    for (const [sourceId, sourceArticles] of Object.entries(bySource)) {
      const sourceName = sourceArticles[0].sourceName;

      // Top tags
      const tagCounts: Record<string, number> = {};
      for (const a of sourceArticles) {
        for (const tag of a.tags) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
      }
      const topTags = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([tag]) => tag);

      // Average sentiment
      let posCount = 0;
      let negCount = 0;
      for (const a of sourceArticles) {
        const result = analyzeSentiment(a.title, a.summary);
        if (result.sentiment === "positive") posCount++;
        else if (result.sentiment === "negative") negCount++;
      }
      const total = sourceArticles.length;
      const sentimentScore = total > 0 ? (posCount - negCount) / total : 0;
      const avgSentiment: "bullish" | "bearish" | "neutral" =
        sentimentScore > 0.15 ? "bullish" : sentimentScore < -0.15 ? "bearish" : "neutral";

      // Publishing frequency (articles per day)
      const timestamps = sourceArticles.map((a) => new Date(a.publishedAt).getTime());
      const minTime = Math.min(...timestamps);
      const maxTime = Math.max(...timestamps);
      const daySpan = Math.max((maxTime - minTime) / (1000 * 60 * 60 * 24), 1);
      const articlesPerDay = Math.round((sourceArticles.length / daySpan) * 10) / 10;

      // Read rate and save rate
      const readCount = sourceArticles.filter((a) => a.isRead).length;
      const saveCount = sourceArticles.filter((a) => a.isSaved).length;
      const readRate = total > 0 ? readCount / total : 0;
      const saveRate = total > 0 ? saveCount / total : 0;

      // Quality score: weighted combination
      const qualityScore = Math.round(
        readRate * 40 +
        saveRate * 30 +
        Math.min(articlesPerDay / 10, 1) * 15 +
        Math.abs(sentimentScore) * 15
      );

      stats.push({
        sourceId,
        sourceName,
        articleCount: total,
        topTags,
        avgSentiment,
        sentimentScore,
        articlesPerDay,
        readRate,
        saveRate,
        qualityScore: Math.max(0, Math.min(100, qualityScore)),
      });
    }

    return stats.sort((a, b) => b.qualityScore - a.qualityScore).slice(0, 10);
  }, [articles]);

  if (sourceStats.length === 0) {
    return null;
  }

  const sentimentIcon = (s: "bullish" | "bearish" | "neutral") => {
    if (s === "bullish") return { symbol: "\u25B2", color: "#22c55e" };
    if (s === "bearish") return { symbol: "\u25BC", color: "#ef4444" };
    return { symbol: "\u25CF", color: "#8C8C91" };
  };

  return (
    <div>
      {/* Title */}
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: "#8C8C91",
          letterSpacing: "0.08em",
          textTransform: "uppercase" as const,
          marginBottom: 12,
          fontFamily: "var(--font-heading)",
        }}
      >
        SOURCE ANALYSIS
      </div>

      {/* Header row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 36px 1fr 48px 40px",
          gap: 8,
          paddingBottom: 6,
          borderBottom: "1px solid #2C2D34",
          marginBottom: 2,
        }}
      >
        {["Source", "Bias", "Top Tags", "Freq", "Qual"].map((h) => (
          <span
            key={h}
            style={{
              fontSize: 9,
              fontWeight: 600,
              color: "#8C8C91",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            {h}
          </span>
        ))}
      </div>

      {/* Data rows */}
      {sourceStats.map((src) => {
        const icon = sentimentIcon(src.avgSentiment);
        return (
          <div
            key={src.sourceId}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 36px 1fr 48px 40px",
              gap: 8,
              padding: "6px 0",
              borderBottom: "1px solid rgba(44,45,52,0.5)",
              alignItems: "center",
            }}
          >
            {/* Source name */}
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#EBEBEB",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {src.sourceName}
            </span>

            {/* Bias icon */}
            <span
              style={{
                fontSize: 10,
                color: icon.color,
                textAlign: "center",
              }}
            >
              {icon.symbol}
            </span>

            {/* Top Tags */}
            <div
              style={{
                display: "flex",
                gap: 4,
                overflow: "hidden",
              }}
            >
              {src.topTags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: 9,
                    color: "#8C8C91",
                    whiteSpace: "nowrap",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Frequency */}
            <span
              style={{
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                fontVariantNumeric: "tabular-nums",
                color: "#EBEBEB",
                textAlign: "right",
              }}
            >
              {src.articlesPerDay}/d
            </span>

            {/* Quality */}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div
                style={{
                  flex: 1,
                  height: 3,
                  background: "#2C2D34",
                  borderRadius: 1,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${src.qualityScore}%`,
                    height: "100%",
                    background:
                      src.qualityScore > 60
                        ? "#C9A96E"
                        : src.qualityScore > 30
                          ? "#8C8C91"
                          : "#ef4444",
                    transition: "width 0.4s ease",
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
