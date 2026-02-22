import { NextResponse } from "next/server";
import { runIngest } from "@/lib/ingest/ingest";
import { seedSources } from "@/lib/db/seed";

export async function POST() {
  try {
    // Ensure sources are seeded
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
