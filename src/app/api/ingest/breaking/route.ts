import { NextResponse } from "next/server";
import { runBreakingIngest } from "@/lib/ingest/breakingIngest";

/**
 * Fast-poll endpoint: only fetches "속보" category sources in parallel.
 * Called every 90 seconds from the client for near real-time breaking news.
 */
export async function POST() {
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
