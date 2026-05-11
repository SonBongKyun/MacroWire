/**
 * Claude-powered insight engine. Single entry point for all LLM calls;
 * results are cached in the Insight table to keep API spend bounded.
 *
 * Three audiences:
 *  - articleInsight: per-article "why does this matter" panel
 *  - clusterInsight: synthesis across related articles
 *  - dailyRecap:    top 3 stories of the day with trade implications
 *  - personalBriefing: filtered through user's watchlist + portfolio
 */
import { anthropic, modelForTier } from "./client";
import { cacheKey, getCachedInsight, setCachedInsight } from "./cache";
import {
  systemPrompt,
  articleInsightPrompt,
  clusterInsightPrompt,
  dailyRecapPrompt,
  personalBriefingPrompt,
  type ArticleLike,
  type Locale,
} from "./prompts";
import type { Tier, InsightKind } from "@prisma/client";

interface BaseOpts {
  tier: Tier;
  locale: Locale;
  ttlSeconds?: number;
}

function defaultTTL(kind: InsightKind): number {
  switch (kind) {
    case "ARTICLE":
      return 60 * 60 * 24;
    case "CLUSTER":
      return 60 * 60 * 6;
    case "DAILY_RECAP":
      return 60 * 60 * 4;
    case "PERSONAL_BRIEFING":
      return 60 * 60;
    default:
      return 60 * 60;
  }
}

async function callClaude<T>(opts: {
  tier: Tier;
  locale: Locale;
  prompt: string;
  maxTokens?: number;
}): Promise<T> {
  const model = modelForTier(opts.tier);
  const msg = await anthropic.messages.create({
    model,
    max_tokens: opts.maxTokens ?? 1024,
    system: systemPrompt(opts.locale, opts.tier),
    messages: [{ role: "user", content: opts.prompt }],
  });
  const text = msg.content
    .map((c) => (c.type === "text" ? c.text : ""))
    .join("")
    .trim();
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    console.error("[ai] JSON parse failed. raw:", text.slice(0, 500), err);
    throw new Error("AI_BAD_JSON");
  }
}

// ===========================================================
// Public API
// ===========================================================

export interface ArticleInsight {
  tldr: string;
  why: string;
  assets: string[];
  confidence: "LOW" | "MEDIUM" | "HIGH";
}

export async function articleInsight(article: ArticleLike, opts: BaseOpts): Promise<ArticleInsight> {
  const key = cacheKey({ kind: "ARTICLE", articleId: article.id, tier: opts.tier, locale: opts.locale });
  const cached = await getCachedInsight(key);
  if (cached) return cached.payload as unknown as ArticleInsight;
  const prompt = articleInsightPrompt[opts.locale](article);
  const result = await callClaude<ArticleInsight>({
    tier: opts.tier,
    locale: opts.locale,
    prompt,
    maxTokens: 600,
  });
  await setCachedInsight({
    key,
    kind: "ARTICLE",
    locale: opts.locale,
    payload: result,
    ttlSeconds: opts.ttlSeconds ?? defaultTTL("ARTICLE"),
  });
  return result;
}

export interface ClusterInsight {
  narrative: string;
  keyFacts: string[];
  openQuestions: string[];
}

export async function clusterInsight(articles: ArticleLike[], opts: BaseOpts): Promise<ClusterInsight> {
  const ids = articles.map((a) => a.id).sort().join(",");
  const key = cacheKey({ kind: "CLUSTER", ids, tier: opts.tier, locale: opts.locale });
  const cached = await getCachedInsight(key);
  if (cached) return cached.payload as unknown as ClusterInsight;
  const prompt = clusterInsightPrompt[opts.locale](articles);
  const result = await callClaude<ClusterInsight>({
    tier: opts.tier,
    locale: opts.locale,
    prompt,
    maxTokens: 800,
  });
  await setCachedInsight({
    key,
    kind: "CLUSTER",
    locale: opts.locale,
    payload: result,
    ttlSeconds: opts.ttlSeconds ?? defaultTTL("CLUSTER"),
  });
  return result;
}

export interface DailyRecapPayload {
  headline: string;
  topStories: {
    articleIndex: number;
    title: string;
    why: string;
    tradeImplication: string;
  }[];
  themes: string[];
}

export async function dailyRecap(articles: ArticleLike[], opts: BaseOpts): Promise<DailyRecapPayload> {
  const ids = articles.map((a) => a.id).sort().join(",");
  const key = cacheKey({ kind: "DAILY_RECAP", ids, tier: opts.tier, locale: opts.locale });
  const cached = await getCachedInsight(key);
  if (cached) return cached.payload as unknown as DailyRecapPayload;
  const prompt = dailyRecapPrompt[opts.locale](articles);
  const result = await callClaude<DailyRecapPayload>({
    tier: opts.tier,
    locale: opts.locale,
    prompt,
    maxTokens: 1200,
  });
  await setCachedInsight({
    key,
    kind: "DAILY_RECAP",
    locale: opts.locale,
    payload: result,
    ttlSeconds: opts.ttlSeconds ?? defaultTTL("DAILY_RECAP"),
  });
  return result;
}

export interface PersonalBriefingPayload {
  intro: string;
  items: { articleIndex: number; relevance: string; action: string }[];
  noNews?: string;
}

export async function personalBriefing(
  articles: ArticleLike[],
  watchlist: string[],
  portfolio: string[],
  opts: BaseOpts
): Promise<PersonalBriefingPayload> {
  const ids = articles.map((a) => a.id).sort().join(",");
  const interestsHash = [...watchlist, "|", ...portfolio].join(",");
  const key = cacheKey({
    kind: "PERSONAL_BRIEFING",
    ids,
    interestsHash,
    tier: opts.tier,
    locale: opts.locale,
  });
  const cached = await getCachedInsight(key);
  if (cached) return cached.payload as unknown as PersonalBriefingPayload;
  const prompt = personalBriefingPrompt[opts.locale](articles, watchlist, portfolio);
  const result = await callClaude<PersonalBriefingPayload>({
    tier: opts.tier,
    locale: opts.locale,
    prompt,
    maxTokens: 1000,
  });
  await setCachedInsight({
    key,
    kind: "PERSONAL_BRIEFING",
    locale: opts.locale,
    payload: result,
    ttlSeconds: opts.ttlSeconds ?? defaultTTL("PERSONAL_BRIEFING"),
  });
  return result;
}
