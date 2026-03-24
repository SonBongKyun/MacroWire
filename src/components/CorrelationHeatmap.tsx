"use client";

import { useMemo, useState } from "react";
import type { Article } from "@/types";

interface CorrelationHeatmapProps {
  articles: Article[];
}

export function CorrelationHeatmap({ articles }: CorrelationHeatmapProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  const { tags, matrix } = useMemo(() => {
    // Count tag frequencies
    const tagCounts: Record<string, number> = {};
    for (const a of articles) {
      for (const t of a.tags) {
        tagCounts[t] = (tagCounts[t] || 0) + 1;
      }
    }

    // Top 8 most frequent tags
    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tag]) => tag);

    // Compute co-occurrence matrix
    const mat: number[][] = Array.from({ length: topTags.length }, () =>
      new Array(topTags.length).fill(0)
    );

    for (const a of articles) {
      const articleTags = a.tags.filter((t) => topTags.includes(t));
      for (let i = 0; i < articleTags.length; i++) {
        for (let j = 0; j < articleTags.length; j++) {
          const ri = topTags.indexOf(articleTags[i]);
          const ci = topTags.indexOf(articleTags[j]);
          if (ri >= 0 && ci >= 0) {
            mat[ri][ci] += 1;
          }
        }
      }
    }

    return { tags: topTags, matrix: mat };
  }, [articles]);

  if (tags.length === 0) {
    return (
      <div>
        <div className="dash-section-title">TAG CORRELATION</div>
        <div style={{ fontSize: 12, color: "var(--muted)" }}>태그 데이터 없음</div>
      </div>
    );
  }

  const maxVal = Math.max(
    ...matrix.flatMap((row, ri) =>
      row.map((v, ci) => (ri === ci ? 0 : v))
    ),
    1
  );

  const cellSize = 24;
  const labelWidth = 56;
  const gridSize = tags.length * cellSize;

  return (
    <div>
      <div className="dash-section-title">TAG CORRELATION</div>
      <div
        style={{ position: "relative", display: "inline-block" }}
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Column headers */}
        <div style={{ display: "flex", marginLeft: labelWidth }}>
          {tags.map((tag) => (
            <div
              key={`col-${tag}`}
              style={{
                width: cellSize,
                height: labelWidth,
                position: "relative",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  bottom: 4,
                  left: cellSize / 2,
                  transformOrigin: "bottom left",
                  transform: "rotate(-45deg)",
                  fontSize: 9,
                  fontFamily: "var(--font-mono)",
                  color: "#8C8C91",
                  whiteSpace: "nowrap",
                }}
              >
                {tag}
              </span>
            </div>
          ))}
        </div>

        {/* Grid rows */}
        <div style={{ display: "flex" }}>
          {/* Row labels */}
          <div style={{ width: labelWidth, flexShrink: 0 }}>
            {tags.map((tag) => (
              <div
                key={`row-${tag}`}
                style={{
                  height: cellSize,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  paddingRight: 6,
                  fontSize: 9,
                  fontFamily: "var(--font-mono)",
                  color: "#8C8C91",
                }}
              >
                {tag}
              </div>
            ))}
          </div>

          {/* Cells */}
          <div style={{ width: gridSize }}>
            {tags.map((rowTag, ri) => (
              <div key={`row-${ri}`} style={{ display: "flex" }}>
                {tags.map((colTag, ci) => {
                  const val = matrix[ri][ci];
                  const isDiag = ri === ci;
                  const opacity = isDiag
                    ? 0.05
                    : val === 0
                    ? 0.03
                    : 0.1 + (val / maxVal) * 0.7;

                  return (
                    <div
                      key={`${ri}-${ci}`}
                      style={{
                        width: cellSize,
                        height: cellSize,
                        background: `rgba(201, 169, 110, ${opacity})`,
                        border: "1px solid rgba(45, 45, 50, 0.5)",
                        cursor: isDiag ? "default" : "pointer",
                        transition: "background 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        if (isDiag) return;
                        const rect = (e.target as HTMLElement).getBoundingClientRect();
                        const parent = (e.target as HTMLElement).closest("[style]")?.getBoundingClientRect();
                        if (parent) {
                          setTooltip({
                            x: rect.left - parent.left + cellSize / 2,
                            y: rect.top - parent.top - 8,
                            text: `${rowTag} + ${colTag}: ${val}건`,
                          });
                        }
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Tooltip */}
        {tooltip && (
          <div
            style={{
              position: "absolute",
              left: tooltip.x + labelWidth,
              top: tooltip.y + labelWidth,
              transform: "translate(-50%, -100%)",
              background: "#1A1A1F",
              border: "1px solid #2D2D32",
              padding: "4px 8px",
              fontSize: 10,
              fontFamily: "var(--font-mono)",
              color: "#EBEBEB",
              whiteSpace: "nowrap",
              pointerEvents: "none",
              zIndex: 10,
              boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
            }}
          >
            {tooltip.text}
          </div>
        )}
      </div>
    </div>
  );
}
