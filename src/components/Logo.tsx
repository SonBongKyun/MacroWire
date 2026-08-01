"use client";

interface LogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  /** Show the small "DISPATCH №…" caption next to the wordmark */
  caption?: boolean;
  /** Override the wordmark color */
  color?: "paper" | "amber" | "current";
  /** Optional explicit dispatch number; default uses today */
  dispatchNo?: string;
  className?: string;
}

const SIZE_MAP = {
  xs: { fontSize: 14, markSize: 21, markFontSize: 7, capSize: 7, gap: 7 },
  sm: { fontSize: 18, markSize: 27, markFontSize: 8, capSize: 8, gap: 8 },
  md: { fontSize: 24, markSize: 34, markFontSize: 10, capSize: 9, gap: 10 },
  lg: { fontSize: 36, markSize: 46, markFontSize: 12, capSize: 10, gap: 13 },
  xl: { fontSize: 58, markSize: 68, markFontSize: 17, capSize: 12, gap: 16 },
} as const;

function defaultDispatch(): string {
  const d = new Date();
  // Day-of-year approximation as the "dispatch number" — feels like a wire bulletin
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / 86_400_000);
  return String(dayOfYear).padStart(3, "0");
}

export function Logo({
  size = "sm",
  caption = false,
  color = "paper",
  dispatchNo,
  className,
}: LogoProps) {
  const dims = SIZE_MAP[size];
  const wordmarkColor =
    color === "amber" ? "#f1bd58" : color === "current" ? "currentColor" : "#f3f4f2";

  const dispatch = dispatchNo ?? defaultDispatch();

  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: dims.gap,
        userSelect: "none",
        lineHeight: 1,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: "inline-grid",
          width: dims.markSize,
          height: dims.markSize,
          placeItems: "center",
          flex: "0 0 auto",
          color: "#0d1115",
          background: "#72aef8",
          borderRadius: 2,
          fontFamily: "var(--font-mono), monospace",
          fontSize: dims.markFontSize,
          fontWeight: 700,
        }}
      >
        MW
      </span>
      <span
        style={{
          fontFamily: "var(--font-interface), 'Pretendard Variable', sans-serif",
          fontSize: dims.fontSize,
          fontWeight: 700,
          color: wordmarkColor,
        }}
      >
        MacroWire
      </span>
      {caption && (
        <span
          style={{
            display: "inline-flex",
            flexDirection: "column",
            gap: 2,
            paddingLeft: dims.gap,
            borderLeft: "1px solid color-mix(in srgb, var(--foreground-bright) 18%, transparent)",
            fontFamily: "var(--font-mono), monospace",
            fontSize: dims.capSize,
            color: "#929ba4",
            lineHeight: 1.3,
          }}
        >
          <span>Dispatch</span>
          <span style={{ color: "#72aef8" }}>No. {dispatch}</span>
        </span>
      )}
    </div>
  );
}
