import { NextRequest, NextResponse } from "next/server";
import type { Tier } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { isClerkServerEnabled } from "@/lib/auth/config";
import {
  quotaExceededResponse,
  releaseInsightReservation,
  requireTier,
  reserveInsightQuota,
} from "@/lib/billing/gate";
import { planFromTier, type Plan } from "@/lib/billing/plans";
import {
  generateSourceArticleSummary,
  getCachedSourceArticleSummary,
  type SummaryArticle,
} from "@/lib/ai/sourceSummary";
import type { Locale } from "@/lib/ai/prompts";
import { verifyOwnerSecret } from "@/lib/security/api-auth";
import { isAiConfigured } from "@/lib/ai/client";
import { aiErrorResponse } from "@/lib/ai/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 45;

interface AiAccess {
  tier: Tier;
  locale: Locale;
  plan: Plan;
  userId: string | null;
}

async function resolveAccess(
  requestedLocale: unknown,
  request?: NextRequest,
  requireWriteAccess = false,
): Promise<AiAccess | NextResponse> {
  const locale: Locale = requestedLocale === "en" ? "en" : "ko";
  if (!isClerkServerEnabled()) {
    if (requireWriteAccess) {
      const ownerStatus = verifyOwnerSecret(request!.headers);
      if (ownerStatus === "unconfigured") {
        return NextResponse.json({ error: "OWNER_AUTH_NOT_CONFIGURED" }, { status: 503 });
      }
      if (ownerStatus !== "authorized") {
        return NextResponse.json({ error: "OWNER_AUTH_REQUIRED" }, { status: 401 });
      }
    }
    // Keep the self-hosted owner path inexpensive by default. Data access is
    // full elsewhere; the optional AI model can still be overridden by env.
    return { tier: "FREE", locale, plan: planFromTier("FREE"), userId: null };
  }

  const gate = await requireTier("FREE");
  if (gate instanceof NextResponse) return gate;
  return {
    tier: gate.user.tier,
    locale: requestedLocale === "en" || requestedLocale === "ko"
      ? locale
      : gate.user.locale === "en" ? "en" : "ko",
    plan: gate.plan,
    userId: gate.user.id,
  };
}

async function findArticle(id: string): Promise<SummaryArticle | null> {
  return prisma.article.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      sourceName: true,
      url: true,
      publishedAt: true,
      summary: true,
      feedExcerpt: true,
      metaDescription: true,
    },
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const access = await resolveAccess(request.nextUrl.searchParams.get("locale"));
  if (access instanceof NextResponse) return access;
  const { id } = await context.params;
  const article = await findArticle(id);
  if (!article) return NextResponse.json({ error: "Unknown article" }, { status: 404 });

  const summary = await getCachedSourceArticleSummary(article, access);
  const aiConfigured = isAiConfigured();
  const ownerAuthorized = !isClerkServerEnabled() && verifyOwnerSecret(request.headers) === "authorized";
  const canGenerate = aiConfigured && (isClerkServerEnabled() || ownerAuthorized);
  return NextResponse.json({
    summary,
    canGenerate,
    reason: !aiConfigured ? "AI_NOT_CONFIGURED" : canGenerate ? null : "OWNER_AUTH_REQUIRED",
  });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const body = await request.json().catch(() => ({})) as { locale?: Locale };
  const access = await resolveAccess(body.locale, request, true);
  if (access instanceof NextResponse) return access;
  const { id } = await context.params;
  if (!id || id.length > 128) return NextResponse.json({ error: "Invalid article" }, { status: 400 });
  const article = await findArticle(id);
  if (!article) return NextResponse.json({ error: "Unknown article" }, { status: 404 });

  let reservationId: string | null = null;
  try {
    const cached = await getCachedSourceArticleSummary(article, access);
    if (cached) return NextResponse.json({ summary: cached });
    if (!isAiConfigured()) {
      return NextResponse.json({ error: "AI_NOT_CONFIGURED" }, { status: 503 });
    }

    if (access.userId) {
      const user = await prisma.user.findUnique({ where: { id: access.userId } });
      if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
      const reservation = await reserveInsightQuota(user, access.plan, "ARTICLE");
      if (!reservation.ok) return quotaExceededResponse(reservation);
      reservationId = reservation.reservationId;
    }

    const summary = await generateSourceArticleSummary(article, access);
    // Another concurrent request may have filled the cache after our initial
    // check. A cache hit should not consume an AI usage slot.
    if (summary.cached && reservationId) {
      await releaseInsightReservation(reservationId);
      reservationId = null;
    }
    return NextResponse.json({ summary });
  } catch (error) {
    await releaseInsightReservation(reservationId);
    const code = error instanceof Error ? error.message : "AI_REQUEST_FAILED";
    if (code === "SOURCE_TEXT_UNAVAILABLE") {
      return NextResponse.json({ error: code }, { status: 422 });
    }
    return aiErrorResponse("api/articles/summary", error);
  }
}
