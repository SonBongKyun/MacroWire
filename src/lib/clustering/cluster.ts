import type { Article } from "@/types";

export interface ArticleCluster {
  id: string;
  label: string;
  tag: string;
  articles: Article[];
}

// Common Korean stop-words to ignore during similarity check
const STOP_WORDS = new Set([
  "의", "가", "이", "은", "는", "을", "를", "에", "와", "과",
  "도", "로", "으로", "에서", "까지", "부터", "한", "할", "하는",
  "및", "등", "것", "수", "위", "중", "각", "더", "또", "그",
  "이번", "올해", "내년", "전년", "대비", "관련", "대한", "통해",
  "위한", "따른", "대해", "있는", "없는", "하고", "된다", "했다",
]);

/** Extract meaningful keywords from a title */
function extractKeywords(title: string): Set<string> {
  const words = title
    .replace(/[^\w\uAC00-\uD7A3\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
  return new Set(words);
}

/** Count overlapping keywords between two sets */
function keywordOverlap(a: Set<string>, b: Set<string>): number {
  let count = 0;
  for (const w of a) {
    if (b.has(w)) count++;
  }
  return count;
}

/**
 * Rule-based article clustering.
 * Groups articles that share:
 *  1. At least one tag
 *  2. Published within 6 hours of each other
 *  3. At least 2 shared keywords in title
 *
 * Returns clusters (≥3 articles) and remaining singles.
 */
export function clusterArticles(articles: Article[]): {
  clusters: ArticleCluster[];
  singles: Article[];
} {
  if (articles.length === 0) return { clusters: [], singles: [] };

  // Pre-compute keywords for all articles
  const keywordsMap = new Map<string, Set<string>>();
  for (const a of articles) {
    keywordsMap.set(a.id, extractKeywords(a.title));
  }

  const used = new Set<string>();
  const clusters: ArticleCluster[] = [];
  const SIX_HOURS = 6 * 60 * 60 * 1000;

  for (let i = 0; i < articles.length; i++) {
    if (used.has(articles[i].id)) continue;

    const anchor = articles[i];
    const anchorKw = keywordsMap.get(anchor.id)!;
    const anchorTime = new Date(anchor.publishedAt).getTime();
    const group: Article[] = [anchor];

    for (let j = i + 1; j < articles.length; j++) {
      if (used.has(articles[j].id)) continue;

      const candidate = articles[j];
      const candTime = new Date(candidate.publishedAt).getTime();

      // Rule 1: within 6 hours
      if (Math.abs(anchorTime - candTime) > SIX_HOURS) continue;

      // Rule 2: share at least one tag
      if (!anchor.tags.some((t) => candidate.tags.includes(t))) continue;

      // Rule 3: ≥2 shared keywords in title
      const candKw = keywordsMap.get(candidate.id)!;
      if (keywordOverlap(anchorKw, candKw) < 2) continue;

      group.push(candidate);
    }

    // Only create cluster if ≥3 articles
    if (group.length >= 3) {
      for (const a of group) used.add(a.id);

      // Identify most common tag
      const tagFreq: Record<string, number> = {};
      group.forEach((a) =>
        a.tags.forEach((t) => {
          tagFreq[t] = (tagFreq[t] || 0) + 1;
        })
      );
      const topTag =
        Object.entries(tagFreq).sort((a, b) => b[1] - a[1])[0]?.[0] || "";

      // Build a readable label from the most frequent shared keywords
      const allKw: Record<string, number> = {};
      group.forEach((a) => {
        const kw = keywordsMap.get(a.id)!;
        kw.forEach((w) => {
          allKw[w] = (allKw[w] || 0) + 1;
        });
      });
      const topWords = Object.entries(allKw)
        .filter(([, c]) => c >= 2) // only words appearing in 2+ articles
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([w]) => w);

      const label = topWords.length > 0 ? topWords.join(" ") : group[0].title.slice(0, 30);

      clusters.push({
        id: `cluster-${anchor.id}`,
        label,
        tag: topTag,
        articles: group,
      });
    }
  }

  const singles = articles.filter((a) => !used.has(a.id));
  return { clusters, singles };
}
