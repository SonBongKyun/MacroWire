import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { planFromTier, type Plan } from "@/lib/billing/plans";
import type { Tier, User, InsightKind } from "@prisma/client";

export interface GateResult {
  user: User;
  plan: Plan;
}

/** Reject with 401 if anonymous; 403 if tier below `minTier`. */
export async function requireTier(minTier: Tier = "FREE"): Promise<GateResult | NextResponse> {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  if (!tierAtLeast(user.tier, minTier)) {
    return NextResponse.json(
      { error: "UPGRADE_REQUIRED", required: minTier, current: user.tier },
      { status: 403 }
    );
  }
  return { user, plan: planFromTier(user.tier) };
}

export function tierAtLeast(actual: Tier, min: Tier): boolean {
  const rank: Record<Tier, number> = { FREE: 0, PRO: 1, ELITE: 2 };
  return rank[actual] >= rank[min];
}

/**
 * Enforce per-day AI insight quota for the user.
 * Returns NextResponse on rejection, void on success.
 * Call this AFTER `requireTier(...)`.
 */
export async function enforceInsightQuota(
  user: User,
  plan: Plan,
  _kind: InsightKind
): Promise<NextResponse | null> {
  const limit = plan.limits.aiInsightsPerDay;
  if (limit === -1) return null; // unlimited

  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const used = await prisma.insightUsage.count({
    where: { userId: user.id, createdAt: { gte: since } },
  });
  if (used >= limit) {
    return NextResponse.json(
      {
        error: "QUOTA_EXCEEDED",
        message: `Daily AI insight quota reached (${used}/${limit}). Upgrade for unlimited.`,
        limit,
        used,
      },
      { status: 429 }
    );
  }
  return null;
}

export async function logInsightUsage(userId: string, kind: InsightKind) {
  await prisma.insightUsage.create({ data: { userId, kind } });
}
