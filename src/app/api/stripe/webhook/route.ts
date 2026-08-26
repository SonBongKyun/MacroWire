import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import type Stripe from "stripe";
import { stripe } from "@/lib/billing/stripe";
import { prisma } from "@/lib/db/prisma";
import { tierFromPriceId } from "@/lib/billing/plans";
import type { SubStatus, Tier } from "@prisma/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const sig = (await headers()).get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    console.error("[stripe-webhook] signature verification failed:", err);
    return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription && session.customer) {
          const subId = typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id;
          await upsertSubscription(await stripe.subscriptions.retrieve(subId));
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await upsertSubscription(event.data.object as Stripe.Subscription);
        break;
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscription = invoice.parent?.subscription_details?.subscription;
        const subscriptionId = typeof subscription === "string" ? subscription : subscription?.id;
        if (subscriptionId) {
          await upsertSubscription(await stripe.subscriptions.retrieve(subscriptionId));
        }
        break;
      }
    }
  } catch (err) {
    console.error("[stripe-webhook] handler error:", err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

function mapStatus(s: Stripe.Subscription.Status): SubStatus {
  switch (s) {
    case "active":
      return "ACTIVE";
    case "trialing":
      return "TRIALING";
    case "past_due":
      return "PAST_DUE";
    case "canceled":
      return "CANCELED";
    case "incomplete":
    case "incomplete_expired":
    case "unpaid":
    case "paused":
    default:
      return "INCOMPLETE";
  }
}

function isEntitledStatus(status: SubStatus): boolean {
  return status === "ACTIVE" || status === "TRIALING";
}

async function upsertSubscription(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const item = sub.items.data[0];
  const priceId = item?.price?.id ?? "";
  const metadataUserId = (sub.metadata?.userId as string | undefined) ?? null;

  let resolvedUserId = metadataUserId;
  if (!resolvedUserId) {
    const byCustomer = await prisma.subscription.findUnique({
      where: { stripeCustomerId: customerId },
    });
    if (byCustomer) resolvedUserId = byCustomer.userId;
  }
  if (!resolvedUserId) {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer && !customer.deleted) {
      const clerkId = (customer.metadata?.clerkId as string | undefined) ?? null;
      if (clerkId) {
        const user = await prisma.user.findUnique({ where: { clerkId } });
        if (user) resolvedUserId = user.id;
      }
    }
  }
  if (!resolvedUserId) {
    console.warn("[stripe-webhook] cannot resolve user for subscription", sub.id);
    return;
  }

  const status = mapStatus(sub.status);
  const entitled = isEntitledStatus(status);
  const paidTier = tierFromPriceId(priceId);
  if (entitled && !paidTier) {
    // A paid subscription whose price is not configured must fail loudly.
    // Treating it as FREE would hide a production billing configuration error.
    throw new Error(`UNKNOWN_STRIPE_PRICE:${priceId || "missing"}`);
  }
  const userTier: Tier = entitled ? paidTier! : "FREE";

  const periodStart = (
    item?.current_period_start ?? sub.start_date ?? Math.floor(Date.now() / 1000)
  ) * 1000;
  const periodEnd = (
    item?.current_period_end ?? Math.floor(Date.now() / 1000) + 86400 * 30
  ) * 1000;

  const existing = await prisma.subscription.findUnique({
    where: { userId: resolvedUserId },
  });

  // Ignore a late terminal event from an older subscription after a replacement
  // subscription has already become active. Stripe can deliver lifecycle events
  // out of order, and the old cancellation must not downgrade the new plan.
  if (
    existing
    && existing.stripeSubscriptionId !== sub.id
    && isEntitledStatus(existing.status)
    && !entitled
  ) {
    console.warn(
      "[stripe-webhook] ignoring stale terminal event",
      sub.id,
      "current=",
      existing.stripeSubscriptionId,
    );
    return;
  }

  const subscriptionWrite = existing
    ? prisma.subscription.update({
        where: { userId: resolvedUserId },
        data: {
          stripeCustomerId: customerId,
          stripeSubscriptionId: sub.id,
          stripePriceId: priceId,
          status,
          currentPeriodStart: new Date(periodStart),
          currentPeriodEnd: new Date(periodEnd),
          cancelAtPeriodEnd: !!sub.cancel_at_period_end,
        },
      })
    : prisma.subscription.create({
        data: {
          userId: resolvedUserId,
          stripeCustomerId: customerId,
          stripeSubscriptionId: sub.id,
          stripePriceId: priceId,
          status,
          currentPeriodStart: new Date(periodStart),
          currentPeriodEnd: new Date(periodEnd),
          cancelAtPeriodEnd: !!sub.cancel_at_period_end,
        },
      });

  await prisma.$transaction([
    subscriptionWrite,
    prisma.user.update({
      where: { id: resolvedUserId },
      data: { tier: userTier },
    }),
  ]);
}
