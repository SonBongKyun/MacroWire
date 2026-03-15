import type { Article } from "@/types";
import { analyzeSentiment } from "@/lib/sentiment/sentiment";

export interface TagTrendPoint {
  date: string; // YYYY-MM-DD
  counts: Record<string, number>;
}

export interface SentimentHeatmapCell {
  tag: string;
  hour: number;
  positive: number;
  negative: number;
  neutral: number;
  total: number;
}

export interface TagBubble {
  tag: string;
  count: number;
  positive: number;
  negative: number;
  neutral: number;
  color: string;
}

export interface CorrelationPoint {
  date: string;
  tagCount: number;
  marketValue?: number;
}

const TAG_COLORS: Record<string, string> = {
  금리: "#92400e", 물가: "#991b1b", 연준: "#5b21b6", 환율: "#155e75",
  미국: "#1e40af", 중국: "#b91c1c", 일본: "#9d174d", 유럽: "#3730a3",
  수출입: "#065f46", 경기: "#3f6212", 부동산: "#9a3412", 가계부채: "#be123c",
  재정: "#075985", 에너지: "#854d0e", 반도체: "#115e59", AI: "#166534",
  지정학: "#86198f",
};

/** Compute tag frequency per day for trend chart */
export function computeTagTrends(articles: Article[], days: number = 7): TagTrendPoint[] {
  const now = new Date();
  const points: TagTrendPoint[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayArticles = articles.filter((a) => a.publishedAt.slice(0, 10) === dateStr);
    
    const counts: Record<string, number> = {};
    dayArticles.forEach((a) => a.tags.forEach((t) => { counts[t] = (counts[t] || 0) + 1; }));
    points.push({ date: dateStr, counts });
  }

  return points;
}

/** Compute sentiment heatmap data: tag × hour grid */
export function computeSentimentHeatmap(articles: Article[]): SentimentHeatmapCell[] {
  const cells: SentimentHeatmapCell[] = [];
  const allTags = new Set<string>();
  articles.forEach((a) => a.tags.forEach((t) => allTags.add(t)));

  for (const tag of allTags) {
    for (let h = 0; h < 24; h++) {
      let pos = 0, neg = 0, neu = 0;
      articles
        .filter((a) => a.tags.includes(tag) && new Date(a.publishedAt).getHours() === h)
        .forEach((a) => {
          const s = analyzeSentiment(a.title, a.summary);
          if (s.sentiment === "positive") pos++;
          else if (s.sentiment === "negative") neg++;
          else neu++;
        });
      if (pos + neg + neu > 0) {
        cells.push({ tag, hour: h, positive: pos, negative: neg, neutral: neu, total: pos + neg + neu });
      }
    }
  }

  return cells;
}

/** Compute tag bubble data */
export function computeTagBubbles(articles: Article[]): TagBubble[] {
  const tagData: Record<string, { count: number; pos: number; neg: number; neu: number }> = {};

  articles.forEach((a) => {
    const s = analyzeSentiment(a.title, a.summary);
    a.tags.forEach((t) => {
      if (!tagData[t]) tagData[t] = { count: 0, pos: 0, neg: 0, neu: 0 };
      tagData[t].count++;
      if (s.sentiment === "positive") tagData[t].pos++;
      else if (s.sentiment === "negative") tagData[t].neg++;
      else tagData[t].neu++;
    });
  });

  return Object.entries(tagData)
    .map(([tag, d]) => ({
      tag,
      count: d.count,
      positive: d.pos,
      negative: d.neg,
      neutral: d.neu,
      color: TAG_COLORS[tag] || "#6b7280",
    }))
    .sort((a, b) => b.count - a.count);
}

