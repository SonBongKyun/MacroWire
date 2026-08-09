/**
 * How many outlets are carrying the same story.
 *
 * A wire's most useful cheap signal is corroboration. One outlet reporting a
 * rate cut is a headline; four outlets filing it inside an hour is an event.
 * SaveTicker leans on view counts for the same job — which stories are getting
 * attention — but that is data this app does not have and would have to invent.
 * Coverage breadth is something the desk can actually measure from what it
 * already collected.
 *
 * clusterArticles() nearly does this but not quite: it needs three articles to
 * form a cluster and counts articles rather than outlets, so three filings from
 * one newsroom would read as corroboration. Two independent outlets is the
 * signal, and it has to be two *different* ones.
 */

import type { Article } from "@/types";
import { extractKeywords, keywordOverlap } from "./cluster";

export interface Coverage {
  /** Distinct outlets carrying this story, this article's own included. */
  outlets: number;
  /** Outlet names, most relevant first, for the tooltip. */
  names: string[];
}

/** Stories drift apart after this long; beyond it they are separate events. */
const WINDOW_MS = 6 * 60 * 60 * 1000;
/** Fewer shared words than this and the overlap is coincidence. */
const MIN_SHARED_KEYWORDS = 2;

/**
 * Map every article to the breadth of coverage around it.
 *
 * Only articles carried by two or more outlets appear in the result, so a
 * caller can treat "absent" as "nothing worth showing".
 */
export function computeCoverage(articles: Article[]): Map<string, Coverage> {
  const result = new Map<string, Coverage>();
  if (articles.length < 2) return result;

  const keywords = new Map<string, Set<string>>();
  for (const article of articles) {
    keywords.set(article.id, extractKeywords(article.title));
  }

  const grouped = new Set<string>();

  for (let i = 0; i < articles.length; i++) {
    const anchor = articles[i];
    if (grouped.has(anchor.id)) continue;

    const anchorWords = keywords.get(anchor.id)!;
    const anchorTime = new Date(anchor.publishedAt).getTime();
    const group: Article[] = [anchor];

    for (let j = i + 1; j < articles.length; j++) {
      const candidate = articles[j];
      if (grouped.has(candidate.id)) continue;

      const candidateTime = new Date(candidate.publishedAt).getTime();
      if (Math.abs(anchorTime - candidateTime) > WINDOW_MS) continue;
      if (!anchor.tags.some((tag) => candidate.tags.includes(tag))) continue;

      const candidateWords = keywords.get(candidate.id)!;
      if (keywordOverlap(anchorWords, candidateWords) < MIN_SHARED_KEYWORDS) continue;

      group.push(candidate);
    }

    if (group.length < 2) continue;

    // Distinct outlets, not article count — one newsroom filing an update, a
    // correction and a roundup is still one newsroom.
    const names: string[] = [];
    for (const article of group) {
      if (!names.includes(article.sourceName)) names.push(article.sourceName);
    }
    if (names.length < 2) continue;

    const coverage: Coverage = { outlets: names.length, names };
    for (const article of group) {
      grouped.add(article.id);
      result.set(article.id, coverage);
    }
  }

  return result;
}
