import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { Prisma, type Tier, type User, type InsightKind } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { planFromTier, type Plan } from "@/lib/billing/plans";

export interface GateResult {
  user: User;
  plan: Plan;
}

export function effectiveTier(user: User): Tier {
  if (user.tier !== "FREE") return user.tier;
  if (user.referralBonusUntil && user.referralBonusUntil.getTime() > Date.now()) return "PRO";
  return "FREE";
}

export async function requireTier(minTier: Tier = "FREE"): Promise<GateResult | NextResponse> {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const eff = effectiveTier(user);
  if (!tierAtLeast(eff, minTier)) {
    return NextResponse.json(
      { error: "UPGRADE_REQUIRED", required: minTier, current: eff },
      { status: 403 },
    );
  }
  return { user: { ...user, tier: eff }, plan: planFromTier(eff) };
}

export function tierAtLeast(actual: Tier, min: Tier): boolean {
  const rank: Record<Tier, number> = { FREE: 0, PRO: 1, ELITE: 2 };
  return rank[actual] >= rank[min];
}

function startOfUtcDay(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function isRetryableTransactionError(error: unknown): boolean {
  return Boolean(
    error
      && typeof error === "object"
      && "code" in error
      && (error as { code?: string }).code === "P2034",
  );
}

export type QuotaReservation =
  | { ok: true; reservationId: string | null; used: number; limit: number }
  | { ok: false; used: number; limit: number };

/**
 * Atomically reserve one AI usage slot. The old count-then-insert flow allowed
 * simultaneous FREE requests to observe the same count and both pass. A
 * serializable transaction makes the limit exact; P2034 conflicts are retried.
 * Unlimited plans return a null reservation without touching the database.
 */
export async function reserveInsightQuota(
  user: User,
  plan: Plan,
  kind: InsightKind,
): Promise<QuotaReservation> {
  const limit = plan.limits.aiInsightsPerDay;
  if (limit === -1) return { ok: true, reservationId: null, used: 0, limit };
  if (limit <= 0) return { ok: false, used: 0, limit };

  const since = startOfUtcDay();
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const used = await tx.insightUsage.count({
          where: { userId: user.id, createdAt: { gte: since } },
        });
        if (used >= limit) return { ok: false, used, limit } as const;

        const reservation = await tx.insightUsage.create({
          data: { userId: user.id, kind },
          select: { id: true },
        });
        return {
          ok: true,
          reservationId: reservation.id,
          used: used + 1,
          limit,
        } as const;
      }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (attempt < 2 && isRetryableTransactionError(error)) continue;
      throw error;
    }
  }
  throw new Error("QUOTA_RESERVATION_FAILED");
}

export function quotaExceededResponse(reservation: Extract<QuotaReservation, { ok: false }>) {
  return NextResponse.json(
    {
      error: "QUOTA_EXCEEDED",
      message: `Daily AI insight quota reached (${reservation.used}/${reservation.limit}).`,
      limit: reservation.limit,
      used: reservation.used,
    },
    { status: 429 },
  );
}

/** Release a reserved slot when provider generation fails. */
export async function releaseInsightReservation(reservationId: string | null): Promise<void> {
  if (!reservationId) return;
  try {
    await prisma.insightUsage.delete({ where: { id: reservationId } });
  } catch (error) {
    console.error("[billing/quota] failed to release reservation", reservationId, error);
  }
}

/**
 * Legacy read-only check retained for compatibility. New model-calling routes
 * should reserve atomically with reserveInsightQuota instead.
 */
export async function enforceInsightQuota(
  user: User,
  plan: Plan,
  _kind: InsightKind,
): Promise<NextResponse | null> {
  const limit = plan.limits.aiInsightsPerDay;
  if (limit === -1) return null;

  const used = await prisma.insightUsage.count({
    where: { userId: user.id, createdAt: { gte: startOfUtcDay() } },
  });
  if (used >= limit) return quotaExceededResponse({ ok: false, used, limit });
  return null;
}

export async function logInsightUsage(userId: string, kind: InsightKind) {
  await prisma.insightUsage.create({ data: { userId, kind } });
}
