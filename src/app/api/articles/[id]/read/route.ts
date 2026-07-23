import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getOrCreateUser } from "@/lib/user/get-or-create";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getOrCreateUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const article = await prisma.article.findUnique({ where: { id }, select: { id: true } });

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    const key = { userId_articleId: { userId: user.id, articleId: id } };
    const existing = await prisma.readState.findUnique({ where: key });
    if (existing) {
      await prisma.readState.delete({ where: key });
    } else {
      await prisma.readState.create({ data: { userId: user.id, articleId: id } });
    }

    return NextResponse.json({
      id,
      isRead: !existing,
    });
  } catch (err) {
    console.error("[api/articles/read] error:", err);
    return NextResponse.json({ error: "Failed to toggle read" }, { status: 500 });
  }
}
