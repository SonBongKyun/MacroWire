import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { stripe, siteUrl } from "@/lib/billing/stripe";
import { PLANS, type PlanKey } from "@/lib/billing/plans";
import { getOrCreateUser } from "@/lib/user/get-or-create";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Start a Stripe Checkout session for the selected plan.
 * POST { plan: "pro" | "elite", interval?: "month" | "year" }
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { plan?: PlanKey };
  const planKey = body.plan;
  if (!planKey || planKey === "free" || !PLANS[planKey]) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }
  const plan = PLANS[planKey];
  const priceId = plan.priceIdEnv ? process.env[plan.priceIdEnv] : undefined;
  if (!priceId) {
    return NextResponse.json(
      { error: `Stripe price id for ${planKey} is not configured` },
      { status: 500 }
    );
  }

  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Reuse customer if we already have one.
  let customerId: string | undefined;
  const sub = await prisma.subscription.findUnique({ where: { userId: user.id } });
  if (sub?.stripeCustomerId) {
    customerId = sub.stripeCustomerId;
  } else {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name ?? undefined,
      metadata: { clerkId: user.clerkId, userId: user.id },
    });
    customerId = customer.id;
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    client_reference_id: user.id,
    subscription_data: {
      metadata: { userId: user.id, clerkId: user.clerkId, plan: planKey },
      trial_period_days: 7,
    },
    success_url: `${siteUrl()}/account?checkout=success`,
    cancel_url: `${siteUrl()}/?checkout=cancelled#pricing`,
  });

  return NextResponse.json({ url: session.url });
}
