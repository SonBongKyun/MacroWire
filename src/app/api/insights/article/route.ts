import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { articleInsight } from "@/lib/ai/openRouterInsights";
import {
  quotaExceededResponse,
  releaseInsightReservation,
  requireTier,
  reserveInsightQuota,
} from "@/lib/billing/gate";
import type { Locale } from "@/lib/ai/prompts";
import { aiErrorResponse } from "@/lib/ai/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

/** POST { articleId, locale? } → article-level AI insight. */
export async function POST(req: NextRequest) {
  const gate = await requireTier("FREE");
  if (gate instanceof NextResponse) return gate;
  const { user, plan } = gate;

  const body = (await req.json().catch(() => ({}))) as { articleId?: string; locale?: Locale };
  const articleId = body.articleId?.trim();
  if (!articleId || articleId.length > 128) {
    return NextResponse.json({ error: "articleId required" }, { status: 400 });
  }

  const article = await prisma.article.findUnique({ where: { id: articleId } });
  if (!article) return NextResponse.json({ error: "Article not found" }, { status: 404 });

  const locale: Locale = body.locale === "en" ? "en" : (user.locale === "en" ? "en" : "ko");
  const reservation = await reserveInsightQuota(user, plan, "ARTICLE");
  if (!reservation.ok) return quotaExceededResponse(reservation);

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
      { tier: user.tier, locale },
    );
    return NextResponse.json({ insight, locale, tier: user.tier });
  } catch (err) {
    await releaseInsightReservation(reservation.reservationId);
    return aiErrorResponse("api/insights/article", err);
  }
}
