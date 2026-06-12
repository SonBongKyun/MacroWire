import { NextRequest, NextResponse } from "next/server";
import { requireSignedIn } from "@/lib/security/api-auth";
import { parseWebhookUrl } from "@/lib/security/outbound-url";

// POST /api/webhook — Send digest to external webhook (Slack, Discord, etc.)
export async function POST(request: NextRequest) {
  try {
    const identity = await requireSignedIn();
    if (identity instanceof NextResponse) return identity;

    const body = await request.json();
    const { webhookUrl, content } = body as { webhookUrl?: string; content?: string };

    if (!webhookUrl || !content) {
      return NextResponse.json({ error: "webhookUrl and content are required" }, { status: 400 });
    }

    let target: URL;
    try {
      target = parseWebhookUrl(webhookUrl);
    } catch {
      return NextResponse.json({ error: "Webhook URL is not allowed" }, { status: 400 });
    }

    // Send to webhook
    const res = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: content, // Slack format
        content: content, // Discord format
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Webhook delivery failed", status: res.status }, { status: 502 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/webhook] error:", err);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}
