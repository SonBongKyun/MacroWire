import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { insightConfig } from "@/lib/insights/config";
import { getCachedInsight, setCachedInsight } from "@/lib/insights/cache";
import { generateInsight } from "@/lib/insights/client";
import { buildArticlePrompt } from "@/lib/insights/prompts";
import type { ArticleInsight } from "@/types";

export async function POST(req: NextRequest) {
  if (!insightConfig.apiKeyConfigured) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 503 }
    );
  }

  const { articleId } = await req.json();
  if (!articleId) {
    return NextResponse.json({ error: "articleId required" }, { status: 400 });
  }

  // Check cache
  const cached = await getCachedInsight("article", articleId);
  if (cached) {
    return NextResponse.json({ insight: cached, cached: true });
  }

  // Fetch article
  const article = await prisma.article.findUnique({
    where: { id: articleId },
  });
  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  try {
    const prompt = buildArticlePrompt({
      title: article.title,
      summary: article.summary,
      tags: JSON.parse(article.tags),
      sourceName: article.sourceName,
      publishedAt: article.publishedAt.toISOString(),
    });

    const raw = await generateInsight(prompt, "haiku");
    const insight: ArticleInsight = JSON.parse(raw);

    await setCachedInsight("article", articleId, "haiku", insight as unknown as Record<string, unknown>);

    return NextResponse.json({ insight, cached: false });
  } catch (err) {
    console.error("[insights/article] error:", err);
    return NextResponse.json(
      { error: "Insight generation failed", details: String(err) },
      { status: 500 }
    );
  }
}
