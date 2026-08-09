import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

/**
 * "Has anything landed since X?" — the cheapest question the wire can ask.
 *
 * Checking for breaking news used to mean refetching the whole 50-article list
 * every 30 seconds, which is far too expensive to run at the cadence a ticker
 * needs. This returns two numbers, so the client can ask every few seconds and
 * only pull the list when the answer changes.
 */
export async function GET(req: NextRequest) {
  const sinceParam = req.nextUrl.searchParams.get("since");

  try {
    const newest = await prisma.article.findFirst({
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

    // Ingest stamps createdAt, so this counts what arrived rather than what was
    // published — a story filed late still registers as new to this reader.
    const [newCount, breakingCount] = await Promise.all([
      prisma.article.count({ where: { createdAt: { gt: since } } }),
      prisma.article.count({
        where: { createdAt: { gt: since }, source: { category: "속보" } },
      }),
    ]);

    return NextResponse.json({ latest, newCount, breakingCount });
  } catch (err) {
    console.error("[api/articles/head] error:", err);
    return NextResponse.json({ error: "Head check failed" }, { status: 500 });
  }
}
