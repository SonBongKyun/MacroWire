import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { resolveViewerAccess } from "@/lib/billing/access";
import { articleRangeStart, resolveArticleRange } from "@/lib/billing/entitlements";
import {
  buildEventIntelligence,
  dedupeEventArticles,
  deriveEventTags,
  deriveMarketChannels,
  deriveRegions,
  eventSimilarityV2,
  filterEventEvidence,
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
      const rawEvidence = articles.map(({ article, similarityScore, isPrimary }) => ({
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
      }));

      // Existing production rows may have been linked by Event V1. Revalidate
      // every historical link against the primary article's clean tags before
      // calculating coverage or market transmission, so old false merges do
      // not pollute the desk while V2 ingestion gradually replaces them.
      const primary = rawEvidence.find((article) => article.isPrimary) ?? rawEvidence[0];
      const reference = {
        title: event.title,
        tags: primary?.tags ?? parseStringArray(event.tags),
      };
      const evidence = dedupeEventArticles(filterEventEvidence(reference, rawEvidence));
      const effectivePrimary = evidence.find((article) => article.isPrimary) ?? evidence[0];
      const tags = deriveEventTags(evidence);
      const marketChannels = deriveMarketChannels(event.title, tags);
      const regions = deriveRegions(event.title, tags);
      const distinctSources = new Set(evidence.map((article) => article.sourceName)).size || 1;
      const publishedTimes = evidence.map((article) => new Date(article.publishedAt).getTime()).filter(Number.isFinite);
      const firstSeenAt = publishedTimes.length > 0 ? new Date(Math.min(...publishedTimes)) : event.firstSeenAt;
      const latestPublishedAt = publishedTimes.length > 0 ? new Date(Math.max(...publishedTimes)) : event.latestPublishedAt;
      const importanceScore = Math.max(0, ...evidence.map((article) => article.importanceScore ?? 0));
      const officialSourceName = event.officialSourceName && evidence.some(
        (article) => article.sourceTier === "T0" && article.sourceName === event.officialSourceName,
      ) ? event.officialSourceName : null;
      const primarySourceName = effectivePrimary?.sourceName ?? event.primarySourceName;

      const intelligence = buildEventIntelligence({
        title: event.title,
        tags,
        regions,
        marketChannels,
        latestPublishedAt,
        coverageCount: distinctSources,
        importanceScore,
        primarySourceName,
        officialSourceName,
      }, evidence);

      return {
        ...event,
        firstSeenAt,
        lastSeenAt: latestPublishedAt,
        latestPublishedAt,
        importanceTier: effectivePrimary?.importanceTier ?? event.importanceTier,
        importanceScore,
        coverageCount: distinctSources,
        primarySourceName,
        officialSourceName,
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
          similarityScore: article.isPrimary ? 1 : eventSimilarityV2(reference, {
            title: article.title,
            tags: article.tags,
          }),
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
