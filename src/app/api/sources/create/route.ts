import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

// POST /api/sources — Add a new custom RSS source
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, feedUrl, category } = body as { name?: string; feedUrl?: string; category?: string };

    if (!name || !feedUrl) {
      return NextResponse.json({ error: "name and feedUrl are required" }, { status: 400 });
    }

    // Validate URL
    try {
      new URL(feedUrl);
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    // Check for duplicate
    const existing = await prisma.source.findUnique({ where: { feedUrl } });
    if (existing) {
      return NextResponse.json({ error: "Source with this feed URL already exists" }, { status: 409 });
    }

    const source = await prisma.source.create({
      data: {
        name,
        feedUrl,
        category: category || "macro",
        enabled: true,
      },
    });

    return NextResponse.json(source, { status: 201 });
  } catch (err) {
    console.error("[api/sources/POST] error:", err);
    return NextResponse.json({ error: "Failed to create source" }, { status: 500 });
  }
}
