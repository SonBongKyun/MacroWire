import type { Article } from "@/types";

export interface Recommendation {
  article: Article;
  reason: string;
  score: number;
  type: "trending" | "personalized" | "breaking" | "deep-dive";
}

const BREAKING_KEYWORDS = ["속보", "긴급", "사상", "급등", "급락", "폭락", "폭등", "최고", "최저", "역대"];

/**
 * Generate smart article recommendations based on reading patterns,
 * trending topics, breaking news, and engagement depth.
 *
 * All logic is local -- no external API keys needed.
 */
export function getRecommendations(
  articles: Article[],
  readArticleIds: string[],
  savedArticleIds: string[],
  limit: number = 5
): Recommendation[] {
  const readSet = new Set(readArticleIds);
  const savedSet = new Set(savedArticleIds);
  const now = Date.now();
  const HOUR_MS = 60 * 60 * 1000;

  // Only recommend unread articles
  const unread = articles.filter((a) => !readSet.has(a.id));

  // ── Trending: tags with high frequency in last 6 hours ──
  const recentArticles = articles.filter(
    (a) => now - new Date(a.publishedAt).getTime() < 6 * HOUR_MS
  );
  const recentTagCount: Record<string, number> = {};
  recentArticles.forEach((a) =>
    a.tags.forEach((t) => {
      recentTagCount[t] = (recentTagCount[t] || 0) + 1;
    })
  );
  const trendingTags = Object.entries(recentTagCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag);

  const trending: Recommendation[] = unread
    .filter((a) => a.tags.some((t) => trendingTags.includes(t)))
    .map((a) => {
      const matchedTags = a.tags.filter((t) => trendingTags.includes(t));
      return {
        article: a,
        reason: `트렌딩 토픽: ${matchedTags.join(", ")}`,
        score: matchedTags.length / Math.max(trendingTags.length, 1),
        type: "trending" as const,
      };
    })
    .sort((a, b) => b.score - a.score);

  // ── Personalized: based on saved/read article tags ──
  const savedArticles = articles.filter((a) => savedSet.has(a.id));
  const userTagCount: Record<string, number> = {};
  savedArticles.forEach((a) =>
    a.tags.forEach((t) => {
      userTagCount[t] = (userTagCount[t] || 0) + 2; // saved = heavier weight
    })
  );
  // Also count read articles with lower weight
  articles
    .filter((a) => readSet.has(a.id) && !savedSet.has(a.id))
    .forEach((a) =>
      a.tags.forEach((t) => {
        userTagCount[t] = (userTagCount[t] || 0) + 1;
      })
    );

  const userTopTags = Object.entries(userTagCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tag]) => tag);

  const personalized: Recommendation[] = unread
    .filter((a) => a.tags.some((t) => userTopTags.includes(t)))
    .map((a) => {
      const matchedTags = a.tags.filter((t) => userTopTags.includes(t));
      const tagWeightSum = matchedTags.reduce(
        (sum, t) => sum + (userTagCount[t] || 0),
        0
      );
      const maxPossible = Math.max(
        ...Object.values(userTagCount),
        1
      ) * matchedTags.length;
      return {
        article: a,
        reason: `관심 태그: ${matchedTags.slice(0, 3).join(", ")}`,
        score: Math.min(tagWeightSum / Math.max(maxPossible, 1), 1),
        type: "personalized" as const,
      };
    })
    .sort((a, b) => b.score - a.score);

  // ── Breaking: last 1 hour + high-impact keywords ──
  const breaking: Recommendation[] = unread
    .filter((a) => {
      const age = now - new Date(a.publishedAt).getTime();
      if (age > HOUR_MS) return false;
      return BREAKING_KEYWORDS.some(
        (kw) => a.title.includes(kw) || (a.summary && a.summary.includes(kw))
      );
    })
    .map((a) => {
      const matched = BREAKING_KEYWORDS.filter(
        (kw) => a.title.includes(kw) || (a.summary && a.summary.includes(kw))
      );
      return {
        article: a,
        reason: `속보: ${matched.join(", ")}`,
        score: Math.min(matched.length * 0.3 + 0.4, 1),
        type: "breaking" as const,
      };
    })
    .sort((a, b) => b.score - a.score);

  // ── Deep-dive: longer summaries on topics user engaged with ──
  const deepDive: Recommendation[] = unread
    .filter(
      (a) =>
        a.summary &&
        a.summary.length > 100 &&
        a.tags.some((t) => userTopTags.includes(t))
    )
    .map((a) => {
      const matchedTags = a.tags.filter((t) => userTopTags.includes(t));
      return {
        article: a,
        reason: `심층 분석: ${matchedTags.slice(0, 2).join(", ")}`,
        score: Math.min(
          (a.summary?.length || 0) / 500 + matchedTags.length * 0.15,
          1
        ),
        type: "deep-dive" as const,
      };
    })
    .sort((a, b) => b.score - a.score);

  // ── Mix: 2 trending + 2 personalized + 1 breaking (if available) ──
  const usedIds = new Set<string>();
  const result: Recommendation[] = [];

  function pick(pool: Recommendation[], count: number) {
    for (const r of pool) {
      if (result.length >= limit) break;
      if (usedIds.has(r.article.id)) continue;
      result.push(r);
      usedIds.add(r.article.id);
      if (result.length - (limit - count) >= count) break;
    }
  }

  // Breaking first (1 slot)
  pick(breaking, 1);
  // Trending (2 slots)
  pick(trending, 2);
  // Personalized (2 slots)
  pick(personalized, 2);

  // Fill remaining slots with deep-dive or any remaining
  if (result.length < limit) {
    for (const r of deepDive) {
      if (result.length >= limit) break;
      if (usedIds.has(r.article.id)) continue;
      result.push(r);
      usedIds.add(r.article.id);
    }
  }

  // If still not enough, fill from trending/personalized
  if (result.length < limit) {
    const remaining = [...trending, ...personalized].sort(
      (a, b) => b.score - a.score
    );
    for (const r of remaining) {
      if (result.length >= limit) break;
      if (usedIds.has(r.article.id)) continue;
      result.push(r);
      usedIds.add(r.article.id);
    }
  }

  return result;
}
