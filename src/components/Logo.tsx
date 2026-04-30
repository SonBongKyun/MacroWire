"use client";

/**
 * MacroWire brand logo.
 *
 * Concept — "Spike": a flat baseline interrupted by a sudden upward spike,
 * representing the moment a piece of macro news breaks. Doubles as a
 * candlestick / signal pulse / wire transmission glyph.
 *
 * Usage:
 *   <Logo />                              // mark + wordmark, default size
 *   <Logo size="lg" showWordmark={false}/> // mark only
 *   <Logo size="xl" />                    // landing-hero scale
 */

interface LogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  showWordmark?: boolean;
  /** Override the mark color. Default uses the gold gradient. */
  color?: "gold" | "white" | "current";
  className?: string;
}

const SIZE_MAP = {
  xs: { mark: 14, gap: 6,  fontSize: 13, letterSpacing: "-0.012em", weight: 800 },
  sm: { mark: 18, gap: 8,  fontSize: 16, letterSpacing: "-0.014em", weight: 800 },
  md: { mark: 22, gap: 9,  fontSize: 19, letterSpacing: "-0.016em", weight: 800 },
  lg: { mark: 32, gap: 12, fontSize: 28, letterSpacing: "-0.02em",  weight: 800 },
  xl: { mark: 56, gap: 18, fontSize: 52, letterSpacing: "-0.025em", weight: 800 },
} as const;

export function Logo({
  size = "sm",
  showWordmark = true,
  color = "gold",
  className,
}: LogoProps) {
  const dims = SIZE_MAP[size];
  const gradId = `mw-mark-grad-${size}`;

  // Wordmark fill — gold gradient text via background-clip
  const wordmarkStyle =
    color === "white"
      ? { color: "#EBEBEB" }
      : color === "current"
      ? { color: "currentColor" }
      : {
          backgroundImage:
            "linear-gradient(135deg, #E5C896 0%, #C9A96E 50%, #A88752 100%)",
          WebkitBackgroundClip: "text" as const,
          WebkitTextFillColor: "transparent" as const,
          backgroundClip: "text" as const,
        };

  // Mark stroke color
  const strokeUrl =
    color === "white"
      ? "#EBEBEB"
      : color === "current"
      ? "currentColor"
      : `url(#${gradId})`;

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
      <svg
        width={dims.mark}
        height={dims.mark}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        {color === "gold" && (
          <defs>
            <linearGradient id={gradId} x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#E5C896" />
              <stop offset="55%" stopColor="#C9A96E" />
              <stop offset="100%" stopColor="#A88752" />
            </linearGradient>
          </defs>
        )}
        {/* The "Spike" — flat baseline interrupted by a sharp upward event */}
        <path
          d="M2.5 14 L8.2 14 L10.6 6.5 L13.4 18 L15.5 14 L21.5 14"
          stroke={strokeUrl}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Subtle dot at the spike apex — emphasizes the "event" */}
        <circle cx="10.6" cy="6.5" r="1.4" fill={strokeUrl} />
      </svg>
      {showWordmark && (
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: dims.fontSize,
            fontWeight: dims.weight,
            letterSpacing: dims.letterSpacing,
            ...wordmarkStyle,
          }}
        >
          MacroWire
        </span>
      )}
    </div>
  );
}
