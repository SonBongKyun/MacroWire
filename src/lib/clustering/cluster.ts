import type { Article } from "@/types";

export interface ArticleCluster {
  id: string;
  label: string;
  tag: string;
  articles: Article[];
}

// Function words carry no topic. This list was Korean-only, so English
// headlines matched each other on "of", "to" and "as" — which put a Hong Kong
// fire, a typhoon landfall and a brain-computer story into one group.
const STOP_WORDS = new Set([
  // Korean particles and filler
  "의", "가", "이", "은", "는", "을", "를", "에", "와", "과",
  "도", "로", "으로", "에서", "까지", "부터", "한", "할", "하는",
  "및", "등", "것", "수", "위", "중", "각", "더", "또", "그",
  "이번", "올해", "내년", "전년", "대비", "관련", "대한", "통해",
  "위한", "따른", "대해", "있는", "없는", "하고", "된다", "했다",
  // English function words
  "the", "and", "for", "with", "from", "that", "this", "into", "over",
  "after", "before", "amid", "says", "said", "will", "may", "can", "but",
  "not", "its", "his", "her", "their", "have", "has", "had", "are", "was",
  "were", "been", "who", "how", "why", "what", "when", "where", "than",
  "then", "out", "off", "new", "more", "most", "some", "all", "one", "two",
]);

/**
 * Latin words shorter than this are almost always function words. Korean is
 * denser — two syllables is usually a whole concept — so it keeps a lower bar.
 */
const MIN_LATIN_LENGTH = 3;
const HANGUL = /[가-힣]/;

/** Extract meaningful keywords from a title */
export function extractKeywords(title: string): Set<string> {
  const words = title
    .replace(/[^\w가-힣\s]/g, " ")
    .split(/\s+/)
    .map((w) => w.toLowerCase())
    .filter((w) => {
      if (STOP_WORDS.has(w)) return false;
      if (HANGUL.test(w)) return w.length >= 2;
      return w.length >= MIN_LATIN_LENGTH;
    });
  return new Set(words);
}

/**
 * A token distinctive enough to anchor a match on its own.
 *
 * Two three-letter overlaps ("hit", "set") are coincidence; a real match needs
 * at least one substantial word behind it.
 */
export function isStrongKeyword(word: string): boolean {
  return HANGUL.test(word) ? word.length >= 2 : word.length >= 4;
}

/** Count overlapping keywords between two sets */
export function keywordOverlap(a: Set<string>, b: Set<string>): number {
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
