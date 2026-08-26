import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { resolveViewerAccess } from "@/lib/billing/access";
import {
  articleRangeStart,
  resolveArticleRange,
  sourceScopeLabel,
} from "@/lib/billing/entitlements";

function boundedLimit(raw: string | null): number {
  const parsed = Number.parseInt(raw ?? "50", 10);
  if (!Number.isFinite(parsed)) return 50;
  return Math.min(Math.max(parsed, 1), 200);
}

function boundedParam(raw: string | null, maxLength: number): string | null {
  const value = raw?.trim();
  if (!value) return null;
  return value.slice(0, maxLength);
}

function parseStringArray(raw: string): string[] {
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const access = await resolveViewerAccess();
    const rangeAccess = resolveArticleRange(searchParams.get("range"), access.plan);

    const sourceId = boundedParam(searchParams.get("sourceId"), 128);
    const tag = boundedParam(searchParams.get("tag"), 80);
    const q = boundedParam(searchParams.get("q"), 200);
    const read = searchParams.get("read");
    const saved = searchParams.get("saved");
    const limit = boundedLimit(searchParams.get("limit"));
    const cursor = boundedParam(searchParams.get("cursor"), 128);

    const where: Prisma.ArticleWhereInput = {
      publishedAt: { gte: articleRangeStart(rangeAccess.effectiveRange) },
    };
    const andFilters: Prisma.ArticleWhereInput[] = [];

    // Subscription entitlements are enforced here, not only in the UI.
    if (access.plan.limits.sources === "core") {
      andFilters.push({ source: { is: { tier: { not: "T3" } } } });
    }

    if (sourceId) where.sourceId = sourceId;

    if (tag) {
      // tags are still stored as a JSON-string array for back compatibility.
      where.tags = { contains: `"${tag}"` };
    }

    if (q) {
      const tokens = q.split(/\s+/).filter(Boolean).slice(0, 8);
      const tokenFilters = tokens.map((token) => ({
        OR: [
          { title: { contains: token, mode: Prisma.QueryMode.insensitive } },
          { summary: { contains: token, mode: Prisma.QueryMode.insensitive } },
          { feedExcerpt: { contains: token, mode: Prisma.QueryMode.insensitive } },
          { metaDescription: { contains: token, mode: Prisma.QueryMode.insensitive } },
          { sourceName: { contains: token, mode: Prisma.QueryMode.insensitive } },
          { tags: { contains: token, mode: Prisma.QueryMode.insensitive } },
        ],
      } satisfies Prisma.ArticleWhereInput));
      andFilters.push(...tokenFilters);
    }

    if (read === "true" || read === "false") {
      if (!access.userId) {
        if (read === "true") andFilters.push({ id: { in: [] } });
      } else {
        andFilters.push({
          readStates: read === "true"
            ? { some: { userId: access.userId } }
            : { none: { userId: access.userId } },
        });
      }
    }

    if (saved === "true") {
      if (!access.userId) {
        andFilters.push({ id: { in: [] } });
      } else {
        andFilters.push({ savedArticles: { some: { userId: access.userId } } });
      }
    }

    if (andFilters.length > 0) where.AND = andFilters;

    const articles = await prisma.article.findMany({
      where,
      include: { source: { select: { tier: true } } },
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = articles.length > limit;
    const data = hasMore ? articles.slice(0, limit) : articles;
    const nextCursor = hasMore ? data[data.length - 1]?.id ?? null : null;
    const articleIds = data.map((article) => article.id);

    const [readStates, savedStates] = access.userId && articleIds.length > 0
      ? await Promise.all([
          prisma.readState.findMany({
            where: { userId: access.userId, articleId: { in: articleIds } },
            select: { articleId: true },
          }),
          prisma.savedArticle.findMany({
            where: { userId: access.userId, articleId: { in: articleIds } },
            select: { articleId: true },
          }),
        ])
      : [[], []];

    const readIds = new Set(readStates.map((state) => state.articleId));
    const savedIds = new Set(savedStates.map((state) => state.articleId));

    return NextResponse.json({
      data: data.map(({ source, ...article }) => ({
        ...article,
        sourceTier: source.tier,
        summary: article.feedExcerpt ?? article.summary,
        feedExcerpt: article.feedExcerpt ?? article.summary,
        tags: parseStringArray(article.tags),
        importanceReasons: parseStringArray(article.importanceReasons),
        isRead: readIds.has(article.id),
        isSaved: savedIds.has(article.id),
      })),
      nextCursor,
      hasMore,
      access: {
        tier: access.tier,
        requestedRange: rangeAccess.requestedRange,
        effectiveRange: rangeAccess.effectiveRange,
        rangeRestricted: rangeAccess.restricted,
        sourceScope: sourceScopeLabel(access.plan),
        managedSubscriptions: access.managedSubscriptions,
      },
    });
  } catch (err) {
    console.error("[api/articles] error:", err);
    return NextResponse.json({ error: "Failed to fetch articles" }, { status: 500 });
  }
}
