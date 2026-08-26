import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { seedSources } from "@/lib/db/seed";
import { resolveViewerAccess } from "@/lib/billing/access";

export async function GET() {
  try {
    const count = await prisma.source.count();
    if (count === 0) await seedSources();

    const access = await resolveViewerAccess();
    const sources = await prisma.source.findMany({
      where: access.plan.limits.sources === "core"
        ? { tier: { not: "T3" } }
        : undefined,
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { articles: true },
        },
      },
    });

    return NextResponse.json(sources, {
      headers: {
        "X-MacroWire-Tier": access.tier,
        "X-MacroWire-Source-Scope": access.plan.limits.sources,
      },
    });
  } catch (err) {
    console.error("[api/sources] error:", err);
    return NextResponse.json({ error: "Failed to fetch sources" }, { status: 500 });
  }
}

export async function PATCH(_request: NextRequest) {
  return NextResponse.json({ error: "Use /api/sources/:id" }, { status: 400 });
}
