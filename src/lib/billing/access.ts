import type { Tier, User } from "@prisma/client";
import { isClerkServerEnabled } from "@/lib/auth/config";
import { getOrCreateUser } from "@/lib/user/get-or-create";
import { effectiveTier } from "./gate";
import { planFromTier, type Plan } from "./plans";

export interface ViewerAccess {
  tier: Tier;
  plan: Plan;
  user: User | null;
  userId: string | null;
  /** False for the owner/self-hosted mode where Clerk is intentionally absent. */
  managedSubscriptions: boolean;
}

/**
 * Resolve one request into the same entitlement object used by read APIs.
 *
 * A Clerk-less deployment is the original personal-desk mode. It receives the
 * full product instead of accidentally turning the owner into an anonymous
 * FREE user. Once Clerk is configured, anonymous visitors are FREE and signed
 * in users are evaluated from their persisted tier/referral bonus.
 */
export async function resolveViewerAccess(): Promise<ViewerAccess> {
  if (!isClerkServerEnabled()) {
    const tier: Tier = "ELITE";
    return {
      tier,
      plan: planFromTier(tier),
      user: null,
      userId: null,
      managedSubscriptions: false,
    };
  }

  const user = await getOrCreateUser();
  if (!user) {
    const tier: Tier = "FREE";
    return {
      tier,
      plan: planFromTier(tier),
      user: null,
      userId: null,
      managedSubscriptions: true,
    };
  }

  const tier = effectiveTier(user);
  return {
    tier,
    plan: planFromTier(tier),
    user: tier === user.tier ? user : { ...user, tier },
    userId: user.id,
    managedSubscriptions: true,
  };
}
