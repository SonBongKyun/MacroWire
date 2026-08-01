/**
 * Economic calendar expansion.
 *
 * The calendar used to be a frozen array of dated literals; by the time anyone
 * looked at it the whole list had rolled into the past and the "next event"
 * countdown was permanently dead. Recurring statistical releases follow stable
 * published rules, so they are expanded on demand from `config/econ_calendar.json`
 * and the panel is correct in any month without anyone editing it.
 *
 * Rule-derived dates are marked `estimated` — an agency can shift a release by a
 * day, and the UI says so rather than implying a confirmed time.
 */

import calendarConfig from "../../../config/econ_calendar.json";

export type EconRegion = "KR" | "US" | "JP" | "CN" | "EU" | string;
export type EconImportance = "high" | "medium";
export type EconPrecision = "confirmed" | "estimated";

export interface EconEvent {
  id: string;
  title: string;
  region: EconRegion;
  importance: EconImportance;
  /** Instant of the release, in UTC. */
  at: Date;
  /** "YYYY-MM-DD" in KST — the grouping key the UI renders by. */
  kstDate: string;
  /** "HH:MM" in KST. */
  kstTime: string;
  precision: EconPrecision;
}

type Recurrence =
  | { kind: "nthWeekday"; nth: number; weekday: number }
  | { kind: "dayOfMonth"; day: number; adjust?: "next" | "prev" }
  | { kind: "lastBusinessDay" };

interface RecurringSpec {
  id: string;
  title: string;
  region: EconRegion;
  importance: EconImportance;
  time: string;
  timeZone: string;
  rule: Recurrence;
}

interface AnchorSpec {
  id: string;
  title: string;
  region: EconRegion;
  importance: EconImportance;
  /** "YYYY-MM-DD" in the agency's own timezone. */
  date: string;
  time: string;
  timeZone: string;
}

const KST = "Asia/Seoul";

/** Milliseconds to add to a UTC instant to get the wall clock in `timeZone`. */
function zoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
    .formatToParts(instant)
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    }, {});

  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second)
  );
  return asUtc - instant.getTime();
}

/**
 * Turn a wall-clock time in `timeZone` into the UTC instant it refers to.
 * Iterated twice so DST transitions resolve correctly.
 */
function zonedWallTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): Date {
  const naive = Date.UTC(year, month - 1, day, hour, minute);
  let instant = naive;
  for (let i = 0; i < 2; i++) {
    instant = naive - zoneOffsetMs(new Date(instant), timeZone);
  }
  return new Date(instant);
}

function parseTime(time: string): { hour: number; minute: number } {
  const [h, m] = time.split(":");
  return { hour: Number(h) || 0, minute: Number(m) || 0 };
}

