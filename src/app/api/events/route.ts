import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { resolveViewerAccess } from "@/lib/billing/access";
import { articleRangeStart, resolveArticleRange } from "@/lib/billing/entitlements";

function parseStringArray(raw: string): string[] {
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function boundedLimit(raw: string | null): number {
  const n = Number.parseInt(raw ?? "30", 10);
  return Number.isFinite(n) ? Math.min(Math.max(n, 1), 100) : 30;
}

export async function GET(req: NextRequest) {
  try {
    const access = await resolveViewerAccess();
    const { searchParams } = new URL(req.url);
    const rangeAccess = resolveArticleRange(searchParams.get("range"), access.plan);
    const where = {
      latestPublishedAt: { gte: articleRangeStart(rangeAccess.effectiveRange) },
      ...(access.plan.limits.sources === "core"
        ? { articles: { some: { article: { source: { tier: { not: "T3" as const } } } } } }
        : {}),
    };
    const events = await prisma.event.findMany({
      where,
      orderBy: [{ importanceScore: "desc" }, { latestPublishedAt: "desc" }],
      take: boundedLimit(searchParams.get("limit")),
      include: {
        articles: {
          orderBy: [{ isPrimary: "desc" }, { publishedAt: "desc" }],
          take: 8,
          include: {
            article: {
              select: {
                id: true,
                title: true,
                url: true,
                sourceName: true,
                publishedAt: true,
                importanceScore: true,
                source: { select: { tier: true } },
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      data: events.map(({ articles, ...event }) => ({
        ...event,
        tags: parseStringArray(event.tags),
        regions: parseStringArray(event.regions),
        marketChannels: parseStringArray(event.marketChannels),
        articles: articles.map(({ article, similarityScore, isPrimary }) => ({
          ...article,
          sourceTier: article.source.tier,
          source: undefined,
          similarityScore,
          isPrimary,
        })),
      })),
      access: {
        tier: access.tier,
        requestedRange: rangeAccess.requestedRange,
        effectiveRange: rangeAccess.effectiveRange,
        rangeRestricted: rangeAccess.restricted,
      },
    });
  } catch (error) {
    console.error("[api/events]", error);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}
