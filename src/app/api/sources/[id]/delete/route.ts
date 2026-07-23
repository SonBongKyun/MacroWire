import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/security/api-auth";

// DELETE /api/sources/[id] — Delete a source
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (admin instanceof NextResponse) return admin;

    const { id } = await params;

    const source = await prisma.source.findUnique({ where: { id } });
    if (!source) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    const articles = await prisma.article.findMany({
      where: { sourceId: id },
      select: { id: true },
    });
    const articleIds = articles.map((article) => article.id);
    await prisma.$transaction([
      prisma.readState.deleteMany({ where: { articleId: { in: articleIds } } }),
      prisma.savedArticle.deleteMany({ where: { articleId: { in: articleIds } } }),
      prisma.article.deleteMany({ where: { sourceId: id } }),
      prisma.source.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/sources/delete] error:", err);
    return NextResponse.json({ error: "Failed to delete source" }, { status: 500 });
  }
}
