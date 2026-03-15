import { NextRequest, NextResponse } from "next/server";

// POST /api/webhook — Send digest to external webhook (Slack, Discord, etc.)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { webhookUrl, content } = body as { webhookUrl?: string; content?: string };

    if (!webhookUrl || !content) {
      return NextResponse.json({ error: "webhookUrl and content are required" }, { status: 400 });
    }

    // Validate URL
    try {
      new URL(webhookUrl);
    } catch {
      return NextResponse.json({ error: "Invalid webhook URL" }, { status: 400 });
    }

    // Send to webhook
    const res = await fetch(webhookUrl, {
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
