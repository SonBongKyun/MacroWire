import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireSignedIn } from "@/lib/security/api-auth";
import { isClerkServerEnabled } from "@/lib/auth/config";
import { summarizeWorkerHealth, type SourceHealthSnapshot } from "@/lib/ingest/workerHealth";

export const dynamic = "force-dynamic";

/**
 * Worker health pulse (option A from the v2 architecture decision).
 *
 * The browser no longer triggers ingestion. A long-running worker owns fetch
 * cadence, overlap prevention, retries and source health. Keeping this route
 * read-only avoids races between serverless instances and the worker while the
 * cheap `/api/articles/head` endpoint continues to announce arrivals.
 */
export async function POST() {
  if (isClerkServerEnabled()) {
    const identity = await requireSignedIn();
    if (identity instanceof NextResponse) return identity;
  }

  try {
    const sources = await prisma.source.findMany({
      where: { enabled: true, tier: { in: ["T0", "T1"] } },
      select: {
        name: true,
        tier: true,
        lastSuccessAt: true,
        lastFailureAt: true,
        consecutiveFailures: true,
        lastLatencyMs: true,
      },
    });
    const health = summarizeWorkerHealth(sources as SourceHealthSnapshot[]);
    return NextResponse.json({ role: "health-only", checkedAt: new Date().toISOString(), ...health });
  } catch (error) {
    console.error("[api/live/pulse] health check failed:", error);
    return NextResponse.json({ error: "Worker health unavailable" }, { status: 500 });
  }
}
