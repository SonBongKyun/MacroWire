import assert from "node:assert/strict";
import test from "node:test";
import {
  getEconEvents,
  getNextEconEvent,
  groupEconEventsByDay,
  toKstDate,
} from "../src/lib/calendar/econ";

test("produces a populated forward calendar for any month, not a frozen list", () => {
  // The old calendar was a literal array dated 2026-03; four months later every
  // row was in the past. Sample months across two years — all must be alive.
  for (const iso of [
    "2026-01-15T00:00:00Z",
    "2026-03-23T00:00:00Z",
    "2026-07-30T12:00:00Z",
    "2026-12-28T00:00:00Z",
    "2027-02-11T00:00:00Z",
  ]) {
    const now = new Date(iso);
    const events = getEconEvents(now);
    const upcoming = events.filter((e) => e.at.getTime() > now.getTime());
    assert.ok(
      upcoming.length >= 8,
      `${iso} produced only ${upcoming.length} upcoming events`
    );
    assert.ok(getNextEconEvent(events, now), `${iso} has no next event`);
  }
});

test("keeps every event inside the requested window", () => {
  const now = new Date("2026-07-30T12:00:00Z");
  const events = getEconEvents(now, { lookbackDays: 2, lookaheadDays: 30 });
  for (const e of events) {
    const days = (e.at.getTime() - now.getTime()) / 86_400_000;
    assert.ok(days >= -2 && days <= 30, `${e.title} @ ${e.kstDate} out of window`);
  }
});

test("events are sorted and grouped by KST day", () => {
  const events = getEconEvents(new Date("2026-07-30T12:00:00Z"));
  for (let i = 1; i < events.length; i++) {
    assert.ok(events[i].at.getTime() >= events[i - 1].at.getTime());
  }
  const groups = groupEconEventsByDay(events);
  const dates = groups.map((g) => g.date);
  assert.deepEqual([...dates], [...dates].sort(), "day groups must be ascending");
  assert.equal(new Set(dates).size, dates.length, "each day appears once");
});

test("US releases follow EST/EDT instead of a fixed KST offset", () => {
  // 08:30 New York = 21:30 KST under EDT, 22:30 KST under EST.
  const summer = getEconEvents(new Date("2026-07-01T00:00:00Z"), { lookaheadDays: 40 })
    .find((e) => e.id.startsWith("us-cpi"));
  const winter = getEconEvents(new Date("2026-12-01T00:00:00Z"), { lookaheadDays: 40 })
    .find((e) => e.id.startsWith("us-cpi"));

  assert.ok(summer && winter);
  assert.equal(summer.kstTime, "21:30");
  assert.equal(winter.kstTime, "22:30");
});

test("nth-weekday rules land on the right weekday", () => {
  const events = getEconEvents(new Date("2026-07-01T00:00:00Z"), { lookaheadDays: 45 });

  const payrolls = events.find((e) => e.id.startsWith("us-payrolls"));
  assert.ok(payrolls);
  // First Friday of the month in New York terms.
  assert.equal(new Date(payrolls.at).getUTCDay(), 5);

  const pce = events.find((e) => e.id.startsWith("us-pce"));
  assert.ok(pce);
  assert.equal(new Date(pce.at).getUTCDay(), 5);
});

test("day-of-month rules skip weekends forward", () => {
  // 2026-08-01 is a Saturday, so a 'day 1, adjust next' release moves to Monday.
  const events = getEconEvents(new Date("2026-07-28T00:00:00Z"), { lookaheadDays: 20 });
  const trade = events.find((e) => e.id === "kr-trade-2026-08");
  assert.ok(trade, "expected the August 한국 수출입 동향 entry");
  assert.equal(trade.kstDate, "2026-08-03");
});

test("last-business-day rules never land on a weekend", () => {
  const events = getEconEvents(new Date("2026-01-01T00:00:00Z"), { lookaheadDays: 400 });
  for (const e of events.filter((x) => x.id.startsWith("cn-pmi"))) {
    const kstWeekday = new Date(`${e.kstDate}T00:00:00Z`).getUTCDay();
    assert.ok(kstWeekday !== 0 && kstWeekday !== 6, `${e.kstDate} is a weekend`);
  }
});

test("recurring entries are labelled estimated so the UI can say so", () => {
  const events = getEconEvents(new Date("2026-07-30T12:00:00Z"));
  assert.ok(events.length > 0);
  assert.ok(events.every((e) => e.precision === "estimated"));
});

test("toKstDate reports the Korean calendar day, not UTC", () => {
  // 2026-07-30T16:00Z is already 2026-07-31 in Seoul.
  assert.equal(toKstDate(new Date("2026-07-30T16:00:00Z")), "2026-07-31");
  assert.equal(toKstDate(new Date("2026-07-30T14:00:00Z")), "2026-07-30");
});
