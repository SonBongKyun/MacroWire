import type { Article } from "@/types";

export interface PulseData {
  todayCount: number;
  usCount: number;
  rateCount: number;
  fxCount: number;
  recentHourCount: number;
  topTags: [string, number][];
}

export function computePulse(articles: Article[]): PulseData {
  const now = Date.now();
  const h24 = 24 * 60 * 60 * 1000;
  const h1 = 60 * 60 * 1000;

  const today = articles.filter(
    (a) => now - new Date(a.publishedAt).getTime() < h24
  );

  const usCount = today.filter((a) =>
    a.tags.some((t) => t === "미국" || t === "연준")
  ).length;

  const rateCount = today.filter((a) => a.tags.includes("금리")).length;
  const fxCount = today.filter((a) => a.tags.includes("환율")).length;

  const recentHourCount = articles.filter(
    (a) => now - new Date(a.publishedAt).getTime() < h1
  ).length;

  // Top tags from today's articles
  const tagCount: Record<string, number> = {};
  today.forEach((a) =>
    a.tags.forEach((t) => {
      tagCount[t] = (tagCount[t] || 0) + 1;
    })
  );
  const topTags = Object.entries(tagCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3) as [string, number][];

  return {
    todayCount: today.length,
    usCount,
    rateCount,
    fxCount,
    recentHourCount,
    topTags,
  };
}
