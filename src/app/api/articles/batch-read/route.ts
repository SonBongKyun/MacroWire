import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

// POST /api/articles/batch-read — mark multiple articles as read
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { articleIds } = body as { articleIds?: string[] };

    if (!articleIds || !Array.isArray(articleIds) || articleIds.length === 0) {
      return NextResponse.json({ error: "articleIds required" }, { status: 400 });
    }

    const result = await prisma.article.updateMany({
      where: { id: { in: articleIds } },
      data: { isRead: true },
    });

    return NextResponse.json({ updated: result.count });
  } catch (err) {
    console.error("[api/articles/batch-read] error:", err);
    return NextResponse.json(
      { error: "Failed to batch update" },
      { status: 500 }
    );
  }
}
