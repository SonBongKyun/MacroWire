import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { headers } from "next/headers";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Clerk webhook — sync user lifecycle into our DB.
 * Configure in Clerk dashboard: Webhooks → Add endpoint → /api/clerk/webhook
 * Events: user.created, user.updated, user.deleted
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[clerk-webhook] CLERK_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const hdrs = await headers();
  const svixId = hdrs.get("svix-id");
  const svixTimestamp = hdrs.get("svix-timestamp");
  const svixSignature = hdrs.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const body = await req.text();
  let evt: { type: string; data: Record<string, unknown> };
  try {
    const wh = new Webhook(secret);
    evt = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as typeof evt;
  } catch (err) {
    console.error("[clerk-webhook] verification failed:", err);
    return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  }

  try {
    if (evt.type === "user.created" || evt.type === "user.updated") {
      const u = evt.data as {
        id: string;
        email_addresses: { id: string; email_address: string }[];
        primary_email_address_id: string;
        first_name: string | null;
        last_name: string | null;
        public_metadata?: { referred_by?: string };
      };
      const primary =
        u.email_addresses.find((e) => e.id === u.primary_email_address_id)?.email_address ??
        u.email_addresses[0]?.email_address ??
        `${u.id}@clerk.local`;
      const name = [u.first_name, u.last_name].filter(Boolean).join(" ").trim() || null;

      await prisma.user.upsert({
        where: { clerkId: u.id },
        update: { email: primary, name },
        create: {
          clerkId: u.id,
          email: primary,
          name,
          referredBy: u.public_metadata?.referred_by ?? null,
        },
      });
    } else if (evt.type === "user.deleted") {
      const u = evt.data as { id: string };
      await prisma.user.deleteMany({ where: { clerkId: u.id } });
    }
  } catch (err) {
    console.error("[clerk-webhook] handler error:", err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
