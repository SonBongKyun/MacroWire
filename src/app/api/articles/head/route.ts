import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { isBreakingArticle } from "@/lib/news/signal";
import { resolveViewerAccess } from "@/lib/billing/access";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * "Has anything landed since X?" — the cheapest question the wire can ask.
 * Counts use the same source entitlement as /api/articles so a FREE reader is
 * never told about arrivals that cannot appear after loading the list.
 */
export async function GET(req: NextRequest) {
  const sinceParam = req.nextUrl.searchParams.get("since");

  try {
    const access = await resolveViewerAccess();
    const sourceScope: Prisma.ArticleWhereInput = access.plan.limits.sources === "core"
      ? { source: { is: { tier: { not: "T3" } } } }
      : {};

    const newest = await prisma.article.findFirst({
      where: sourceScope,
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    const latest = newest?.createdAt?.toISOString() ?? null;

    if (!sinceParam) {
      return NextResponse.json({ latest, newCount: 0, breakingCount: 0 });
    }

    const since = new Date(sinceParam);
    if (Number.isNaN(since.getTime())) {
      return NextResponse.json({ error: "Invalid 'since'" }, { status: 400 });
    }

    const landed = await prisma.article.findMany({
      where: {
        ...sourceScope,
        createdAt: { gt: since },
      },
      select: {
        title: true,
        summary: true,
        tags: true,
        sourceName: true,
        importanceScore: true,
        importanceTier: true,
        source: { select: { tier: true } },
      },
    });
    const newCount = landed.length;
    const breakingCount = landed.filter((article) => {
      let tags: string[] = [];
      try {
        const parsed = JSON.parse(article.tags);
        if (Array.isArray(parsed)) tags = parsed.filter((item): item is string => typeof item === "string");
      } catch {}
      return isBreakingArticle({
        ...article,
        tags,
        sourceTier: article.source.tier,
        importanceTier: article.importanceTier as "critical" | "major" | "general",
      });
    }).length;

    return NextResponse.json({ latest, newCount, breakingCount });
  } catch (err) {
    console.error("[api/articles/head] error:", err);
    return NextResponse.json({ error: "Head check failed" }, { status: 500 });
  }
}
