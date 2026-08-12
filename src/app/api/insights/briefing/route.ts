import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { personalBriefing } from "@/lib/ai/openRouterInsights";
import { requireTier, enforceInsightQuota, logInsightUsage } from "@/lib/billing/gate";
import type { Locale } from "@/lib/ai/prompts";
import { aiErrorResponse } from "@/lib/ai/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 45;

const WINDOW_HOURS = 12;
const MAX_ARTICLES = 40;

/** POST { locale? } → user-personalized briefing. PRO+ only. */
export async function POST(req: NextRequest) {
  const gate = await requireTier("PRO");
  if (gate instanceof NextResponse) return gate;
  const { user, plan } = gate;

  const quotaErr = await enforceInsightQuota(user, plan, "PERSONAL_BRIEFING");
  if (quotaErr) return quotaErr;

  const body = (await req.json().catch(() => ({}))) as { locale?: Locale };
  const locale: Locale = body.locale === "en" ? "en" : user.locale === "en" ? "en" : "ko";

  // Extract user interests.
  const watchlist = (user.watchlist as { items?: { keyword: string }[] } | null)?.items?.map(
    (i) => i.keyword
  ) ?? [];
  const portfolio = (user.portfolio as { assets?: { symbol?: string; name?: string }[] } | null)
    ?.assets?.map((a) => a.symbol ?? a.name ?? "")
    .filter(Boolean) ?? [];

  if (watchlist.length === 0 && portfolio.length === 0) {
    return NextResponse.json(
      { error: "EMPTY_INTERESTS", message: "Add to watchlist or portfolio to enable briefings." },
      { status: 400 }
    );
  }

  const since = new Date(Date.now() - WINDOW_HOURS * 60 * 60 * 1000);
  const articles = await prisma.article.findMany({
    where: { publishedAt: { gte: since } },
    orderBy: { publishedAt: "desc" },
    take: MAX_ARTICLES,
  });

  try {
    const briefing = await personalBriefing(
      articles.map((a) => ({
        id: a.id,
        title: a.title,
        summary: a.summary,
        sourceName: a.sourceName,
        publishedAt: a.publishedAt,
        url: a.url,
      })),
      watchlist,
      portfolio,
      { tier: user.tier, locale }
    );

    const items = briefing.items
      .map((it) => {
        const a = articles[it.articleIndex - 1] ?? articles[it.articleIndex];
        if (!a) return null;
        return {
          articleId: a.id,
          title: a.title,
          url: a.url,
          sourceName: a.sourceName,
          relevance: it.relevance,
          action: it.action,
        };
      })
      .filter(Boolean);

    await logInsightUsage(user.id, "PERSONAL_BRIEFING");
    return NextResponse.json({ briefing: { ...briefing, items }, locale, tier: user.tier });
  } catch (err) {
    return aiErrorResponse("api/insights/briefing", err);
  }
}
