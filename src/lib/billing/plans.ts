/**
 * Plan definitions. Stripe price IDs come from env so deployers can swap
 * between test/live without rebuilding. Same plans render on the pricing
 * page and gate the API tiers.
 */
import type { Tier } from "@prisma/client";

export type PlanKey = "free" | "pro" | "elite";

export interface Plan {
  key: PlanKey;
  tier: Tier;
  name: string;
  priceKRW: number;
  priceUSD: number;
  priceIdEnv?: string;
  highlight?: boolean;
  bullets: { ko: string; en: string }[];
  limits: {
    aiInsightsPerDay: number;
    historyDays: number;
    watchlistSize: number;
    portfolioSize: number;
    sources: "all" | "core";
    dailyRecap: boolean;
    personalBriefing: boolean;
    emailDigest: boolean;
    exportEnabled: boolean;
  };
}

export const PLANS: Record<PlanKey, Plan> = {
  free: {
    key: "free",
    tier: "FREE",
    name: "FREE",
    priceKRW: 0,
    priceUSD: 0,
    bullets: [
      { ko: "핵심 매크로 소스", en: "Core macro sources" },
      { ko: "24시간 뉴스 윈도우", en: "24-hour news window" },
      { ko: "워치리스트 5개", en: "Watchlist of 5" },
      { ko: "AI 인사이트 일 3회", en: "AI insights 3/day" },
    ],
    limits: {
      aiInsightsPerDay: 3,
      historyDays: 1,
      watchlistSize: 5,
      portfolioSize: 6,
      sources: "core",
      dailyRecap: false,
      personalBriefing: false,
      emailDigest: false,
      exportEnabled: false,
    },
  },
  pro: {
    key: "pro",
    tier: "PRO",
    name: "PRO",
    priceKRW: 9900,
    priceUSD: 9,
    priceIdEnv: "STRIPE_PRICE_PRO",
    highlight: true,
    bullets: [
      { ko: "전체 소스 + 속보 우선 큐", en: "All sources + breaking priority" },
      { ko: "7일·30일 뉴스 윈도우", en: "7-day / 30-day news windows" },
      { ko: "워치리스트·포트폴리오 확장", en: "Expanded watchlist & portfolio" },
      { ko: "AI 인사이트 무제한 + 일일 매크로 리캡", en: "Unlimited AI + daily macro recap" },
      { ko: "개인화 브리핑", en: "Personalized briefing" },
      { ko: "이메일 다이제스트", en: "Email digest" },
      { ko: "기사 내보내기", en: "Article export" },
    ],
    limits: {
      aiInsightsPerDay: -1,
      historyDays: 30,
      watchlistSize: 100,
      portfolioSize: 24,
      sources: "all",
      dailyRecap: true,
      personalBriefing: true,
      emailDigest: true,
      exportEnabled: true,
    },
  },
  elite: {
    key: "elite",
    tier: "ELITE",
    name: "ELITE",
    priceKRW: 29900,
    priceUSD: 29,
    priceIdEnv: "STRIPE_PRICE_ELITE",
    bullets: [
      { ko: "PRO 전체 기능", en: "Everything in PRO" },
      { ko: "고급 모델 인사이트", en: "Advanced-model insights" },
      { ko: "대규모 워치리스트·포트폴리오", en: "Large watchlist & portfolio" },
      { ko: "우선 지원", en: "Priority support" },
    ],
    limits: {
      aiInsightsPerDay: -1,
      historyDays: 30,
      watchlistSize: 1000,
      portfolioSize: 48,
      sources: "all",
      dailyRecap: true,
      personalBriefing: true,
      emailDigest: true,
      exportEnabled: true,
    },
  },
};

export function planFromTier(tier: Tier): Plan {
  if (tier === "ELITE") return PLANS.elite;
  if (tier === "PRO") return PLANS.pro;
  return PLANS.free;
}

/**
 * Stripe price IDs are configuration, not user input. Unknown IDs must not be
 * silently interpreted as FREE because that can hide a misconfigured paid
 * product and incorrectly downgrade an active subscriber.
 */
export function tierFromPriceId(priceId: string | null | undefined): Tier | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_PRO) return "PRO";
  if (priceId === process.env.STRIPE_PRICE_ELITE) return "ELITE";
  return null;
}
