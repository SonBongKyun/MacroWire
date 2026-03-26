import type { Article } from "@/types";

export interface SimilarArticle {
  article: Article;
  score: number; // 0-1 similarity score
  reasons: string[]; // why it's similar
}

/** Tokenize a title into meaningful words (Korean + English, length >= 2) */
function tokenize(text: string): Set<string> {
  return new Set(
    text
      .replace(/[^\w\uAC00-\uD7A3\s]/g, " ")
      .split(/\s+/)
      .map((w) => w.toLowerCase())
      .filter((w) => w.length >= 2)
  );
}

/** Jaccard-like overlap: shared / total unique */
function setOverlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let shared = 0;
  for (const v of a) {
    if (b.has(v)) shared++;
  }
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : shared / union;
}

/**
 * Find articles similar to the target using a TF-IDF-like scoring approach.
 *
 * Scoring weights:
 *  - Tag overlap (Jaccard):        0.4
 *  - Title keyword overlap:        0.3
 *  - Time proximity:               0.2
 *  - Source match:                  0.1
 */
export function findSimilarArticles(
  target: Article,
  candidates: Article[],
  limit: number = 5
): SimilarArticle[] {
  const targetTags = new Set(target.tags);
  const targetKw = tokenize(target.title);
  const targetTime = new Date(target.publishedAt).getTime();

  const DAY_MS = 24 * 60 * 60 * 1000;
  const WEEK_MS = 7 * DAY_MS;

  const results: SimilarArticle[] = [];

  for (const candidate of candidates) {
    if (candidate.id === target.id) continue;

    const reasons: string[] = [];
    let score = 0;

    // ── Tag overlap (weight 0.4) ──
    const candidateTags = new Set(candidate.tags);
    const tagScore = setOverlap(targetTags, candidateTags);
    score += tagScore * 0.4;

    if (tagScore > 0) {
      const shared = candidate.tags.filter((t) => targetTags.has(t));
      if (shared.length > 0) {
        reasons.push(`같은 태그: ${shared.join(", ")}`);
      }
    }

    // ── Source match (weight 0.1) ──
    if (candidate.sourceName === target.sourceName) {
      score += 0.1;
      reasons.push("같은 소스");
    }

    // ── Title keyword overlap (weight 0.3) ──
    const candidateKw = tokenize(candidate.title);
    const kwScore = setOverlap(targetKw, candidateKw);
    score += kwScore * 0.3;

    if (kwScore > 0) {
      const shared: string[] = [];
      for (const w of targetKw) {
        if (candidateKw.has(w)) shared.push(w);
      }
      if (shared.length > 0) {
        reasons.push(`유사 키워드: ${shared.slice(0, 3).join(", ")}`);
      }
    }

    // ── Time proximity (weight 0.2) ──
    const timeDiff = Math.abs(new Date(candidate.publishedAt).getTime() - targetTime);
    if (timeDiff < DAY_MS) {
      score += 0.2;
    } else if (timeDiff < WEEK_MS) {
      score += 0.1;
    }

    if (score > 0.05) {
      results.push({ article: candidate, score: Math.min(score, 1), reasons });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}
