"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Article } from "@/types";
import { computeCoverage } from "@/lib/clustering/coverage";
import {
  DEFAULT_PERSONAL_RELEVANCE_PROFILE,
  extractPersonalContext,
  scorePersonalRelevance,
  type PersonalInteraction,
  type PersonalInteractionType,
  type PersonalRelevanceResult,
} from "@/lib/personalization/relevance";

const STORAGE_KEY = "macro-wire-personal-interactions-v1";
const MAX_INTERACTIONS = 400;

function readInteractions(): PersonalInteraction[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is PersonalInteraction => Boolean(
      item && typeof item === "object" &&
      typeof (item as PersonalInteraction).articleId === "string" &&
      typeof (item as PersonalInteraction).type === "string" &&
      typeof (item as PersonalInteraction).at === "string" &&
      Array.isArray((item as PersonalInteraction).topics) &&
      Array.isArray((item as PersonalInteraction).assets),
    )).slice(-MAX_INTERACTIONS);
  } catch {
    return [];
  }
}

export function usePersonalRelevance(articles: Article[]) {
  const [interactions, setInteractions] = useState<PersonalInteraction[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => setInteractions(readInteractions()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const coverage = useMemo(() => computeCoverage(articles), [articles]);
  const referenceTime = useMemo(() => Math.max(
    ...articles.map((article) => new Date(article.publishedAt).getTime()).filter(Number.isFinite),
    0,
  ), [articles]);

  const scores = useMemo(() => {
    const map = new Map<string, PersonalRelevanceResult>();
    for (const article of articles) {
      map.set(article.id, scorePersonalRelevance(article, {
        profile: DEFAULT_PERSONAL_RELEVANCE_PROFILE,
        interactions,
        coverageCount: coverage.get(article.id)?.outlets ?? 1,
        now: referenceTime || undefined,
      }));
    }
    return map;
  }, [articles, coverage, interactions, referenceTime]);

  const dismissedArticleIds = useMemo(
    () => new Set(interactions
      .filter((interaction) => interaction.type === "dismissed")
      .map((interaction) => interaction.articleId)),
    [interactions],
  );

  const recordInteraction = useCallback((article: Article, type: PersonalInteractionType) => {
    const context = extractPersonalContext(article);
    const nextEvent: PersonalInteraction = {
      articleId: article.id,
      type,
      at: new Date().toISOString(),
      topics: context.topics,
      assets: context.assets,
    };
    setInteractions((current) => {
      const duplicate = [...current].reverse().find((item) => item.articleId === article.id && item.type === type);
      if (duplicate && Date.now() - new Date(duplicate.at).getTime() < 5 * 60_000) return current;
      const next = [...current, nextEvent].slice(-MAX_INTERACTIONS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return {
    profile: DEFAULT_PERSONAL_RELEVANCE_PROFILE,
    scores,
    interactions,
    dismissedArticleIds,
    recordInteraction,
  };
}
