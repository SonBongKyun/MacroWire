import { prisma } from "../db/prisma";
import { clusterArticles } from "../clustering/cluster";
import { getCachedInsight, setCachedInsight } from "./cache";
import { generateInsight } from "./client";
import { buildClusterPrompt } from "./prompts";
import { insightConfig } from "./config";
import type { Article } from "@/types";

/**
 * Auto-generate cluster insights for recent articles.
 * Called after ingest when INSIGHT_MODE=auto.
 */
export async function generateAutoInsights(): Promise<void> {
  if (!insightConfig.autoCluster) return;

  console.log("[auto-insight] generating cluster insights...");

  // Fetch last 6 hours of articles
  const since = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const dbArticles = await prisma.article.findMany({
    where: { publishedAt: { gte: since } },
    orderBy: { publishedAt: "desc" },
    take: 200,
  });

  // Convert to client Article type
  const articles: Article[] = dbArticles.map((a) => ({
    id: a.id,
    sourceId: a.sourceId,
    sourceName: a.sourceName,
    title: a.title,
    url: a.url,
    publishedAt: a.publishedAt.toISOString(),
    summary: a.summary,
    tags: JSON.parse(a.tags),
    isRead: a.isRead,
    isSaved: a.isSaved,
    createdAt: a.createdAt.toISOString(),
  }));

  const { clusters } = clusterArticles(articles);

  for (const cluster of clusters) {
    // Skip if already cached
    const cached = await getCachedInsight("cluster", cluster.id);
    if (cached) continue;

    try {
      const prompt = buildClusterPrompt(cluster.articles, cluster.label);
      const raw = await generateInsight(prompt, "sonnet");
      const insight = JSON.parse(raw);
      await setCachedInsight("cluster", cluster.id, "sonnet", insight);
      console.log(`[auto-insight] generated for cluster: ${cluster.label}`);
    } catch (err) {
      console.error(`[auto-insight] failed for cluster ${cluster.label}:`, err);
    }
  }

  console.log(`[auto-insight] done. processed ${clusters.length} clusters`);
}
