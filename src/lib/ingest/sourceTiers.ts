export type WireSourceTier = "T0" | "T1" | "T2" | "T3";

export interface SourceDescriptor {
  name: string;
  category: string;
  feedUrl?: string;
  tier?: WireSourceTier | null;
}

export interface TierSchedule {
  intervalMs: number;
  timeoutMs: number;
  retryAttempts: number;
}

export const FALLBACK_TIERS: readonly WireSourceTier[] = ["T0", "T1"];

export function isFallbackTier(tier: WireSourceTier): boolean {
  return FALLBACK_TIERS.includes(tier);
}

const DEFAULT_SCHEDULES: Record<WireSourceTier, TierSchedule> = {
  // Official releases change less often than breaking wires, but they remain
  // close enough to release time for a personal macro desk.
  T0: { intervalMs: 45_000, timeoutMs: 12_000, retryAttempts: 3 },
  T1: { intervalMs: 25_000, timeoutMs: 10_000, retryAttempts: 3 },
  T2: { intervalMs: 120_000, timeoutMs: 15_000, retryAttempts: 2 },
  T3: { intervalMs: 600_000, timeoutMs: 15_000, retryAttempts: 2 },
};

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
}

export function getTierSchedules(
  env: Record<string, string | undefined> = process.env,
): Record<WireSourceTier, TierSchedule> {
  return {
    T0: {
      ...DEFAULT_SCHEDULES.T0,
      intervalMs: positiveInteger(env.WIRE_T0_INTERVAL_MS, DEFAULT_SCHEDULES.T0.intervalMs),
    },
    T1: {
      ...DEFAULT_SCHEDULES.T1,
      intervalMs: positiveInteger(env.WIRE_T1_INTERVAL_MS, DEFAULT_SCHEDULES.T1.intervalMs),
    },
    T2: {
      ...DEFAULT_SCHEDULES.T2,
      intervalMs: positiveInteger(env.WIRE_T2_INTERVAL_MS, DEFAULT_SCHEDULES.T2.intervalMs),
    },
    T3: {
      ...DEFAULT_SCHEDULES.T3,
      intervalMs: positiveInteger(env.WIRE_T3_INTERVAL_MS, DEFAULT_SCHEDULES.T3.intervalMs),
    },
  };
}

export function inferSourceTier(source: SourceDescriptor): WireSourceTier {
  if (source.tier) return source.tier;

  const name = source.name.toLowerCase();
  const category = source.category.toLowerCase();

  if (
    /(federal reserve|\becb\b|bank of korea|한국은행|\bbls\b|\bbea\b)/i.test(name)
  ) {
    return "T0";
  }

  if (
    category === "속보" ||
    /(breaking|bloomberg markets|연합뉴스 속보)/i.test(name)
  ) {
    return "T1";
  }

  if (category === "커뮤니티" || category === "분석" || /hacker news|reddit|r\//i.test(name)) {
    return "T3";
  }

  return "T2";
}

export function failureBackoffMs(
  tier: WireSourceTier,
  consecutiveFailures: number,
  schedules = getTierSchedules(),
): number {
  const interval = schedules[tier].intervalMs;
  const exponent = Math.max(0, Math.min(consecutiveFailures - 1, 5));
  return Math.min(interval * 2 ** exponent, 30 * 60_000);
}

export function nextPollAt(
  tier: WireSourceTier,
  completedAt: Date,
  consecutiveFailures = 0,
  schedules = getTierSchedules(),
): Date {
  const delay = consecutiveFailures > 0
    ? failureBackoffMs(tier, consecutiveFailures, schedules)
    : schedules[tier].intervalMs;
  return new Date(completedAt.getTime() + delay);
}