/** Compute daily digest */
export function computeDailyDigest(articles: Article[]): {
  summary: string;
  topTags: [string, number][];
  sentimentOverview: { positive: number; negative: number; neutral: number };
  keyArticles: Article[];
} {
  const now = Date.now();
  const h24 = 24 * 60 * 60 * 1000;
  const today = articles.filter((a) => now - new Date(a.publishedAt).getTime() < h24);

  // Tag counts
  const tagCount: Record<string, number> = {};
  today.forEach((a) => a.tags.forEach((t) => { tagCount[t] = (tagCount[t] || 0) + 1; }));
  const topTags = Object.entries(tagCount).sort((a, b) => b[1] - a[1]).slice(0, 5) as [string, number][];

  // Sentiment overview
  let pos = 0, neg = 0, neu = 0;
  today.forEach((a) => {
    const s = analyzeSentiment(a.title, a.summary);
    if (s.sentiment === "positive") pos++;
    else if (s.sentiment === "negative") neg++;
    else neu++;
  });

  // Key articles: top saved + top positive/negative
  const saved = today.filter((a) => a.isSaved).slice(0, 3);
  const remaining = today.filter((a) => !saved.some((s) => s.id === a.id));
  const keyArticles = [...saved, ...remaining.slice(0, 5 - saved.length)];

  // Build summary text
  const summaryParts: string[] = [];
  summaryParts.push(`오늘 총 ${today.length}건의 매크로 기사가 수집되었습니다.`);
  if (topTags.length > 0) {
    summaryParts.push(`주요 토픽: ${topTags.map(([t, c]) => `${t}(${c}건)`).join(', ')}.`);
  }
  if (pos > neg) {
    summaryParts.push(`전반적으로 긍정적 논조(긍정 ${pos}건, 부정 ${neg}건)입니다.`);
  } else if (neg > pos) {
    summaryParts.push(`전반적으로 부정적 논조(부정 ${neg}건, 긍정 ${pos}건)가 우세합니다.`);
  } else {
    summaryParts.push(`긍정/부정이 균형을 이루고 있습니다(각 ${pos}건).`);
  }

  return {
    summary: summaryParts.join(' '),
    topTags,
    sentimentOverview: { positive: pos, negative: neg, neutral: neu },
    keyArticles,
  };
}

/** Find related articles based on tag overlap and keyword similarity */
export function findRelatedArticles(target: Article, articles: Article[], limit: number = 5): Article[] {
  const targetKw = new Set(
    target.title.replace(/[^\w\uAC00-\uD7A3\s]/g, " ").split(/\s+/).filter((w) => w.length >= 2)
  );

  const scored = articles
    .filter((a) => a.id !== target.id)
    .map((a) => {
      const tagOverlap = a.tags.filter((t) => target.tags.includes(t)).length;
      const aKw = new Set(
        a.title.replace(/[^\w\uAC00-\uD7A3\s]/g, " ").split(/\s+/).filter((w) => w.length >= 2)
      );
      let kwOverlap = 0;
      for (const w of targetKw) { if (aKw.has(w)) kwOverlap++; }
      const score = tagOverlap * 3 + kwOverlap;
      return { article: a, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map((s) => s.article);
}

/** Compute weekly report data */
export function computeWeeklyReport(articles: Article[]): {
  totalArticles: number;
  tagTrends: { tag: string; count: number; change: number }[];
  sentimentTrend: { positive: number; negative: number; neutral: number };
  topArticles: Article[];
  busiestDay: string;
  busiestHour: number;
} {
  const now = Date.now();
  const w1 = 7 * 24 * 60 * 60 * 1000;
  const w2 = 14 * 24 * 60 * 60 * 1000;

  const thisWeek = articles.filter((a) => now - new Date(a.publishedAt).getTime() < w1);
  const lastWeek = articles.filter((a) => {
    const diff = now - new Date(a.publishedAt).getTime();
    return diff >= w1 && diff < w2;
  });

  // Tag trends with change
  const thisTagCount: Record<string, number> = {};
  thisWeek.forEach((a) => a.tags.forEach((t) => { thisTagCount[t] = (thisTagCount[t] || 0) + 1; }));
  const lastTagCount: Record<string, number> = {};
  lastWeek.forEach((a) => a.tags.forEach((t) => { lastTagCount[t] = (lastTagCount[t] || 0) + 1; }));

  const tagTrends = Object.entries(thisTagCount)
    .map(([tag, count]) => ({
      tag,
      count,
      change: count - (lastTagCount[tag] || 0),
    }))
    .sort((a, b) => b.count - a.count);

  // Sentiment
  let pos = 0, neg = 0, neu = 0;
  thisWeek.forEach((a) => {
    const s = analyzeSentiment(a.title, a.summary);
    if (s.sentiment === "positive") pos++;
    else if (s.sentiment === "negative") neg++;
    else neu++;
  });

  // Top articles (saved first, then most tagged)
  const topArticles = thisWeek
    .sort((a, b) => (b.isSaved ? 1 : 0) - (a.isSaved ? 1 : 0) || b.tags.length - a.tags.length)
    .slice(0, 5);

  // Busiest day
  const dayCounts: Record<string, number> = {};
  thisWeek.forEach((a) => {
    const d = a.publishedAt.slice(0, 10);
    dayCounts[d] = (dayCounts[d] || 0) + 1;
  });
  const busiestDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "";

  // Busiest hour
  const hourCounts = new Array(24).fill(0);
  thisWeek.forEach((a) => { hourCounts[new Date(a.publishedAt).getHours()]++; });
  const busiestHour = hourCounts.indexOf(Math.max(...hourCounts));

  return {
    totalArticles: thisWeek.length,
    tagTrends,
    sentimentTrend: { positive: pos, negative: neg, neutral: neu },
    topArticles,
    busiestDay,
    busiestHour,
  };
}
