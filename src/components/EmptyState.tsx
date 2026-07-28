"use client";

/**
 * EmptyState — uniform empty/zero-data treatment across the app.
 *
 *   <EmptyState
 *     glyph="no-articles"
 *     title="아직 수집된 기사가 없습니다"
 *     description="새로고침을 눌러 첫 기사를 가져오세요."
 *     action={{ label: "지금 수집", onClick: runIngest }}
 *   />
 *
 * Glyphs are quiet line illustrations using the workbench signal color.
 */

export type EmptyGlyph =
  | "no-articles"      // antenna without signal — no feed yet
  | "all-read"         // outlined checkmark — caught up
  | "no-selection"     // page with arrow — pick something on the left
  | "no-portfolio"     // empty chart frame
  | "no-sources"       // disconnected wire
  | "no-notifications" // muted bell
  | "no-results"       // magnifier with line-through
  | "no-saved";        // empty bookmark

interface EmptyStateProps {
  glyph: EmptyGlyph;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
  /** Compact variant — smaller glyph, used inside tight panels */
  compact?: boolean;
}

export function EmptyState({
  glyph,
  title,
  description,
  action,
  secondaryAction,
  compact = false,
}: EmptyStateProps) {
  const size = compact ? 56 : 80;
  const padding = compact ? "32px 20px" : "56px 24px";

  return (
    <div className="empty-state" style={{ padding }}>
      <Glyph name={glyph} size={size} />
      <h3 className="empty-state-title" style={{ fontSize: compact ? 13 : 16, marginTop: compact ? 14 : 20 }}>
        {title}
      </h3>
      {description && (
        <p className="empty-state-description" style={{ fontSize: compact ? 11 : 12, marginBottom: action || secondaryAction ? 20 : 0 }}>
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="empty-state-actions">
          {action && (
            <button onClick={action.onClick} className="empty-state-action is-primary">
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button onClick={secondaryAction.onClick} className="empty-state-action">
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────
   GLYPH LIBRARY — pure inline SVG, signal-blue stroke
   ────────────────────────────────────── */

function Glyph({ name, size }: { name: EmptyGlyph; size: number }) {
  const containerStyle = {
    position: "relative" as const,
    width: size,
    height: size,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const stroke = "#72AEF8";
  const dim = "rgba(114,174,248,0.48)";
  const veryDim = "rgba(114,174,248,0.2)";

  switch (name) {
    case "no-articles":
      return (
        <div style={containerStyle}>
          {/* Antenna with no incoming signal — three concentric arcs, dashed outermost */}
          <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
            {/* Base */}
            <line x1="40" y1="50" x2="40" y2="68" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
            <line x1="32" y1="68" x2="48" y2="68" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
            {/* Antenna dish */}
            <circle cx="40" cy="50" r="4" stroke={stroke} strokeWidth="2" fill="none" />
            {/* Signal arcs — increasingly faded */}
            <path d="M28 38 A 18 18 0 0 1 52 38" stroke={dim} strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M22 32 A 26 26 0 0 1 58 32" stroke={veryDim} strokeWidth="2" strokeLinecap="round" fill="none" strokeDasharray="3 4" />
          </svg>
        </div>
      );

    case "all-read":
      return (
        <div style={containerStyle}>
          {/* Outlined check inside a soft circle */}
          <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
            <circle cx="40" cy="40" r="28" stroke={dim} strokeWidth="2" fill="none" />
            <circle cx="40" cy="40" r="22" stroke={veryDim} strokeWidth="1" fill="none" strokeDasharray="2 3" />
            <path d="M30 41 L37 48 L51 32" stroke={stroke} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </div>
      );

    case "no-selection":
      return (
        <div style={containerStyle}>
          {/* Document with arrow pointing into it from the left */}
          <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
            <rect x="36" y="20" width="32" height="42" rx="2" stroke={stroke} strokeWidth="2" fill="none" />
            <line x1="42" y1="30" x2="62" y2="30" stroke={dim} strokeWidth="1.6" strokeLinecap="round" />
            <line x1="42" y1="38" x2="58" y2="38" stroke={dim} strokeWidth="1.6" strokeLinecap="round" />
            <line x1="42" y1="46" x2="54" y2="46" stroke={dim} strokeWidth="1.6" strokeLinecap="round" />
            {/* Arrow */}
            <line x1="14" y1="41" x2="30" y2="41" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
            <path d="M24 35 L30 41 L24 47" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </div>
      );

    case "no-portfolio":
      return (
        <div style={containerStyle}>
          {/* Empty chart frame with axis */}
          <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
            <rect x="14" y="14" width="52" height="46" rx="2" stroke={stroke} strokeWidth="2" fill="none" />
            <line x1="20" y1="54" x2="60" y2="54" stroke={dim} strokeWidth="1.4" />
            <line x1="20" y1="22" x2="20" y2="54" stroke={dim} strokeWidth="1.4" />
            {/* Subtle dashed flat line */}
            <line x1="22" y1="42" x2="58" y2="42" stroke={veryDim} strokeWidth="1.6" strokeDasharray="2 3" strokeLinecap="round" />
            {/* Tick marks */}
            <line x1="30" y1="54" x2="30" y2="56" stroke={dim} strokeWidth="1.2" />
            <line x1="40" y1="54" x2="40" y2="56" stroke={dim} strokeWidth="1.2" />
            <line x1="50" y1="54" x2="50" y2="56" stroke={dim} strokeWidth="1.2" />
          </svg>
        </div>
      );

    case "no-sources":
      return (
        <div style={containerStyle}>
          {/* Disconnected wire — two ends with a gap */}
          <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
            <circle cx="20" cy="40" r="6" stroke={stroke} strokeWidth="2" fill="none" />
            <line x1="26" y1="40" x2="36" y2="40" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
            <line x1="44" y1="40" x2="54" y2="40" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
            <circle cx="60" cy="40" r="6" stroke={stroke} strokeWidth="2" fill="none" />
            {/* Gap indicator — small slash */}
            <line x1="38" y1="36" x2="42" y2="44" stroke={dim} strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </div>
      );

    case "no-notifications":
      return (
        <div style={containerStyle}>
          {/* Muted bell with sleep z-zz lines */}
          <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
            <path d="M28 50 V40 a12 12 0 0 1 24 0 V50 l3 4 H25 Z" stroke={stroke} strokeWidth="2" strokeLinejoin="round" fill="none" />
            <path d="M37 56 a3 3 0 0 0 6 0" stroke={stroke} strokeWidth="2" strokeLinecap="round" fill="none" />
            {/* Slash through indicating muted */}
            <line x1="20" y1="22" x2="60" y2="62" stroke={dim} strokeWidth="2" strokeLinecap="round" strokeDasharray="2 3" />
          </svg>
        </div>
      );

    case "no-results":
      return (
        <div style={containerStyle}>
          {/* Magnifier with no result inside */}
          <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
            <circle cx="34" cy="34" r="16" stroke={stroke} strokeWidth="2" fill="none" />
            <line x1="46" y1="46" x2="60" y2="60" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" />
            {/* Slash inside the magnifier */}
            <line x1="26" y1="34" x2="42" y2="34" stroke={dim} strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
      );

    case "no-saved":
      return (
        <div style={containerStyle}>
          {/* Outlined bookmark */}
          <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
            <path d="M30 18 H50 a2 2 0 0 1 2 2 V60 L40 52 L28 60 V20 a2 2 0 0 1 2 -2 Z" stroke={stroke} strokeWidth="2" strokeLinejoin="round" fill="none" />
            <line x1="36" y1="34" x2="44" y2="34" stroke={dim} strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </div>
      );
  }
}
