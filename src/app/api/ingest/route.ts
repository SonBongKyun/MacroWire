import { NextResponse } from "next/server";
import { runIngest } from "@/lib/ingest/ingest";
import { seedSources } from "@/lib/db/seed";
import { insightConfig } from "@/lib/insights/config";
import { generateAutoInsights } from "@/lib/insights/auto";

export async function POST() {
  try {
    // Ensure sources are seeded
    await seedSources();

    const result = await runIngest();

    // Fire-and-forget: auto-generate insights if enabled
    if (insightConfig.mode === "auto" && insightConfig.apiKeyConfigured && result.added > 0) {
      generateAutoInsights().catch((err) => {
        console.error("[api/ingest] auto-insight error:", err);
      });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/ingest] error:", err);
    return NextResponse.json(
      { error: "Ingest failed", details: String(err) },
      { status: 500 }
    );
  }
}
