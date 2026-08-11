import { classifyArticleSignal } from "./signal";
import type { WireSourceTier } from "../ingest/sourceTiers";

export type ImportanceTier = "critical" | "major" | "general";

export interface ImportanceInput {
  title: string;
  summary?: string | null;
  tags: string[];
  sourceName: string;
  sourceTier: WireSourceTier;
  publishedAt: Date | string;
  coverageCount?: number;
}

export interface NewsImportance {
  tier: ImportanceTier;
  score: number;
  reasons: string[];
}

const TIER_BONUS: Record<WireSourceTier, number> = {
  T0: 24,
  T1: 14,
  T2: 5,
  T3: 0,
};

export function classifyNewsImportance(
  article: ImportanceInput,
  now = Date.now(),
): NewsImportance {
  const signal = classifyArticleSignal({ ...article, summary: article.summary ?? null });
  const reasons = [...signal.reasons];
  let score = Math.round(signal.score * 0.72) + TIER_BONUS[article.sourceTier];

  if (article.sourceTier === "T0") reasons.unshift("공식 발표");
  else if (article.sourceTier === "T1") reasons.unshift("속보 소스");

  const publishedAt = new Date(article.publishedAt).getTime();
  const ageMs = Number.isFinite(publishedAt) ? Math.max(0, now - publishedAt) : Number.POSITIVE_INFINITY;
  if (ageMs <= 30 * 60_000) {
    score += 8;
    reasons.push("30분 이내");
  } else if (ageMs <= 3 * 60 * 60_000) {
    score += 4;
    reasons.push("3시간 이내");
  }

  const coverage = Math.max(1, article.coverageCount ?? 1);
  if (coverage >= 4) {
    score += 14;
    reasons.push(`${coverage}개 매체 확인`);
  } else if (coverage >= 2) {
    score += 7;
    reasons.push(`${coverage}개 매체 확인`);
  }

  score = Math.max(0, Math.min(100, score));
  const tier: ImportanceTier = score >= 70 ? "critical" : score >= 38 ? "major" : "general";

  return {
    tier,
    score,
    reasons: [...new Set(reasons)].slice(0, 4),
  };
}
