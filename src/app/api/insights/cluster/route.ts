import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { clusterInsight } from "@/lib/ai/openRouterInsights";
import { requireTier, enforceInsightQuota, logInsightUsage } from "@/lib/billing/gate";
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

  const quotaErr = await enforceInsightQuota(user, plan, "CLUSTER");
  if (quotaErr) return quotaErr;

  const body = (await req.json().catch(() => ({}))) as { articleIds?: string[]; locale?: Locale };
  if (!body.articleIds || body.articleIds.length < 2 || body.articleIds.length > 8) {
    return NextResponse.json({ error: "articleIds must contain 2 to 8 ids" }, { status: 400 });
  }

  const rows = await prisma.article.findMany({
    where: { id: { in: body.articleIds } },
    orderBy: { publishedAt: "desc" },
  });
  if (rows.length < 2) {
    return NextResponse.json({ error: "Not enough articles found" }, { status: 404 });
  }

  const locale: Locale = body.locale === "en" ? "en" : user.locale === "en" ? "en" : "ko";

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
      { tier: user.tier, locale }
    );
    await logInsightUsage(user.id, "CLUSTER");
    return NextResponse.json({ insight, locale, tier: user.tier });
  } catch (err) {
    return aiErrorResponse("api/insights/cluster", err);
  }
}
