"use client";

/**
 * MacroWire wordmark — Bulletin edition.
 *
 * Wire-service masthead: a heavy condensed all-caps wordmark sat next to
 * a tiny meta caption ("DISPATCH №…") in the manner of a 1970s teletype
 * banner. No more gradient text, no Spike SVG mark — typography alone.
 *
 *   <Logo />                          // masthead with caption
 *   <Logo size="xl" caption={false}/> // wordmark only, hero scale
 */

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
  xs: { fontSize: 14, capSize: 7,  gap: 6,  letterSpacing: "0.04em" },
  sm: { fontSize: 18, capSize: 8,  gap: 8,  letterSpacing: "0.04em" },
  md: { fontSize: 24, capSize: 9,  gap: 10, letterSpacing: "0.05em" },
  lg: { fontSize: 36, capSize: 10, gap: 14, letterSpacing: "0.05em" },
  xl: { fontSize: 64, capSize: 12, gap: 18, letterSpacing: "0.06em" },
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
    color === "amber" ? "#FFB000" : color === "current" ? "currentColor" : "#F5F0E1";

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
        style={{
          fontFamily: "var(--font-display-condensed), 'Anton', 'Pretendard Variable', sans-serif",
          fontSize: dims.fontSize,
          fontWeight: 400, // Anton ships at 400
          color: wordmarkColor,
          textTransform: "uppercase",
          letterSpacing: dims.letterSpacing,
        }}
      >
        MACROWIRE
      </span>
      {caption && (
        <span
          style={{
            display: "inline-flex",
            flexDirection: "column",
            gap: 2,
            paddingLeft: dims.gap,
            borderLeft: "1px solid rgba(245,240,225,0.18)",
            fontFamily: "var(--font-mono), 'JetBrains Mono', monospace",
            fontSize: dims.capSize,
            color: "#C9C4B6",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            lineHeight: 1.3,
          }}
        >
          <span>DISPATCH</span>
          <span style={{ color: "#FFB000" }}>№ {dispatch}</span>
        </span>
      )}
    </div>
  );
}
