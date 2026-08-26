import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { stripe, siteUrl } from "@/lib/billing/stripe";
import { PLANS, type PlanKey } from "@/lib/billing/plans";
import { getOrCreateUser } from "@/lib/user/get-or-create";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Start a Stripe Checkout session for a user without an active subscription.
 * Existing subscribers are routed to Customer Portal instead of creating a
 * second Stripe subscription that would conflict with our one-user/one-row
 * subscription model.
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
      { status: 500 },
    );
  }

  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sub = await prisma.subscription.findUnique({ where: { userId: user.id } });

  // Changing an existing subscription belongs in Stripe's authenticated portal.
  // This avoids accidentally creating two recurring subscriptions for one user.
  if (sub?.stripeCustomerId && sub.status !== "CANCELED") {
    const portal = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${siteUrl()}/account`,
    });
    return NextResponse.json({ url: portal.url, existingSubscription: true });
  }

  let customerId = sub?.stripeCustomerId;
  if (!customerId) {
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
