import { useMemo, useState, useEffect, useCallback } from "react";
import type { Article, Source } from "@/types";

export interface SourceRank {
  sourceId: string;
  sourceName: string;
  articleCount: number;
  avgArticlesPerDay: number;
  lastArticleAt: string;
  freshness: "active" | "slow" | "stale"; // <24h, <72h, >72h
  readRate: number; // % of articles read by user
  saveRate: number; // % of articles saved by user
  qualityScore: number; // 0-100 computed from above
}

interface SourceOverrides {
  pinned: string[]; // sourceIds
  hidden: string[]; // sourceIds
}

const STORAGE_KEY = "macro-wire-source-overrides";

function loadOverrides(): SourceOverrides {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { pinned: [], hidden: [] };
}

function saveOverrides(overrides: SourceOverrides) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch {}
}

export function useSourceRanking(articles: Article[], sources: Source[]) {
  const [overrides, setOverrides] = useState<SourceOverrides>({ pinned: [], hidden: [] });

  useEffect(() => {
    setOverrides(loadOverrides());
  }, []);

  const rankings = useMemo(() => {
    const now = Date.now();
    const MS_24H = 24 * 60 * 60 * 1000;
    const MS_72H = 72 * 60 * 60 * 1000;

    const sourceMap = new Map<string, { articles: Article[]; name: string }>();

    // Initialize from sources
    for (const source of sources) {
      if (source.enabled) {
        sourceMap.set(source.id, { articles: [], name: source.name });
      }
    }

    // Group articles by source
    for (const article of articles) {
      const entry = sourceMap.get(article.sourceId);
      if (entry) {
        entry.articles.push(article);
      }
    }

    const ranks: SourceRank[] = [];

    for (const [sourceId, { articles: srcArticles, name }] of sourceMap) {
      const articleCount = srcArticles.length;

      // Find last article time
      let lastArticleAt = "";
      let latestTime = 0;
      for (const a of srcArticles) {
        const t = new Date(a.publishedAt).getTime();
        if (t > latestTime) {
          latestTime = t;
          lastArticleAt = a.publishedAt;
        }
      }

      // Freshness
      const sinceLastArticle = latestTime > 0 ? now - latestTime : Infinity;
      let freshness: "active" | "slow" | "stale";
      if (sinceLastArticle < MS_24H) freshness = "active";
      else if (sinceLastArticle < MS_72H) freshness = "slow";
      else freshness = "stale";

      // Avg articles per day (based on source's first article to now)
      let earliestTime = now;
      for (const a of srcArticles) {
        const t = new Date(a.publishedAt).getTime();
        if (t < earliestTime) earliestTime = t;
      }
      const daySpan = Math.max((now - earliestTime) / (1000 * 60 * 60 * 24), 1);
      const avgArticlesPerDay = articleCount / daySpan;

      // Read and save rates
      const readCount = srcArticles.filter((a) => a.isRead).length;
      const saveCount = srcArticles.filter((a) => a.isSaved).length;
      const readRate = articleCount > 0 ? readCount / articleCount : 0;
      const saveRate = articleCount > 0 ? saveCount / articleCount : 0;

      // Quality score: (readRate * 30) + (saveRate * 40) + (freshness_bonus * 30)
      const freshnessBonus = freshness === "active" ? 100 : freshness === "slow" ? 50 : 10;
      const qualityScore = Math.round(
        readRate * 100 * 0.3 + saveRate * 100 * 0.4 + freshnessBonus * 0.3
      );

      ranks.push({
        sourceId,
        sourceName: name,
        articleCount,
        avgArticlesPerDay: Math.round(avgArticlesPerDay * 10) / 10,
        lastArticleAt,
        freshness,
        readRate: Math.round(readRate * 100),
        saveRate: Math.round(saveRate * 100),
        qualityScore: Math.min(qualityScore, 100),
      });
    }

    // Sort: pinned first, then by qualityScore desc, hidden last
    ranks.sort((a, b) => {
      const aPinned = overrides.pinned.includes(a.sourceId) ? 1 : 0;
      const bPinned = overrides.pinned.includes(b.sourceId) ? 1 : 0;
      const aHidden = overrides.hidden.includes(a.sourceId) ? 1 : 0;
      const bHidden = overrides.hidden.includes(b.sourceId) ? 1 : 0;

      if (aPinned !== bPinned) return bPinned - aPinned;
      if (aHidden !== bHidden) return aHidden - bHidden;
      return b.qualityScore - a.qualityScore;
    });

    return ranks;
  }, [articles, sources, overrides]);

  const visibleRankings = useMemo(
    () => rankings.filter((r) => !overrides.hidden.includes(r.sourceId)),
    [rankings, overrides]
  );

  const togglePin = useCallback((sourceId: string) => {
    setOverrides((prev) => {
      const pinned = prev.pinned.includes(sourceId)
        ? prev.pinned.filter((id) => id !== sourceId)
        : [...prev.pinned, sourceId];
      const next = { ...prev, pinned };
      saveOverrides(next);
      return next;
    });
  }, []);

  const toggleHide = useCallback((sourceId: string) => {
    setOverrides((prev) => {
      const hidden = prev.hidden.includes(sourceId)
        ? prev.hidden.filter((id) => id !== sourceId)
        : [...prev.hidden, sourceId];
      const next = { ...prev, hidden };
      saveOverrides(next);
      return next;
    });
  }, []);

  return {
    rankings,
    visibleRankings,
    overrides,
    togglePin,
    toggleHide,
  };
}
