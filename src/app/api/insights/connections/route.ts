import { NextRequest, NextResponse } from "next/server";
import { insightConfig } from "@/lib/insights/config";
import { getCachedInsight, setCachedInsight } from "@/lib/insights/cache";
import { generateInsight } from "@/lib/insights/client";
import { buildConnectionsPrompt } from "@/lib/insights/prompts";
import type { Article, ConnectionsInsight } from "@/types";

export async function POST(req: NextRequest) {
  if (!insightConfig.apiKeyConfigured) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 503 }
    );
  }

  const { articles } = (await req.json()) as { articles: Article[] };

  if (!articles?.length) {
    return NextResponse.json(
      { error: "articles required" },
      { status: 400 }
    );
  }

  // Use sorted article IDs as cache key
  const targetId = articles
    .map((a) => a.id)
    .sort()
    .join(",")
    .slice(0, 200);

  // Check cache
  const cached = await getCachedInsight("connections", targetId);
  if (cached) {
    return NextResponse.json({ insight: cached, cached: true });
  }

  try {
    const prompt = buildConnectionsPrompt(articles);
    const raw = await generateInsight(prompt, "sonnet");
    const insight: ConnectionsInsight = JSON.parse(raw);

    await setCachedInsight("connections", targetId, "sonnet", insight as unknown as Record<string, unknown>);

    return NextResponse.json({ insight, cached: false });
  } catch (err) {
    console.error("[insights/connections] error:", err);
    return NextResponse.json(
      { error: "Connections insight generation failed", details: String(err) },
      { status: 500 }
    );
  }
}
