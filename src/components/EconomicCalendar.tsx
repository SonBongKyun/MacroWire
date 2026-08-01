"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock } from "lucide-react";
import { useVisibleInterval } from "@/hooks/useVisibleInterval";
import {
  getEconEvents,
  getNextEconEvent,
  groupEconEventsByDay,
  toKstDate,
  type EconEvent,
} from "@/lib/calendar/econ";

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

function formatDateHeader(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return `${String(month).padStart(2, "0")}.${String(day).padStart(2, "0")} (${DAY_NAMES[d.getUTCDay()]})`;
}

function formatCountdown(ms: number): string {
  const totalMinutes = Math.floor(ms / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}일 ${hours}시간`;
  if (hours > 0) return `${hours}시간 ${minutes}분`;
  return `${minutes}분`;
}

export function EconomicCalendar() {
  // Rendered null-first so the server markup and the hydrated markup agree —
  // everything here depends on the current time.
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
  }, []);

  useVisibleInterval(
    useCallback(() => setNow(new Date()), []),
    60_000
  );

  // Recompute on the minute is wasteful for the expansion itself, so key the
  // event list off the day and let only the countdown tick.
  const today = now ? toKstDate(now) : "";
  const events = useMemo<EconEvent[]>(
    () => (today ? getEconEvents(new Date(`${today}T00:00:00+09:00`)) : []),
    [today]
  );

  const groups = useMemo(() => groupEconEventsByDay(events), [events]);
  const nextEvent = useMemo(
    () => (now ? getNextEconEvent(events, now) : null),
    [events, now]
  );

  const countdown =
    nextEvent && now ? formatCountdown(nextEvent.at.getTime() - now.getTime()) : null;

  return (
    <div className="econ-cal">
      <div className="dash-section-title">경제 일정</div>

      {countdown && nextEvent && (
        <div className="econ-cal-next">
          <Clock size={14} aria-hidden="true" />
          <div className="econ-cal-next-body">
            <div className="econ-cal-next-title">{nextEvent.title}</div>
            <div className="econ-cal-next-meta">
              다음 지표까지 <b>{countdown}</b>
            </div>
          </div>
        </div>
      )}

      {now && groups.length === 0 && (
        <p className="econ-cal-empty">향후 30일간 예정된 주요 지표가 없습니다.</p>
      )}

      <div className="econ-cal-days">
        {groups.map((group) => {
          const isToday = group.date === today;
          const isPast = group.date < today;

          return (
            <div key={group.date}>
              <div
                className={`econ-cal-date ${isToday ? "is-today" : ""} ${isPast ? "is-past" : ""}`}
              >
                {formatDateHeader(group.date)}
                {isToday && <span className="econ-cal-today-badge">TODAY</span>}
              </div>

              {group.events.map((ev, idx) => {
                const isDone = Boolean(now && ev.at.getTime() < now.getTime());
                return (
                  <div
                    key={ev.id}
                    className={[
                      "econ-cal-row",
                      `is-${ev.importance}`,
                      isToday ? "is-today" : "",
                      isDone ? "is-done" : "",
                      idx < group.events.length - 1 ? "has-rule" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <span className="econ-cal-dot" aria-hidden="true" />
                    <span className="econ-cal-time">{ev.kstTime}</span>
                    <span className="econ-cal-title">
                      {ev.title}
                      {ev.precision === "estimated" && (
                        <span
                          className="econ-cal-estimate"
                          title="공표 규칙으로 계산한 예상일입니다. 기관 사정에 따라 하루 정도 달라질 수 있습니다."
                        >
                          추정
                        </span>
                      )}
                    </span>
                    <span className={`econ-cal-region region-${ev.region}`}>{ev.region}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {groups.length > 0 && (
        <p className="econ-cal-note">
          반복 지표는 공표 규칙 기반 예상일 · 시각은 KST · 공휴일 미반영
        </p>
      )}
    </div>
  );
}
