"use client";

interface MacroIndicator {
  label: string;
  value: string;
  direction: "up" | "down" | "flat";
}

const KR_INDICATORS: MacroIndicator[] = [
  { label: "기준금리", value: "3.00%", direction: "flat" },
  { label: "CPI (YoY)", value: "2.1%", direction: "down" },
  { label: "GDP (YoY)", value: "2.0%", direction: "up" },
];

const US_INDICATORS: MacroIndicator[] = [
  { label: "기준금리", value: "4.25-4.50%", direction: "flat" },
  { label: "CPI (YoY)", value: "2.8%", direction: "down" },
  { label: "GDP (YoY)", value: "2.3%", direction: "up" },
];

const DIRECTION_ICON: Record<string, { symbol: string; color: string }> = {
  up: { symbol: "\u25B2", color: "#22c55e" },
  down: { symbol: "\u25BC", color: "#ef4444" },
  flat: { symbol: "\u2500", color: "#8C8C91" },
};

function IndicatorRow({ item }: { item: MacroIndicator }) {
  const dir = DIRECTION_ICON[item.direction];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "6px 0",
        borderBottom: "1px solid rgba(45, 45, 50, 0.5)",
      }}
    >
      <span style={{ fontSize: 10, color: "#8C8C91" }}>{item.label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span
          style={{
            fontSize: 15,
            fontWeight: 700,
            fontFamily: "var(--font-mono)",
            fontVariantNumeric: "tabular-nums",
            color: "#EBEBEB",
          }}
        >
          {item.value}
        </span>
        <span style={{ fontSize: 8, color: dir.color }}>{dir.symbol}</span>
      </div>
    </div>
  );
}

export function GlobalMacroDashboard() {
  return (
    <div>
      <div className="dash-section-title">MACRO INDICATORS</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
        }}
      >
        {/* Korea */}
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "#C9A96E",
              letterSpacing: "0.06em",
              marginBottom: 6,
              textTransform: "uppercase",
            }}
          >
            Korea
          </div>
          {KR_INDICATORS.map((item) => (
            <IndicatorRow key={item.label} item={item} />
          ))}
        </div>

        {/* US / Global */}
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "#C9A96E",
              letterSpacing: "0.06em",
              marginBottom: 6,
              textTransform: "uppercase",
            }}
          >
            US / Global
          </div>
          {US_INDICATORS.map((item) => (
            <IndicatorRow key={item.label} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
