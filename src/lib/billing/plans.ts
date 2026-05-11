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
  priceIdEnv?: string; // env var holding the Stripe price id
  highlight?: boolean;
  bullets: { ko: string; en: string }[];
  limits: {
    aiInsightsPerDay: number; // 0 = unavailable, -1 = unlimited
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
      { ko: "27개 핵심 소스", en: "27 core sources" },
      { ko: "24시간 윈도우", en: "24-hour window" },
      { ko: "워치리스트 5개", en: "Watchlist of 5" },
      { ko: "AI 인사이트 일 3회", en: "AI insights 3/day" },
    ],
    limits: {
      aiInsightsPerDay: 3,
      watchlistSize: 5,
      portfolioSize: 3,
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
      { ko: "7일·30일 추세 분석", en: "7-day / 30-day trends" },
      { ko: "워치리스트·포트폴리오 무제한", en: "Unlimited watchlist & portfolio" },
      { ko: "AI 인사이트 무제한 + 일일 매크로 리캡", en: "Unlimited AI + daily macro recap" },
      { ko: "개인화 브리핑 (포트폴리오 기반)", en: "Personalized briefing" },
      { ko: "이메일 다이제스트", en: "Email digest" },
      { ko: "기사 내보내기 (MD, OPML, PDF)", en: "Export (MD, OPML, PDF)" },
    ],
    limits: {
      aiInsightsPerDay: -1,
      watchlistSize: 100,
      portfolioSize: 100,
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
      { ko: "분 단위 속보 모니터링", en: "Minute-level breaking monitor" },
      { ko: "다국가 매크로 통합 (KR·US·CN·EU)", en: "Multi-region macro fusion" },
      { ko: "Claude Opus 인사이트", en: "Claude Opus insights" },
      { ko: "주간 리서치 리포트 (PDF)", en: "Weekly research PDF" },
      { ko: "API 액세스", en: "API access" },
      { ko: "우선 지원", en: "Priority support" },
    ],
    limits: {
      aiInsightsPerDay: -1,
      watchlistSize: 1000,
      portfolioSize: 1000,
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

export function tierFromPriceId(priceId: string | null | undefined): Tier {
  if (!priceId) return "FREE";
  if (priceId === process.env.STRIPE_PRICE_PRO) return "PRO";
  if (priceId === process.env.STRIPE_PRICE_ELITE) return "ELITE";
  return "FREE";
}
