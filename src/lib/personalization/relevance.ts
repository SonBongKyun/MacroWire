import profileConfig from "../../../config/personal_relevance.json";
import type { Article } from "../../types";
import { classifyArticleSignal } from "../news/signal";

export type PersonalInteractionType =
  | "opened"
  | "original-opened"
  | "saved"
  | "read"
  | "dismissed"
  | "note-created";

export interface PersonalInteraction {
  articleId: string;
  type: PersonalInteractionType;
  at: string;
  topics: string[];
  assets: string[];
}

export interface PersonalRelevanceProfile {
  profileId: string;
  topicWeights: Record<string, number>;
  followedAssets: string[];
  highRelevanceThreshold: number;
}

export interface PersonalRelevanceResult {
  articleId: string;
  score: number;
  isHigh: boolean;
  reasons: string[];
  topics: string[];
  topicLabels: string[];
  assets: string[];
  factors: {
    topicPreference: number;
    assetRelevance: number;
    recency: number;
    importance: number;
    interactionHistory: number;
  };
}

interface TopicRule {
  key: string;
  label: string;
  patterns: RegExp[];
  tags: string[];
  assets: string[];
}

const TOPIC_RULES: TopicRule[] = [
  {
    key: "rates",
    label: "Rates",
    patterns: [/금리|통화정책|interest rates?|rate (?:cut|hike)|yield curve/i],
    tags: ["금리"],
    assets: ["US2Y", "US10Y", "DXY"],
  },
  {
    key: "fed",
    label: "Fed",
    patterns: [/연준|federal reserve|\bfed\b|fomc/i],
    tags: ["연준"],
    assets: ["US2Y", "US10Y", "DXY", "SOX"],
  },
  {
    key: "treasury",
    label: "Treasury",
    patterns: [/미국채|국채|treasur|bond yields?|채권금리/i],
    tags: ["채권"],
    assets: ["US2Y", "US10Y", "DXY"],
  },
  {
    key: "inflation",
    label: "Inflation",
    patterns: [/물가|인플레이션|\bcpi\b|\bppi\b|\bpce\b|inflation/i],
    tags: ["물가"],
    assets: ["US2Y", "US10Y", "DXY", "WTI"],
  },
  {
    key: "fx",
    label: "FX",
    patterns: [/환율|원[·\-/]?달러|달러[·\-/]?원|currency|forex|\bdxy\b/i],
    tags: ["환율"],
    assets: ["USD/KRW", "DXY"],
  },
  {
    key: "semiconductors",
    label: "Semiconductors",
    patterns: [/반도체|파운드리|메모리칩|\bhbm\b|semiconductor|\bnvidia\b|\btsmc\b|chip exports?/i],
    tags: ["반도체"],
    assets: ["SOX", "SOXL", "NVDA"],
  },
  {
    key: "korea",
    label: "Korea",
    patterns: [/한국|한국은행|코스피|코스닥|원화|korea|\bkospi\b|usd\/krw/i],
    tags: ["한국", "수출입", "가계부채"],
    assets: ["USD/KRW", "KOSPI"],
  },
  {
    key: "oil",
    label: "Oil",
    patterns: [/국제유가|원유|브렌트|\bwti\b|\bopec\b|crude oil|호르무즈/i],
    tags: ["에너지", "원자재"],
    assets: ["WTI", "US10Y"],
  },
  {
    key: "boj",
    label: "BOJ",
    patterns: [/일본은행|\bboj\b|엔화|yen/i],
    tags: ["일본"],
    assets: ["DXY"],
  },
  {
    key: "ai-capex",
    label: "AI capex",
    patterns: [/(?:ai|인공지능).*(?:투자|capex|데이터센터|반도체)|(?:capex|데이터센터).*(?:ai|인공지능)/i],
    tags: ["AI"],
    assets: ["NVDA", "SOX", "SOXL"],
  },
  {
    key: "credit",
    label: "Credit",
    patterns: [/신용|회사채|스프레드|credit|default|부도|가계부채/i],
    tags: ["가계부채", "채권"],
    assets: ["US2Y", "US10Y"],
  },
  {
    key: "crypto",
    label: "Crypto",
    patterns: [/비트코인|암호화폐|가상자산|bitcoin|crypto|\bbtc\b/i],
    tags: ["크립토"],
    assets: ["BTC"],
  },
];

const TOPIC_BY_KEY = new Map(TOPIC_RULES.map((rule) => [rule.key, rule]));

export const DEFAULT_PERSONAL_RELEVANCE_PROFILE = profileConfig as PersonalRelevanceProfile;