/** Calendar fields of `instant` as seen in `timeZone`. */
function zonedParts(instant: Date, timeZone: string) {
  const offset = zoneOffsetMs(instant, timeZone);
  const shifted = new Date(instant.getTime() + offset);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** "YYYY-MM-DD" for an instant, as seen in KST. */
export function toKstDate(instant: Date): string {
  const p = zonedParts(instant, KST);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

function toKstTime(instant: Date): string {
  const p = zonedParts(instant, KST);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function weekdayOf(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function isWeekend(year: number, month: number, day: number): boolean {
  const wd = weekdayOf(year, month, day);
  return wd === 0 || wd === 6;
}

/**
 * Resolve a recurrence to a day-of-month within a given year/month.
 * Returns null when the rule cannot land in that month.
 *
 * Weekend adjustment only skips Saturdays and Sundays — public holidays are not
 * modelled, which is why these events are labelled estimated.
 */
function resolveDay(rule: Recurrence, year: number, month: number): number | null {
  const total = daysInMonth(year, month);

  if (rule.kind === "dayOfMonth") {
    let day = Math.min(Math.max(rule.day, 1), total);
    const step = rule.adjust === "prev" ? -1 : 1;
    if (rule.adjust) {
      let guard = 0;
      while (isWeekend(year, month, day) && guard++ < 7) {
        day += step;
        if (day < 1 || day > total) return null;
      }
    }
    return day;
  }

  if (rule.kind === "lastBusinessDay") {
    let day = total;
    let guard = 0;
    while (isWeekend(year, month, day) && guard++ < 7) day -= 1;
    return day >= 1 ? day : null;
  }

  // nthWeekday: positive counts from the start, -1 means the last one.
  if (rule.nth < 0) {
    for (let day = total; day >= 1; day--) {
      if (weekdayOf(year, month, day) === rule.weekday) return day;
    }
    return null;
  }

  let seen = 0;
  for (let day = 1; day <= total; day++) {
    if (weekdayOf(year, month, day) !== rule.weekday) continue;
    if (++seen === rule.nth) return day;
  }
  return null;
}

function expandRecurring(spec: RecurringSpec, year: number, month: number): EconEvent | null {
  const day = resolveDay(spec.rule, year, month);
  if (day === null) return null;

  const { hour, minute } = parseTime(spec.time);
  const at = zonedWallTimeToUtc(year, month, day, hour, minute, spec.timeZone);

  return {
    id: `${spec.id}-${year}-${pad(month)}`,
    title: spec.title,
    region: spec.region,
    importance: spec.importance,
    at,
    kstDate: toKstDate(at),
    kstTime: toKstTime(at),
    precision: "estimated",
  };
}

function expandAnchor(spec: AnchorSpec): EconEvent | null {
  const [y, m, d] = spec.date.split("-").map(Number);
  if (!y || !m || !d) return null;
  const { hour, minute } = parseTime(spec.time);
  const at = zonedWallTimeToUtc(y, m, d, hour, minute, spec.timeZone);
  return {
    id: spec.id,
    title: spec.title,
    region: spec.region,
    importance: spec.importance,
    at,
    kstDate: toKstDate(at),
    kstTime: toKstTime(at),
    precision: "confirmed",
  };
}

const RECURRING = (calendarConfig.recurring ?? []) as unknown as RecurringSpec[];
const ANCHORS = (calendarConfig.anchors ?? []) as unknown as AnchorSpec[];

export interface CalendarWindow {
  /** Days of already-released events to keep for context. Default 2. */
  lookbackDays?: number;
  /** Days ahead to project. Default 30. */
  lookaheadDays?: number;
}

/**
 * Every event that falls inside the window around `now`, sorted by time.
 * Confirmed anchors win over an estimated release of the same title on the
 * same day, so pasting a real FOMC date replaces the derived guess.
 */
export function getEconEvents(now: Date, window: CalendarWindow = {}): EconEvent[] {
  const lookback = window.lookbackDays ?? 2;
  const lookahead = window.lookaheadDays ?? 30;
  const from = now.getTime() - lookback * 86_400_000;
  const to = now.getTime() + lookahead * 86_400_000;

  const events: EconEvent[] = [];

  // Walk the months the window can touch, plus one on each side for spillover.
  const start = zonedParts(new Date(from), KST);
  const monthsToScan = Math.ceil(lookahead / 28) + 2;
  for (let offset = -1; offset < monthsToScan; offset++) {
    const cursor = new Date(Date.UTC(start.year, start.month - 1 + offset, 1));
    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth() + 1;
    for (const spec of RECURRING) {
      const event = expandRecurring(spec, year, month);
      if (event) events.push(event);
    }
  }

  for (const spec of ANCHORS) {
    const event = expandAnchor(spec);
    if (event) events.push(event);
  }

  const confirmedKeys = new Set(
    events
      .filter((e) => e.precision === "confirmed")
      .map((e) => `${e.kstDate}|${e.title}`)
  );

  return events
    .filter((e) => {
      const t = e.at.getTime();
      if (t < from || t > to) return false;
      if (e.precision === "estimated" && confirmedKeys.has(`${e.kstDate}|${e.title}`)) {
        return false;
      }
      return true;
    })
    .sort((a, b) => a.at.getTime() - b.at.getTime());
}

export interface EconDayGroup {
  date: string;
  events: EconEvent[];
}

export function groupEconEventsByDay(events: EconEvent[]): EconDayGroup[] {
  const groups: EconDayGroup[] = [];
  for (const event of events) {
    const last = groups[groups.length - 1];
    if (last && last.date === event.kstDate) last.events.push(event);
    else groups.push({ date: event.kstDate, events: [event] });
  }
  return groups;
}

/** The first event still ahead of `now`, for the countdown strip. */
export function getNextEconEvent(events: EconEvent[], now: Date): EconEvent | null {
  return events.find((e) => e.at.getTime() > now.getTime()) ?? null;
}
