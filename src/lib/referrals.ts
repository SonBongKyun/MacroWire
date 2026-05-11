import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import type { User } from "@prisma/client";

/**
 * Called from getOrCreateUser() on first sight of a freshly-signed-up user.
 * If they came in through /r/<code>, mark referredBy and grant both sides
 * one month of bonus access.
 *
 * Bonuses stack: each successful referral extends referralBonusUntil by 30d.
 */
export async function applyReferralCookie(user: User): Promise<void> {
  if (user.referredBy) return; // already credited
  const jar = await cookies();
  const referrerClerkId = jar.get("mw_ref")?.value;
  if (!referrerClerkId || referrerClerkId === user.clerkId) return;

  const referrer = await prisma.user.findUnique({ where: { clerkId: referrerClerkId } });
  if (!referrer) return;

  const monthMs = 30 * 24 * 60 * 60 * 1000;
  const extend = (current: Date | null) => {
    const base = current && current.getTime() > Date.now() ? current.getTime() : Date.now();
    return new Date(base + monthMs);
  };

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { referredBy: referrer.clerkId, referralBonusUntil: extend(user.referralBonusUntil) },
    }),
    prisma.user.update({
      where: { id: referrer.id },
      data: { referralBonusUntil: extend(referrer.referralBonusUntil) },
    }),
  ]);

  // Clean up cookie so it doesn't keep firing on subsequent sessions.
  jar.delete("mw_ref");
}
