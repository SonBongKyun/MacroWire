import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ ok: true, skipped: true });

  const body = (await req.json().catch(() => ({}))) as { locale?: string };
  const locale = body.locale === "en" ? "en" : "ko";

  await prisma.user.update({ where: { clerkId: userId }, data: { locale } });
  return NextResponse.json({ ok: true, locale });
}
