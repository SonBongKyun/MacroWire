import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { resolveViewerAccess } from "@/lib/billing/access";
import { articleRangeStart, resolveArticleRange } from "@/lib/billing/entitlements";
import {
  buildEventIntelligence,
  dedupeEventArticles,
  type EventArticleSignal,
} from "@/lib/events/eventIntelligence";

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

function cleanFilter(raw: string | null): string | null {
  const value = raw?.trim().toLowerCase();
  return value && value.length <= 32 ? value : null;
}

export async function GET(req: NextRequest) {
  try {
    const access = await resolveViewerAccess();
    const { searchParams } = new URL(req.url);
    const rangeAccess = resolveArticleRange(searchParams.get("range"), access.plan);
    const limit = boundedLimit(searchParams.get("limit"));
    const region = cleanFilter(searchParams.get("region"));
    const channel = cleanFilter(searchParams.get("channel"));
    const minScoreRaw = Number.parseInt(searchParams.get("minScore") ?? "0", 10);
    const minScore = Number.isFinite(minScoreRaw) ? Math.min(Math.max(minScoreRaw, 0), 100) : 0;

    const where = {
      latestPublishedAt: { gte: articleRangeStart(rangeAccess.effectiveRange) },
      ...(access.plan.limits.sources === "core"
        ? { articles: { some: { article: { source: { tier: { not: "T3" as const } } } } } }
        : {}),
    };

    // Pull a wider candidate set and rank after calculating event-level source
    // diversity, freshness and transmission breadth. Stored article importance
    // remains non-compounding and explainable.
    const events = await prisma.event.findMany({
      where,
      orderBy: [{ importanceScore: "desc" }, { latestPublishedAt: "desc" }],
      take: Math.min(100, Math.max(limit * 4, 40)),
      include: {
        articles: {
          orderBy: [{ isPrimary: "desc" }, { publishedAt: "desc" }],
          take: 12,
          include: {
            article: {
              select: {
                id: true,
                title: true,
                url: true,
                sourceName: true,
                publishedAt: true,
                summary: true,
                feedExcerpt: true,
                tags: true,
                importanceScore: true,
                importanceTier: true,
                source: { select: { tier: true } },
              },
            },
          },
        },
      },
    });

    const data = events.map(({ articles, ...event }) => {
      const tags = parseStringArray(event.tags);
      const regions = parseStringArray(event.regions);
      const marketChannels = parseStringArray(event.marketChannels);
      const articleSignals: EventArticleSignal[] = articles.map(({ article }) => ({
        id: article.id,
        title: article.title,
        sourceName: article.sourceName,
        sourceTier: article.source.tier,
        publishedAt: article.publishedAt,
        importanceScore: article.importanceScore,
        tags: parseStringArray(article.tags),
        summary: article.summary,
        feedExcerpt: article.feedExcerpt,
      }));
      const intelligence = buildEventIntelligence({
        title: event.title,
        tags,
        regions,
        marketChannels,
        latestPublishedAt: event.latestPublishedAt,
        coverageCount: event.coverageCount,
        importanceScore: event.importanceScore,
        primarySourceName: event.primarySourceName,
        officialSourceName: event.officialSourceName,
      }, articleSignals);

      const evidence = dedupeEventArticles(articles.map(({ article, similarityScore, isPrimary }) => ({
        id: article.id,
        title: article.title,
        url: article.url,
        sourceName: article.sourceName,
        sourceTier: article.source.tier,
        publishedAt: article.publishedAt,
        importanceScore: article.importanceScore,
        importanceTier: article.importanceTier,
        tags: parseStringArray(article.tags),
        summary: article.summary,
        feedExcerpt: article.feedExcerpt,
        similarityScore,
        isPrimary,
      })));

      return {
        ...event,
        tags,
        regions,
        marketChannels,
        ...intelligence,
        articles: evidence.map((article) => ({
          id: article.id,
          title: article.title,
          url: article.url,
          sourceName: article.sourceName,
          publishedAt: article.publishedAt,
          importanceScore: article.importanceScore,
          importanceTier: article.importanceTier,
          sourceTier: article.sourceTier,
          similarityScore: article.similarityScore,
          isPrimary: article.isPrimary,
          excerpt: article.feedExcerpt ?? article.summary ?? null,
        })),
      };
    })
      .filter((event) => !region || event.regions.some((item) => item.toLowerCase() === region))
      .filter((event) => !channel || event.marketChannels.some((item) => item.toLowerCase() === channel))
      .filter((event) => event.deskScore >= minScore)
      .sort((a, b) => b.deskScore - a.deskScore
        || b.distinctSources - a.distinctSources
        || new Date(b.latestPublishedAt).getTime() - new Date(a.latestPublishedAt).getTime())
      .slice(0, limit);

    return NextResponse.json({
      data,
      generatedAt: new Date().toISOString(),
      access: {
        tier: access.tier,
        requestedRange: rangeAccess.requestedRange,
        effectiveRange: rangeAccess.effectiveRange,
        rangeRestricted: rangeAccess.restricted,
      },
    }, {
      headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=30" },
    });
  } catch (error) {
    console.error("[api/events]", error);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}
