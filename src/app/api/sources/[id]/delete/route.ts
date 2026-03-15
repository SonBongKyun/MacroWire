import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

// DELETE /api/sources/[id] — Delete a source
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const source = await prisma.source.findUnique({ where: { id } });
    if (!source) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    // Delete associated articles first
    await prisma.article.deleteMany({ where: { sourceId: id } });
    await prisma.source.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/sources/delete] error:", err);
    return NextResponse.json({ error: "Failed to delete source" }, { status: 500 });
  }
}
