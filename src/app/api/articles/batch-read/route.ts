import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getOrCreateUser } from "@/lib/user/get-or-create";

// POST /api/articles/batch-read — mark multiple articles as read
export async function POST(request: NextRequest) {
  try {
    const user = await getOrCreateUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { articleIds } = body as { articleIds?: string[] };

    if (!articleIds || !Array.isArray(articleIds) || articleIds.length === 0) {
      return NextResponse.json({ error: "articleIds required" }, { status: 400 });
    }

    const ids = [...new Set(articleIds)].slice(0, 200);
    const existingArticles = await prisma.article.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    const result = await prisma.readState.createMany({
      data: existingArticles.map((article) => ({ userId: user.id, articleId: article.id })),
      skipDuplicates: true,
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
