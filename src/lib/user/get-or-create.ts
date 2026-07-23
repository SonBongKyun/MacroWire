import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { applyReferralCookie } from "@/lib/referrals";
import type { User } from "@prisma/client";
import { isClerkServerEnabled } from "@/lib/auth/config";

/**
 * Resolve the current request's Clerk identity into our local User row,
 * creating it on first sight. Returns null when the request is anonymous.
 *
 * On first creation, also credits any pending referral cookie.
 */
export async function getOrCreateUser(): Promise<User | null> {
  if (!isClerkServerEnabled()) return null;
  const { userId } = await auth();
  if (!userId) return null;

  const existing = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (existing) return existing;

  // First visit by this signed-in user — pull profile from Clerk and persist.
  const clerkUser = await currentUser();
  const email =
    clerkUser?.emailAddresses?.find((e) => e.id === clerkUser.primaryEmailAddressId)
      ?.emailAddress ??
    clerkUser?.emailAddresses?.[0]?.emailAddress ??
    `${userId}@clerk.local`;
  const name =
    [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ").trim() || null;

  const created = await prisma.user.upsert({
    where: { clerkId: userId },
    update: {},
    create: { clerkId: userId, email, name },
  });

  // Best-effort referral credit; never block user creation on this.
  try {
    await applyReferralCookie(created);
  } catch (err) {
    console.error("[referrals] apply failed:", err);
  }
  return prisma.user.findUnique({ where: { id: created.id } });
}

export async function requireUser(): Promise<User> {
  const u = await getOrCreateUser();
  if (!u) throw new Error("UNAUTHENTICATED");
  return u;
}
