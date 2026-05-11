import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { stripe, siteUrl } from "@/lib/billing/stripe";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Stripe Customer Portal — let the user manage / cancel their own subscription. */
export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { subscription: true },
  });
  if (!user?.subscription?.stripeCustomerId) {
    return NextResponse.json({ error: "No active subscription" }, { status: 404 });
  }

  const portal = await stripe.billingPortal.sessions.create({
    customer: user.subscription.stripeCustomerId,
    return_url: `${siteUrl()}/account`,
  });

  return NextResponse.json({ url: portal.url });
}
