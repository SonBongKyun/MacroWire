import { NextResponse } from "next/server";
import { runBreakingIngest } from "@/lib/ingest/breakingIngest";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

async function handle() {
  try {
    const result = await runBreakingIngest();
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/ingest/breaking] error:", err);
    return NextResponse.json(
      { error: "Breaking ingest failed", details: String(err) },
      { status: 500 }
    );
  }
}

export const GET = handle;
export const POST = handle;
