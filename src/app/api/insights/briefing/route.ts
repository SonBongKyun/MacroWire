import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { personalBriefing } from "@/lib/ai/openRouterInsights";
import {
  quotaExceededResponse,
  releaseInsightReservation,
  requireTier,
  reserveInsightQuota,
} from "@/lib/billing/gate";
import type { Locale } from "@/lib/ai/prompts";
import { aiErrorResponse } from "@/lib/ai/http";
import {
  parsePortfolioStore,
  parseWatchlistStore,
} from "@/lib/personalization/deskPreferences";

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

  const body = (await req.json().catch(() => ({}))) as { locale?: Locale };
  const locale: Locale = body.locale === "en" ? "en" : user.locale === "en" ? "en" : "ko";

  const watchlist = parseWatchlistStore(user.watchlist).items.map((item) => item.keyword);
  const portfolio = parsePortfolioStore(user.portfolio, { defaultWhenMissing: false })
    .assets.map((asset) => asset.symbol);

  if (watchlist.length === 0 && portfolio.length === 0) {
    return NextResponse.json(
      { error: "EMPTY_INTERESTS", message: "Add to watchlist or portfolio to enable briefings." },
      { status: 400 },
    );
  }

  const since = new Date(Date.now() - WINDOW_HOURS * 60 * 60 * 1000);
  const articles = await prisma.article.findMany({
    where: { publishedAt: { gte: since } },
    orderBy: { publishedAt: "desc" },
    take: MAX_ARTICLES,
  });
  if (articles.length === 0) {
    return NextResponse.json({ error: "NO_RECENT_ARTICLES" }, { status: 404 });
  }

  const reservation = await reserveInsightQuota(user, plan, "PERSONAL_BRIEFING");
  if (!reservation.ok) return quotaExceededResponse(reservation);

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
      { tier: user.tier, locale },
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

    return NextResponse.json({ briefing: { ...briefing, items }, locale, tier: user.tier });
  } catch (err) {
    await releaseInsightReservation(reservation.reservationId);
    return aiErrorResponse("api/insights/briefing", err);
  }
}
