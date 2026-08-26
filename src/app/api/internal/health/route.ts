import { NextRequest, NextResponse } from "next/server";
import { verifyOwnerSecret } from "@/lib/security/api-auth";
import { getInternalHealth } from "@/lib/observability/health";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const owner = verifyOwnerSecret(req.headers);
  if (owner === "unconfigured") {
    return NextResponse.json({ error: "Owner diagnostics are not configured" }, { status: 503 });
  }
  if (owner !== "authorized") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const health = await getInternalHealth();
    return NextResponse.json(health, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[health] internal diagnostics failed", error);
    return NextResponse.json({ error: "Diagnostics unavailable" }, { status: 500 });
  }
}
