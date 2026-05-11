import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { articleInsight } from "@/lib/ai/claude";
import { requireTier, enforceInsightQuota, logInsightUsage } from "@/lib/billing/gate";
import type { Locale } from "@/lib/ai/prompts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

/** POST { articleId, locale? } → article-level AI insight. */
export async function POST(req: NextRequest) {
  const gate = await requireTier("FREE");
  if (gate instanceof NextResponse) return gate;
  const { user, plan } = gate;

  const quotaErr = await enforceInsightQuota(user, plan, "ARTICLE");
  if (quotaErr) return quotaErr;

  const body = (await req.json().catch(() => ({}))) as { articleId?: string; locale?: Locale };
  if (!body.articleId) return NextResponse.json({ error: "articleId required" }, { status: 400 });

  const article = await prisma.article.findUnique({ where: { id: body.articleId } });
  if (!article) return NextResponse.json({ error: "Article not found" }, { status: 404 });

  const locale: Locale = body.locale === "en" ? "en" : (user.locale === "en" ? "en" : "ko");

  try {
    const insight = await articleInsight(
      {
        id: article.id,
        title: article.title,
        summary: article.summary,
        sourceName: article.sourceName,
        publishedAt: article.publishedAt,
        url: article.url,
      },
      { tier: user.tier, locale }
    );
    await logInsightUsage(user.id, "ARTICLE");
    return NextResponse.json({ insight, locale, tier: user.tier });
  } catch (err) {
    console.error("[api/insights/article]", err);
    return NextResponse.json({ error: "AI request failed" }, { status: 500 });
  }
}
