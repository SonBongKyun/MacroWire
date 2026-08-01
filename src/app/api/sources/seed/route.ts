import { NextResponse } from "next/server";
import { seedSources } from "@/lib/db/seed";
import { requireAdmin } from "@/lib/security/api-auth";

/**
 * Re-seed the source catalogue from config/sources_seed.json.
 *
 * This route used to carry its own hardcoded list of 20 feeds, separate from
 * the JSON the ingest jobs read. The two drifted, and by the time anyone
 * looked seven of the route's entries were dead — four 404s, a 410, a 500, and
 * one returning an HTML page instead of RSS. Because the route is admin-gated
 * nobody was hitting it often enough to notice.
 *
 * There is now one catalogue. seedSources() upserts by feedUrl, so calling
 * this is safe to repeat and also refreshes names and categories on rows that
 * already exist.
 */
export async function POST() {
  try {
    const admin = await requireAdmin();
    if (admin instanceof NextResponse) return admin;

    const result = await seedSources();
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/sources/seed] error:", err);
    return NextResponse.json(
      { error: "Failed to seed sources" },
      { status: 500 }
    );
  }
}
