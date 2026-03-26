import type { Article } from "@/types";
import { generateSmartSummary } from "./summarizer";

export interface MarketInsight {
  title: string;
  description: string;
  type: "trend" | "alert" | "opportunity" | "risk";
  confidence: number; // 0-100
  basedOn: string[];  // article titles that support this
}

interface TagFrequency {
  tag: string;
  recent: number;   // last 24h
  previous: number; // previous 24h
  change: number;   // percentage change
}

function getTagFrequencies(articles: Article[]): TagFrequency[] {
  const now = Date.now();
  const h24 = 24 * 60 * 60 * 1000;

  const recentCounts: Record<string, number> = {};
  const previousCounts: Record<string, number> = {};

  for (const article of articles) {
    const age = now - new Date(article.publishedAt).getTime();
    const tags = article.tags;

    if (age <= h24) {
      for (const tag of tags) {
        recentCounts[tag] = (recentCounts[tag] || 0) + 1;
      }
    } else if (age <= h24 * 2) {
      for (const tag of tags) {
        previousCounts[tag] = (previousCounts[tag] || 0) + 1;
      }
    }
  }

  const allTags = new Set([...Object.keys(recentCounts), ...Object.keys(previousCounts)]);
  const frequencies: TagFrequency[] = [];

  for (const tag of allTags) {
    const recent = recentCounts[tag] || 0;
    const previous = previousCounts[tag] || 0;
    const change = previous > 0 ? ((recent - previous) / previous) * 100 : recent > 0 ? 100 : 0;
    frequencies.push({ tag, recent, previous, change });
  }

  return frequencies.sort((a, b) => b.change - a.change);
}

function getArticlesForTag(articles: Article[], tag: string, hoursBack = 24): Article[] {
  const cutoff = Date.now() - hoursBack * 60 * 60 * 1000;
  return articles.filter(
    (a) => a.tags.includes(tag) && new Date(a.publishedAt).getTime() > cutoff
  );
}

export function generateInsights(articles: Article[]): MarketInsight[] {
  if (articles.length === 0) return [];

  const insights: MarketInsight[] = [];
  const frequencies = getTagFrequencies(articles);

  // 1. Trending topics: tag frequency increased >50%
  for (const freq of frequencies) {
    if (freq.change > 50 && freq.recent >= 2) {
      const tagArticles = getArticlesForTag(articles, freq.tag);
      insights.push({
        title: `"${freq.tag}" 관련 기사 급증`,
        description: `최근 24시간 동안 "${freq.tag}" 관련 기사가 ${freq.recent}건으로 전일 대비 ${Math.round(freq.change)}% 증가했습니다.`,
        type: "trend",
        confidence: Math.min(95, 50 + freq.recent * 5 + Math.min(freq.change, 100) * 0.2),
        basedOn: tagArticles.slice(0, 3).map((a) => a.title),
      });
    }
  }

  // 2. Risk insights: multiple negative-sentiment articles on same topic
  const topicSentiments: Record<string, { negative: number; total: number; articles: Article[] }> = {};
  for (const article of articles) {
    const summary = generateSmartSummary(article);
    for (const tag of article.tags) {
      if (!topicSentiments[tag]) {
        topicSentiments[tag] = { negative: 0, total: 0, articles: [] };
      }
      topicSentiments[tag].total++;
      topicSentiments[tag].articles.push(article);
      if (summary.sentiment === "negative") {
        topicSentiments[tag].negative++;
      }
    }
  }

  for (const [tag, data] of Object.entries(topicSentiments)) {
    if (data.negative >= 3 && data.negative / data.total > 0.5) {
      insights.push({
        title: `"${tag}" 부정적 신호 감지`,
        description: `${tag} 관련 기사 ${data.total}건 중 ${data.negative}건에서 부정적 시그널이 포착되었습니다.`,
        type: "risk",
        confidence: Math.min(90, 40 + data.negative * 10),
        basedOn: data.articles
          .slice(0, 3)
          .map((a) => a.title),
      });
    }
  }

  // 3. Opportunity insights: positive sentiment + high volume
  for (const [tag, data] of Object.entries(topicSentiments)) {
    const positiveCount = data.articles.filter(
      (a) => generateSmartSummary(a).sentiment === "positive"
    ).length;
    if (positiveCount >= 3 && positiveCount / data.total > 0.6) {
      insights.push({
        title: `"${tag}" 긍정 모멘텀 형성`,
        description: `${tag} 관련 기사에서 긍정적 시그널이 다수 포착되고 있습니다 (${positiveCount}/${data.total}건).`,
        type: "opportunity",
        confidence: Math.min(85, 35 + positiveCount * 8),
        basedOn: data.articles
          .slice(0, 3)
          .map((a) => a.title),
      });
    }
  }

  // 4. Alert: high impact articles in last few hours
  const recentHighImpact = articles
    .filter((a) => {
      const age = Date.now() - new Date(a.publishedAt).getTime();
      return age < 6 * 60 * 60 * 1000; // last 6 hours
    })
    .filter((a) => generateSmartSummary(a).impactLevel === "high");

  if (recentHighImpact.length >= 2) {
    insights.push({
      title: "고강도 뉴스 다수 발생",
      description: `최근 6시간 내 영향력 높은 기사가 ${recentHighImpact.length}건 발생했습니다. 시장 변동성에 주의하세요.`,
      type: "alert",
      confidence: Math.min(92, 55 + recentHighImpact.length * 8),
      basedOn: recentHighImpact.slice(0, 3).map((a) => a.title),
    });
  }

  // Sort by confidence descending, return top 5
  return insights
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);
}
