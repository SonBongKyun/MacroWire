import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { getOrCreateUser } from "@/lib/user/get-or-create";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const sourceId = searchParams.get("sourceId");
    const tag = searchParams.get("tag");
    const q = searchParams.get("q");
    const read = searchParams.get("read");
    const saved = searchParams.get("saved");
    const range = searchParams.get("range") ?? "24h";
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);
    const cursor = searchParams.get("cursor");
    const user = await getOrCreateUser();

    // Build where clause
    const where: Prisma.ArticleWhereInput = {};
    const andFilters: Prisma.ArticleWhereInput[] = [];

    // Range filter
    const now = new Date();
    if (range === "24h") {
      where.publishedAt = { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) };
    } else if (range === "7d") {
      where.publishedAt = { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
    } else if (range === "30d") {
      where.publishedAt = { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
    }

    if (sourceId) {
      where.sourceId = sourceId;
    }

    if (tag) {
      // tags stored as JSON string array, search with contains
      where.tags = { contains: `"${tag}"` };
    }

    if (q) {
      // Enhanced search: split query into tokens and match all (#21)
      const tokens = q.trim().split(/\s+/).filter((t: string) => t.length > 0);
      if (tokens.length > 1) {
        andFilters.push(...tokens.map((token: string) => ({
          OR: [
            { title: { contains: token } },
            { summary: { contains: token } },
            { sourceName: { contains: token } },
            { tags: { contains: token } },
          ],
        })));
      } else {
        where.OR = [
          { title: { contains: q } },
          { summary: { contains: q } },
          { sourceName: { contains: q } },
          { tags: { contains: q } },
        ];
      }
    }

    if (read !== null && read !== undefined && read !== "") {
      if (!user) {
        if (read === "true") andFilters.push({ id: { in: [] } });
      } else {
        const states = await prisma.readState.findMany({
          where: { userId: user.id },
          select: { articleId: true },
        });
        const ids = states.map((state) => state.articleId);
        andFilters.push({ id: read === "true" ? { in: ids } : { notIn: ids } });
      }
    }

    if (saved === "true") {
      if (!user) {
        andFilters.push({ id: { in: [] } });
      } else {
        const states = await prisma.savedArticle.findMany({
          where: { userId: user.id },
          select: { articleId: true },
        });
        andFilters.push({ id: { in: states.map((state) => state.articleId) } });
      }
    }

    if (andFilters.length > 0) where.AND = andFilters;

    const articles = await prisma.article.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      take: limit + 1, // fetch one extra to determine if there's a next page
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
    });

    const hasMore = articles.length > limit;
    const data = hasMore ? articles.slice(0, limit) : articles;
    const nextCursor = hasMore ? data[data.length - 1].id : null;
    const articleIds = data.map((article) => article.id);
    const [readStates, savedStates] = user
      ? await Promise.all([
          prisma.readState.findMany({
            where: { userId: user.id, articleId: { in: articleIds } },
            select: { articleId: true },
          }),
          prisma.savedArticle.findMany({
            where: { userId: user.id, articleId: { in: articleIds } },
            select: { articleId: true },
          }),
        ])
      : [[], []];
    const readIds = new Set(readStates.map((state) => state.articleId));
    const savedIds = new Set(savedStates.map((state) => state.articleId));

    return NextResponse.json({
      data: data.map((a) => ({
        ...a,
        tags: JSON.parse(a.tags),
        isRead: readIds.has(a.id),
        isSaved: savedIds.has(a.id),
      })),
      nextCursor,
      hasMore,
    });
  } catch (err) {
    console.error("[api/articles] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch articles" },
      { status: 500 }
    );
  }
}
