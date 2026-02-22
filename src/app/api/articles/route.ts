import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";

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

    // Build where clause
    const where: Prisma.ArticleWhereInput = {};

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
      where.OR = [
        { title: { contains: q } },
        { summary: { contains: q } },
      ];
    }

    if (read !== null && read !== undefined && read !== "") {
      where.isRead = read === "true";
    }

    if (saved === "true") {
      where.isSaved = true;
    }

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

    return NextResponse.json({
      data: data.map((a) => ({
        ...a,
        tags: JSON.parse(a.tags),
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
