import { NextResponse } from "next/server";
import { getPublicHealth } from "@/lib/observability/health";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const health = await getPublicHealth();
    const status = health.database === "error" || health.status === "stale" ? 503 : 200;
    return NextResponse.json(health, {
      status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[health] public health failed", error);
    return NextResponse.json(
      { status: "stale", database: "error", checkedAt: new Date().toISOString() },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
