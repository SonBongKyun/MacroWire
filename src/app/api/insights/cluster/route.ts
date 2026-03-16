import { NextRequest, NextResponse } from "next/server";
import { insightConfig } from "@/lib/insights/config";
import { getCachedInsight, setCachedInsight } from "@/lib/insights/cache";
import { generateInsight } from "@/lib/insights/client";
import { buildClusterPrompt } from "@/lib/insights/prompts";
import type { Article, ClusterInsight } from "@/types";

export async function POST(req: NextRequest) {
  if (!insightConfig.apiKeyConfigured) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 503 }
    );
  }

  const { articles, clusterId, clusterLabel } = (await req.json()) as {
    articles: Article[];
    clusterId: string;
    clusterLabel: string;
  };

  if (!clusterId || !articles?.length) {
    return NextResponse.json(
      { error: "clusterId and articles required" },
      { status: 400 }
    );
  }

  // Check cache
  const cached = await getCachedInsight("cluster", clusterId);
  if (cached) {
    return NextResponse.json({ insight: cached, cached: true });
  }

  try {
    const prompt = buildClusterPrompt(articles, clusterLabel);
    const raw = await generateInsight(prompt, "sonnet");
    const insight: ClusterInsight = JSON.parse(raw);

    await setCachedInsight("cluster", clusterId, "sonnet", insight as unknown as Record<string, unknown>);

    return NextResponse.json({ insight, cached: false });
  } catch (err) {
    console.error("[insights/cluster] error:", err);
    return NextResponse.json(
      { error: "Cluster insight generation failed", details: String(err) },
      { status: 500 }
    );
  }
}
