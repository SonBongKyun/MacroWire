"use client";

import { useMemo } from "react";
import type { Article } from "@/types";
import { analyzeSentiment } from "@/lib/sentiment/sentiment";

interface SentimentGaugeProps {
  articles: Article[];
}

export function SentimentGauge({ articles }: SentimentGaugeProps) {
  const stats = useMemo(() => {
    if (articles.length === 0) return null;

    let positive = 0;
    let negative = 0;

    for (const article of articles) {
      const result = analyzeSentiment(article.title, article.summary);
      if (result.sentiment === "positive") positive++;
      else if (result.sentiment === "negative") negative++;
    }

    const total = articles.length;
    const bullPct = Math.round((positive / total) * 100);
    const bearPct = Math.round((negative / total) * 100);
    const neutralPct = 100 - bullPct - bearPct;

    // Position: 0 = full bearish, 50 = neutral, 100 = full bullish
    // Weighted score: positive pushes right, negative pushes left
    const position = total > 0 ? ((positive - negative) / total + 1) * 50 : 50;

    return { bullPct, bearPct, neutralPct, position: Math.max(0, Math.min(100, position)) };
  }, [articles]);

  if (!stats) {
    return null;
  }

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Label */}
      <div
        className="dash-section-title"
        style={{ marginBottom: 10 }}
      >
        MARKET SENTIMENT
      </div>

      {/* Gauge bar */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: 8,
          borderRadius: 1,
          overflow: "visible",
          display: "flex",
        }}
      >
        {/* Bearish section */}
        <div
          style={{
            flex: stats.bearPct,
            background: "linear-gradient(90deg, #ef4444, #ef444480)",
            borderRadius: "1px 0 0 1px",
            minWidth: stats.bearPct > 0 ? 2 : 0,
            transition: "flex 0.5s ease",
          }}
        />
        {/* Neutral section */}
        <div
          style={{
            flex: stats.neutralPct,
            background: "#2C2D34",
            minWidth: stats.neutralPct > 0 ? 2 : 0,
            transition: "flex 0.5s ease",
          }}
        />
        {/* Bullish section */}
        <div
          style={{
            flex: stats.bullPct,
            background: "linear-gradient(90deg, #22c55e80, #22c55e)",
            borderRadius: "0 1px 1px 0",
            minWidth: stats.bullPct > 0 ? 2 : 0,
            transition: "flex 0.5s ease",
          }}
        />

        {/* Gold marker */}
        <div
          style={{
            position: "absolute",
            left: `${stats.position}%`,
            top: -3,
            transform: "translateX(-50%)",
            width: 3,
            height: 14,
            background: "#C9A96E",
            borderRadius: 1,
            boxShadow: "0 0 6px rgba(201,169,110,0.5)",
            transition: "left 0.5s ease",
          }}
        />
      </div>

      {/* Breakdown text */}
      <div
        style={{
          marginTop: 8,
          fontSize: 11,
          color: "#8C8C91",
          fontFamily: "var(--font-mono)",
          fontVariantNumeric: "tabular-nums",
          display: "flex",
          gap: 4,
        }}
      >
        <span style={{ color: "#22c55e" }}>강세 {stats.bullPct}%</span>
        <span style={{ color: "#8C8C91" }}>{" \u00B7 "}</span>
        <span>중립 {stats.neutralPct}%</span>
        <span style={{ color: "#8C8C91" }}>{" \u00B7 "}</span>
        <span style={{ color: "#ef4444" }}>약세 {stats.bearPct}%</span>
      </div>
    </div>
  );
}
