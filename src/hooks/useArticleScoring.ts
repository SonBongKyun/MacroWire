"use client";

import { useMemo, useCallback } from "react";
import type { Article } from "@/types";
import { analyzeSentiment } from "@/lib/sentiment/sentiment";
import { classifyArticleSignal } from "@/lib/news/signal";

export interface ArticleScore {
  articleId: string;
  impactScore: number; // 0-100
  factors: {
    recency: number;      // newer = higher
    sourceQuality: number; // based on read/save rates
    tagRelevance: number;  // popular tags = higher
    sentiment: number;     // strong sentiment = higher impact
    macroSignal: number;   // likely market or policy relevance
  };
}

function computeScores(articles: Article[]): ArticleScore[] {
  if (articles.length === 0) return [];

  // Pre-compute tag popularity (global counts)
  const tagCounts: Record<string, number> = {};
  for (const a of articles) {
    for (const tag of a.tags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }
  const maxTagCount = Math.max(...Object.values(tagCounts), 1);

  // Pre-compute source engagement (read rate + save rate)
  const sourceStats: Record<string, { total: number; read: number; saved: number }> = {};
  for (const a of articles) {
    if (!sourceStats[a.sourceId]) {
      sourceStats[a.sourceId] = { total: 0, read: 0, saved: 0 };
    }
    const s = sourceStats[a.sourceId];
    s.total++;
    if (a.isRead) s.read++;
    if (a.isSaved) s.saved++;
  }

  // Use the newest article as the reference point instead of Date.now()
  const timestamps = articles.map((a) => new Date(a.publishedAt).getTime());
  const newestTime = Math.max(...timestamps);
  const oldestTime = Math.min(...timestamps);
  const timeRange = Math.max(newestTime - oldestTime, 1);

  const scored: ArticleScore[] = articles.map((article) => {
    const articleTime = new Date(article.publishedAt).getTime();

    // Recency: 0-100, newest article gets 100, oldest gets 0
    const recency = ((articleTime - oldestTime) / timeRange) * 100;

    // Tag relevance: average popularity of article's tags
    let tagRelevance = 0;
    if (article.tags.length > 0) {
      const avgPopularity = article.tags.reduce(
        (sum, tag) => sum + (tagCounts[tag] || 0),
        0
      ) / article.tags.length;
      tagRelevance = (avgPopularity / maxTagCount) * 100;
    }

    // Sentiment strength: stronger sentiment = higher impact
    const result = analyzeSentiment(article.title, article.summary);
    const sentiment = result.sentiment === "neutral" ? 20 : 80;
    const macroSignal = classifyArticleSignal(article).score;

    // Source quality: engagement rate
    const src = sourceStats[article.sourceId];
    let sourceQuality = 50; // default
    if (src && src.total > 0) {
      const readRate = src.read / src.total;
      const saveRate = src.saved / src.total;
      sourceQuality = Math.min(100, (readRate * 60 + saveRate * 40) * 100);
    }

    // Relevance must outweigh pure recency so fresh non-macro stories do not
    // dominate the "impact" sort.
    const impactScore = Math.round(
      macroSignal * 0.45 +
      recency * 0.3 +
      tagRelevance * 0.1 +
      sentiment * 0.05 +
      sourceQuality * 0.1
    );

    return {
      articleId: article.id,
      impactScore: Math.max(0, Math.min(100, impactScore)),
      factors: {
        recency: Math.round(recency),
        sourceQuality: Math.round(sourceQuality),
        tagRelevance: Math.round(tagRelevance),
        sentiment,
        macroSignal,
      },
    };
  });

  return scored.sort((a, b) => b.impactScore - a.impactScore);
}

export function useArticleScoring(articles: Article[]) {
  const scores = useMemo(() => computeScores(articles), [articles]);

  const scoreMap = useMemo(() => {
    const map = new Map<string, ArticleScore>();
    for (const s of scores) {
      map.set(s.articleId, s);
    }
    return map;
  }, [scores]);

  const getScore = useCallback(
    (articleId: string): ArticleScore | undefined => scoreMap.get(articleId),
    [scoreMap]
  );

  return { scores, getScore };
}
