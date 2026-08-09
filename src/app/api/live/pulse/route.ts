import { NextResponse } from "next/server";
import { runBreakingIngest } from "@/lib/ingest/breakingIngest";
import { requireSignedIn } from "@/lib/security/api-auth";
import { isClerkServerEnabled } from "@/lib/auth/config";
import { shouldPulse, withPulseLock } from "@/lib/ingest/pulseGate";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

/**
 * Refresh the breaking queue on behalf of an open browser.
 *
 * The scheduled job cannot deliver breaking news at a useful cadence. The
 * workflow asks for every five minutes, but GitHub deprioritises scheduled runs
 * on public repositories heavily — observed gaps on this repo ran 45 to 82
 * minutes. Anything the client does to poll faster is wasted when the data only
 * lands hourly.
 *
 * So while the desk is open it drives its own wire: the app pulses this
 * endpoint, the endpoint refreshes the breaking sources, and the client picks
 * the result up on its next check. The scheduled job stays as the floor for
 * when nobody is watching.
 *
 * Guarded twice over. Sign-in is required, so this is not an open trigger on a
 * public URL, and a cooldown collapses tabs and timers into one fetch.
 */
export async function POST() {
  // Local development runs without Clerk; there is no session to require and
  // no public surface to protect.
  if (isClerkServerEnabled()) {
    const identity = await requireSignedIn();
    if (identity instanceof NextResponse) return identity;
  }

  const decision = shouldPulse();
  if (!decision.run) {
    return NextResponse.json({ ran: false, retryInMs: decision.retryInMs });
  }

  try {
    const result = await withPulseLock(() => runBreakingIngest());
    return NextResponse.json({
      ran: true,
      added: result.added,
      sourceCount: result.sourceCount,
      failedSources: result.failedSources,
      lastUpdated: result.lastUpdated,
    });
  } catch (err) {
    console.error("[api/live/pulse] error:", err);
    return NextResponse.json({ error: "Pulse failed" }, { status: 500 });
  }
}
