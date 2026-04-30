"use client";

import { useState, useEffect, useMemo } from "react";

interface EconEvent {
  date: string;
  time: string;
  title: string;
  region: string;
  importance: "high" | "medium";
}

const EVENTS: EconEvent[] = [
  { date: "2026-03-23", time: "09:00", title: "한국 GDP 성장률", region: "KR", importance: "high" },
  { date: "2026-03-24", time: "21:30", title: "미국 내구재 주문", region: "US", importance: "medium" },
  { date: "2026-03-25", time: "10:00", title: "한국 소비자신뢰지수", region: "KR", importance: "medium" },
  { date: "2026-03-25", time: "23:00", title: "미국 소비자신뢰지수", region: "US", importance: "high" },
  { date: "2026-03-26", time: "09:00", title: "일본 BOJ 회의록", region: "JP", importance: "medium" },
  { date: "2026-03-26", time: "21:30", title: "미국 GDP 확정치", region: "US", importance: "high" },
  { date: "2026-03-27", time: "08:00", title: "한국 산업생산", region: "KR", importance: "medium" },
  { date: "2026-03-27", time: "21:30", title: "미국 PCE 물가지수", region: "US", importance: "high" },
  { date: "2026-03-28", time: "09:00", title: "중국 PMI 제조업", region: "CN", importance: "high" },
  { date: "2026-03-28", time: "15:00", title: "유럽 HICP 인플레이션", region: "EU", importance: "high" },
  { date: "2026-03-31", time: "09:00", title: "한국 수출입 동향", region: "KR", importance: "high" },
  { date: "2026-03-31", time: "22:00", title: "미국 ISM 제조업 PMI", region: "US", importance: "high" },
];

const REGION_LABELS: Record<string, string> = {
  KR: "KR",
  US: "US",
  JP: "JP",
  CN: "CN",
  EU: "EU",
};

const REGION_COLORS: Record<string, string> = {
  KR: "#C9A96E",
  US: "#C9A96E",
  JP: "#8C8C91",
  CN: "#8C8C91",
  EU: "#8C8C91",
};

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

function formatDateHeader(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const dayName = DAY_NAMES[d.getDay()];
  return `${String(month).padStart(2, "0")}.${String(day).padStart(2, "0")} (${dayName})`;
}

function getEventDateTime(ev: EconEvent): Date {
  return new Date(`${ev.date}T${ev.time}:00`);
}

export function EconomicCalendar() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const today = now.toISOString().slice(0, 10);

  // Group events by date, sorted
  const grouped = useMemo(() => {
    const sorted = [...EVENTS].sort((a, b) => {
      const cmp = a.date.localeCompare(b.date);
      if (cmp !== 0) return cmp;
      return a.time.localeCompare(b.time);
    });

    const groups: { date: string; events: EconEvent[] }[] = [];
    for (const ev of sorted) {
      const last = groups[groups.length - 1];
      if (last && last.date === ev.date) {
        last.events.push(ev);
      } else {
        groups.push({ date: ev.date, events: [ev] });
      }
    }
    return groups;
  }, []);

  // Find next upcoming event for countdown
  const nextEvent = useMemo(() => {
    const nowMs = now.getTime();
    for (const ev of EVENTS) {
      const evTime = getEventDateTime(ev).getTime();
      if (evTime > nowMs) return ev;
    }
    return null;
  }, [now]);

  const countdown = useMemo(() => {
    if (!nextEvent) return null;
    const diff = getEventDateTime(nextEvent).getTime() - now.getTime();
    if (diff <= 0) return null;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}일 ${hours % 24}시간`;
    }
    return `${hours}시간 ${mins}분`;
  }, [nextEvent, now]);

  return (
    <div>
      <div className="dash-section-title">ECONOMIC CALENDAR</div>

      {/* Countdown */}
      {countdown && nextEvent && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 10px",
            marginBottom: 10,
            background: "rgba(201,169,110,0.06)",
            border: "1px solid rgba(201,169,110,0.15)",
            borderRadius: 2,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9A96E" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
          </svg>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "#C9A96E",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {nextEvent.title}
            </div>
            <div
              style={{
                fontSize: 9,
                color: "var(--muted)",
                marginTop: 1,
              }}
            >
              다음 이벤트까지{" "}
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontVariantNumeric: "tabular-nums",
                  color: "#C9A96E",
                  fontWeight: 700,
                }}
              >
                {countdown}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Events grouped by date */}
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {grouped.map((group) => {
          const isToday = group.date === today;
          const isPast = group.date < today;

          return (
            <div key={group.date}>
              {/* Date header */}
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  fontVariantNumeric: "tabular-nums",
                  color: isToday ? "#C9A96E" : isPast ? "var(--muted)" : "var(--foreground-secondary)",
                  padding: "10px 0 4px",
                  letterSpacing: "0.02em",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {formatDateHeader(group.date)}
                {isToday && (
                  <span
                    style={{
                      fontSize: 8,
                      fontWeight: 700,
                      color: "#0D0E12",
                      background: "#C9A96E",
                      padding: "1px 5px",
                      borderRadius: 2,
                      letterSpacing: "0.04em",
                      fontFamily: "var(--font-heading)",
                    }}
                  >
                    TODAY
                  </span>
                )}
              </div>

              {/* Events for this date */}
              {group.events.map((ev, idx) => {
                const evPast = isPast || (isToday && getEventDateTime(ev).getTime() < now.getTime());
                const regionColor = REGION_COLORS[ev.region] || "#8C8C91";

                return (
                  <div
                    key={`${ev.date}-${ev.time}-${ev.title}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "7px 0 7px 8px",
                      borderBottom: idx < group.events.length - 1 ? "1px solid var(--border-subtle)" : "none",
                      borderLeft: isToday
                        ? "3px solid #C9A96E"
                        : "3px solid transparent",
                      opacity: evPast ? 0.45 : 1,
                      transition: "opacity 0.2s",
                    }}
                  >
                    {/* Importance dot */}
                    <span
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: ev.importance === "high" ? "#C9A96E" : "#8C8C91",
                        flexShrink: 0,
                        opacity: ev.importance === "high" ? 1 : 0.5,
                      }}
                    />

                    {/* Time */}
                    <span
                      style={{
                        fontSize: 11,
                        fontFamily: "var(--font-mono)",
                        fontVariantNumeric: "tabular-nums",
                        color: evPast ? "var(--muted)" : "var(--foreground-secondary)",
                        fontWeight: 500,
                        width: 40,
                        flexShrink: 0,
                      }}
                    >
                      {ev.time}
                    </span>

                    {/* Title */}
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: evPast ? "var(--muted)" : "var(--foreground-bright)",
                        flex: 1,
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {ev.title}
                    </span>

                    {/* Region badge */}
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        padding: "2px 6px",
                        borderRadius: 2,
                        color: regionColor,
                        background: `${regionColor}15`,
                        flexShrink: 0,
                        letterSpacing: "0.03em",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {REGION_LABELS[ev.region] || ev.region}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
