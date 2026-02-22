import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { seedSources } from "@/lib/db/seed";

export async function GET() {
  try {
    // Auto-seed if no sources exist
    const count = await prisma.source.count();
    if (count === 0) {
      await seedSources();
    }

    const sources = await prisma.source.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { articles: true },
        },
      },
    });

    return NextResponse.json(sources);
  } catch (err) {
    console.error("[api/sources] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch sources" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  // Bulk PATCH not used; individual PATCH via /api/sources/[id]
  return NextResponse.json({ error: "Use /api/sources/:id" }, { status: 400 });
}
