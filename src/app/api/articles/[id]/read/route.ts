import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const article = await prisma.article.findUnique({ where: { id } });

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    const updated = await prisma.article.update({
      where: { id },
      data: { isRead: !article.isRead },
    });

    return NextResponse.json({
      id: updated.id,
      isRead: updated.isRead,
    });
  } catch (err) {
    console.error("[api/articles/read] error:", err);
    return NextResponse.json({ error: "Failed to toggle read" }, { status: 500 });
  }
}
