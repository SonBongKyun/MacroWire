import type { SourceTier } from "@prisma/client";
import type { Plan } from "./plans";

export type ArticleRange = "24h" | "7d" | "30d";

const RANGE_DAYS: Record<ArticleRange, number> = {
  "24h": 1,
  "7d": 7,
  "30d": 30,
};

const RANGE_ORDER: readonly ArticleRange[] = ["24h", "7d", "30d"];

export interface ResolvedArticleRange {
  requestedRange: ArticleRange;
  effectiveRange: ArticleRange;
  restricted: boolean;
}

export function normalizeArticleRange(value: string | null | undefined): ArticleRange {
  return value === "7d" || value === "30d" ? value : "24h";
}

export function resolveArticleRange(
  requested: string | null | undefined,
  plan: Pick<Plan, "limits">,
): ResolvedArticleRange {
  const requestedRange = normalizeArticleRange(requested);
  const maxDays = Math.max(1, plan.limits.historyDays);

  if (RANGE_DAYS[requestedRange] <= maxDays) {
    return { requestedRange, effectiveRange: requestedRange, restricted: false };
  }

  const effectiveRange = [...RANGE_ORDER]
    .reverse()
    .find((range) => RANGE_DAYS[range] <= maxDays) ?? "24h";

  return { requestedRange, effectiveRange, restricted: true };
}

export function articleRangeStart(range: ArticleRange, now = new Date()): Date {
  return new Date(now.getTime() - RANGE_DAYS[range] * 24 * 60 * 60 * 1000);
}

export function isSourceTierAllowed(
  tier: SourceTier,
  plan: Pick<Plan, "limits">,
): boolean {
  return plan.limits.sources === "all" || tier !== "T3";
}

export function sourceScopeLabel(plan: Pick<Plan, "limits">): "all" | "core" {
  return plan.limits.sources;
}
