import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { clusterInsight } from "@/lib/ai/openRouterInsights";
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

/** POST { articleIds: string[], locale? } → cross-article synthesis. PRO+ only. */
export async function POST(req: NextRequest) {
  const gate = await requireTier("PRO");
  if (gate instanceof NextResponse) return gate;
  const { user, plan } = gate;

  const body = (await req.json().catch(() => ({}))) as { articleIds?: string[]; locale?: Locale };
  const articleIds = Array.isArray(body.articleIds)
    ? [...new Set(body.articleIds.filter((id): id is string => typeof id === "string").map((id) => id.trim()))]
    : [];
  if (articleIds.length < 2 || articleIds.length > 8 || articleIds.some((id) => !id || id.length > 128)) {
    return NextResponse.json({ error: "articleIds must contain 2 to 8 valid ids" }, { status: 400 });
  }

  const rows = await prisma.article.findMany({
    where: { id: { in: articleIds } },
    orderBy: { publishedAt: "desc" },
  });
  if (rows.length < 2) {
    return NextResponse.json({ error: "Not enough articles found" }, { status: 404 });
  }

  const locale: Locale = body.locale === "en" ? "en" : user.locale === "en" ? "en" : "ko";
  const reservation = await reserveInsightQuota(user, plan, "CLUSTER");
  if (!reservation.ok) return quotaExceededResponse(reservation);

  try {
    const insight = await clusterInsight(
      rows.map((a) => ({
        id: a.id,
        title: a.title,
        summary: a.summary,
        sourceName: a.sourceName,
        publishedAt: a.publishedAt,
        url: a.url,
      })),
      { tier: user.tier, locale },
    );
    return NextResponse.json({ insight, locale, tier: user.tier });
  } catch (err) {
    await releaseInsightReservation(reservation.reservationId);
    return aiErrorResponse("api/insights/cluster", err);
  }
}
