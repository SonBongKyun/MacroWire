"use client";

import { useRef, useState, useEffect, useMemo } from "react";

interface PriceChartProps {
  data: number[];
  width?: number;
  height?: number;
  label?: string;
  change?: number;
}

export function PriceChart({ data, width: propWidth, height = 120, label, change }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(propWidth || 0);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  useEffect(() => {
    if (propWidth) return;
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [propWidth]);

  const w = propWidth || containerWidth;
  if (!data || data.length < 2) return <div ref={containerRef} style={{ width: "100%", height }} />;

  const isPositive = change !== undefined ? change >= 0 : data[data.length - 1] >= data[0];
  const lineColor = isPositive ? "#C9A96E" : "#ef4444";
  const fillColor = isPositive ? "rgba(201,169,110,0.1)" : "rgba(239,68,68,0.1)";

  const padRight = 52;
  const padTop = 6;
  const padBottom = data.length === 24 ? 18 : 6;
  const chartW = Math.max(w - padRight, 20);
  const chartH = height - padTop - padBottom;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * chartW;
    const y = padTop + chartH - ((v - min) / range) * chartH;
    return { x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x.toFixed(2)},${padTop + chartH} L${points[0].x.toFixed(2)},${padTop + chartH} Z`;

  const startPrice = data[0];
  const currentPrice = data[data.length - 1];
  const startY = padTop + chartH - ((startPrice - min) / range) * chartH;

  // X-axis labels for 24-point data
  const xLabels = data.length === 24
    ? [0, 6, 12, 18].map((i) => ({
        x: (i / (data.length - 1)) * chartW,
        label: String(i).padStart(2, "0"),
      }))
    : [];

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    // Find closest data point index
    const idx = Math.round((mouseX / chartW) * (data.length - 1));
    const clampedIdx = Math.max(0, Math.min(data.length - 1, idx));
    setHoverIndex(clampedIdx);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const hoverPoint = hoverIndex !== null ? points[hoverIndex] : null;
  const hoverPrice = hoverIndex !== null ? data[hoverIndex] : null;

  return (
    <div ref={containerRef} style={{ width: propWidth || "100%", position: "relative" }}>
      {w > 0 && (
        <>
        <svg
          width={w}
          height={height}
          viewBox={`0 0 ${w} ${height}`}
          style={{ display: "block", overflow: "visible", cursor: hoverIndex !== null ? "crosshair" : "default" }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Reference line at start price */}
          <line
            x1={0}
            y1={startY}
            x2={chartW}
            y2={startY}
            stroke="#2D2D32"
            strokeWidth={1}
            strokeDasharray="3,3"
          />

          {/* Area fill */}
          <path d={areaPath} fill={fillColor} />

          {/* Line */}
          <path d={linePath} fill="none" stroke={lineColor} strokeWidth={1.5} />

          {/* Current price dot */}
          <circle
            cx={points[points.length - 1].x}
            cy={points[points.length - 1].y}
            r={2.5}
            fill={lineColor}
          />

          {/* Y-axis: min/max labels on right */}
          <text
            x={w - 2}
            y={padTop + 4}
            textAnchor="end"
            fill="#8C8C91"
            fontSize={10}
            fontFamily="'Space Mono', var(--font-mono), monospace"
          >
            {max >= 1000 ? max.toLocaleString("en-US", { maximumFractionDigits: 0 }) : max.toFixed(2)}
          </text>
          <text
            x={w - 2}
            y={padTop + chartH}
            textAnchor="end"
            fill="#8C8C91"
            fontSize={10}
            fontFamily="'Space Mono', var(--font-mono), monospace"
          >
            {min >= 1000 ? min.toLocaleString("en-US", { maximumFractionDigits: 0 }) : min.toFixed(2)}
          </text>

          {/* Current price label */}
          <text
            x={w - 2}
            y={points[points.length - 1].y + 4}
            textAnchor="end"
            fill={lineColor}
            fontSize={10}
            fontWeight={700}
            fontFamily="'Space Mono', var(--font-mono), monospace"
          >
            {currentPrice >= 1000
              ? currentPrice.toLocaleString("en-US", { maximumFractionDigits: 0 })
              : currentPrice.toFixed(2)}
          </text>

          {/* X-axis labels */}
          {xLabels.map((xl) => (
            <text
              key={xl.label}
              x={xl.x}
              y={height - 2}
              textAnchor="middle"
              fill="#8C8C91"
              fontSize={10}
              fontFamily="'Space Mono', var(--font-mono), monospace"
            >
              {xl.label}
            </text>
          ))}

          {/* Hover crosshair */}
          {hoverPoint && (
            <>
              <line
                x1={hoverPoint.x}
                y1={padTop}
                x2={hoverPoint.x}
                y2={padTop + chartH}
                stroke="#8C8C91"
                strokeWidth={1}
                strokeDasharray="3,3"
                pointerEvents="none"
              />
              <circle
                cx={hoverPoint.x}
                cy={hoverPoint.y}
                r={4}
                fill="#C9A96E"
                pointerEvents="none"
              />
            </>
          )}
        </svg>

        {/* Hover tooltip */}
        {hoverPoint && hoverPrice !== null && (
          <div
            style={{
              position: "absolute",
              left: hoverPoint.x,
              top: hoverPoint.y - 32,
              transform: "translateX(-50%)",
              background: "#1A1A1F",
              border: "1px solid #2D2D32",
              padding: "4px 8px",
              fontFamily: "'Space Mono', var(--font-mono), monospace",
              fontSize: 11,
              color: "#EBEBEB",
              whiteSpace: "nowrap",
              pointerEvents: "none",
              zIndex: 10,
              borderRadius: 2,
            }}
          >
            {hoverPrice >= 1000
              ? hoverPrice.toLocaleString("en-US", { maximumFractionDigits: 0 })
              : hoverPrice.toFixed(2)}
          </div>
        )}
        </>
      )}
    </div>
  );
}

/** Tiny inline sparkline for use in tight spaces. Pure SVG, no axes or labels. */
export function MiniSparkline({
  data,
  width = 60,
  height = 30,
  change,
}: {
  data: number[];
  width?: number;
  height?: number;
  change?: number;
}) {
  if (!data || data.length < 2) return null;

  const isPositive = change !== undefined ? change >= 0 : data[data.length - 1] >= data[0];
  const lineColor = isPositive ? "#C9A96E" : "#ef4444";
  const fillColor = isPositive ? "rgba(201,169,110,0.08)" : "rgba(239,68,68,0.08)";

  const pad = 1;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (width - pad * 2);
    const y = pad + (height - pad * 2) - ((v - min) / range) * (height - pad * 2);
    return { x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x.toFixed(2)},${height - pad} L${points[0].x.toFixed(2)},${height - pad} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
      <path d={areaPath} fill={fillColor} />
      <path d={linePath} fill="none" stroke={lineColor} strokeWidth={1} />
    </svg>
  );
}