function cleanTag(tag: string): string {
  return tag.trim().replace(/^#/, "").toLowerCase();
}

export function extractPersonalContext(
  article: Pick<Article, "title" | "summary" | "tags" | "sourceName">,
): { topics: string[]; topicLabels: string[]; assets: string[] } {
  const signal = classifyArticleSignal(article);
  const text = `${article.title} ${article.summary ?? ""} ${article.sourceName} ${signal.reasons.join(" ")}`;
  const tags = new Set(article.tags.map(cleanTag));
  const matched = TOPIC_RULES.filter((rule) =>
    rule.tags.some((tag) => tags.has(cleanTag(tag))) ||
    rule.patterns.some((pattern) => pattern.test(text)),
  );

  return {
    topics: matched.map((rule) => rule.key),
    topicLabels: matched.map((rule) => rule.label),
    assets: [...new Set(matched.flatMap((rule) => rule.assets))],
  };
}

function interactionWeight(type: PersonalInteractionType): number {
  if (type === "saved" || type === "note-created") return 2;
  if (type === "original-opened") return 1.5;
  if (type === "opened") return 0.75;
  if (type === "read") return 0.5;
  return -1;
}

function recencyPoints(publishedAt: string, now: number): number {
  const age = Math.max(0, now - new Date(publishedAt).getTime());
  if (!Number.isFinite(age)) return 0;
  if (age <= 3 * 60 * 60_000) return 10;
  if (age <= 12 * 60 * 60_000) return 8;
  if (age <= 24 * 60 * 60_000) return 6;
  if (age <= 7 * 24 * 60 * 60_000) return 3;
  return 0;
}

export function scorePersonalRelevance(
  article: Article,
  options: {
    profile?: PersonalRelevanceProfile;
    interactions?: PersonalInteraction[];
    coverageCount?: number;
    now?: number;
  } = {},
): PersonalRelevanceResult {
  const profile = options.profile ?? DEFAULT_PERSONAL_RELEVANCE_PROFILE;
  const context = extractPersonalContext(article);
  const followedAssets = new Set(profile.followedAssets.map((asset) => asset.toUpperCase()));
  const relatedFollowedAssets = context.assets.filter((asset) => followedAssets.has(asset.toUpperCase()));
  const topicWeight = context.topics.reduce(
    (sum, key) => sum + Math.max(0, Math.min(10, profile.topicWeights[key] ?? 0)),
    0,
  );
  const topicPreference = Math.min(50, topicWeight * 3);
  const assetRelevance = Math.min(20, relatedFollowedAssets.length * 5);
  const recency = recencyPoints(article.publishedAt, options.now ?? Date.now());
  const importance = Math.round(Math.max(0, Math.min(100, article.importanceScore ?? 0)) * 0.15);

  let interactionHistory = article.isSaved ? 3 : article.isRead ? 1 : 0;
  for (const interaction of options.interactions ?? []) {
    if (interaction.articleId === article.id) {
      interactionHistory += interactionWeight(interaction.type);
      continue;
    }
    const topicOverlap = interaction.topics.filter((topic) => context.topics.includes(topic)).length;
    const assetOverlap = interaction.assets.filter((asset) => relatedFollowedAssets.includes(asset)).length;
    if (topicOverlap || assetOverlap) {
      interactionHistory += interactionWeight(interaction.type) * Math.min(1, topicOverlap * 0.35 + assetOverlap * 0.2);
    }
  }
  interactionHistory = Math.max(-5, Math.min(10, Math.round(interactionHistory)));

  const coverageBonus = Math.min(3, Math.max(0, (options.coverageCount ?? 1) - 1));
  const score = Math.max(0, Math.min(100, Math.round(
    topicPreference + assetRelevance + recency + importance + interactionHistory + coverageBonus,
  )));

  const rankedTopics = context.topics
    .map((key) => ({
      key,
      label: TOPIC_BY_KEY.get(key)?.label ?? key,
      weight: profile.topicWeights[key] ?? 0,
    }))
    .sort((a, b) => b.weight - a.weight || a.label.localeCompare(b.label));
  const reasons = [...rankedTopics.map((item) => item.label), ...relatedFollowedAssets].filter(
    (value, index, all) => all.indexOf(value) === index,
  ).slice(0, 3);

  return {
    articleId: article.id,
    score,
    isHigh: score >= profile.highRelevanceThreshold && reasons.length > 0,
    reasons,
    topics: rankedTopics.map((item) => item.key),
    topicLabels: rankedTopics.map((item) => item.label),
    assets: relatedFollowedAssets,
    factors: {
      topicPreference,
      assetRelevance,
      recency,
      importance,
      interactionHistory,
    },
  };
}
