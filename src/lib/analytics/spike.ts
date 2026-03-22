import type { Article } from "@/types";
import { TAG_COLORS_MUTED as TAG_COLORS } from "@/lib/constants/colors";

export interface SpikeInfo {
  tag: string;
  currentCount: number;
  avgCount: number;
  ratio: number; // currentCount / avgCount
  color: string;
}

/**
 * Detect tag spikes: compare last 6h tag frequency vs trailing 7d average (per 6h window).
 * A spike is when current count is >2x the average.
 */
export function detectSpikes(articles: Article[]): SpikeInfo[] {
  const now = Date.now();
  const h6 = 6 * 60 * 60 * 1000;
  const d7 = 7 * 24 * 60 * 60 * 1000;

  const recent = articles.filter((a) => now - new Date(a.publishedAt).getTime() < h6);
  const week = articles.filter((a) => now - new Date(a.publishedAt).getTime() < d7);

  // Count tags in last 6h
  const recentTags: Record<string, number> = {};
  recent.forEach((a) => a.tags.forEach((t) => { recentTags[t] = (recentTags[t] || 0) + 1; }));

  // Count tags in last 7d and compute average per 6h window (28 windows)
  const weekTags: Record<string, number> = {};
  week.forEach((a) => a.tags.forEach((t) => { weekTags[t] = (weekTags[t] || 0) + 1; }));

  const windows = 28; // 7 days / 6 hours
  const spikes: SpikeInfo[] = [];

  for (const [tag, count] of Object.entries(recentTags)) {
    const weekCount = weekTags[tag] || 0;
    const avg = weekCount / windows;
    if (avg > 0 && count >= 3 && count / avg >= 2) {
      spikes.push({
        tag,
        currentCount: count,
        avgCount: Math.round(avg * 10) / 10,
        ratio: Math.round((count / avg) * 100) / 100,
        color: TAG_COLORS[tag] || "#6b7280",
      });
    }
  }

  return spikes.sort((a, b) => b.ratio - a.ratio);
}
