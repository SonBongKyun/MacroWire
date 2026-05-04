import { NextResponse } from "next/server";
import { runIngest } from "@/lib/ingest/ingest";
import { seedSources } from "@/lib/db/seed";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

async function handle() {
  try {
    await seedSources();
    const result = await runIngest();
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/ingest] error:", err);
    return NextResponse.json(
      { error: "Ingest failed", details: String(err) },
      { status: 500 }
    );
  }
}

// Vercel Cron triggers via GET
export const GET = handle;
export const POST = handle;
