import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { resend, fromAddress } from "@/lib/email/resend";
import { renderDigestHTML } from "@/lib/email/digest-template";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Sends the daily digest to every opted-in user.
 * Triggered by Vercel cron once per hour; we filter by user.digestHour
 * to spread sends across the day.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    const isVercelCron = req.headers.get("x-vercel-cron");
    if (auth !== `Bearer ${secret}` && !isVercelCron) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // KST hour
  const now = new Date();
  const kstHour = Number(
    now.toLocaleString("en-US", { timeZone: "Asia/Seoul", hour: "2-digit", hour12: false })
  );

  const recipients = await prisma.user.findMany({
    where: { digestEmail: true, digestHour: kstHour, tier: { not: "FREE" } },
    select: { id: true, email: true, locale: true, name: true },
  });

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  const results: { email: string; ok: boolean; error?: string }[] = [];

  for (const u of recipients) {
    const locale = u.locale === "en" ? "en" : "ko";
    const recap = await prisma.dailyRecap.findFirst({ where: { date: today, locale } });
    if (!recap) {
      results.push({ email: u.email, ok: false, error: "no recap yet" });
      continue;
    }

    const html = renderDigestHTML({
      locale,
      headline: recap.headline,
      summary: recap.summary,
      topStories: recap.topStories as unknown as Parameters<typeof renderDigestHTML>[0]["topStories"],
      manageUrl: "https://macro-wire-psi.vercel.app/account",
      dateLabel: new Date().toLocaleDateString(locale === "ko" ? "ko-KR" : "en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "Asia/Seoul",
      }),
    });

    try {
      await resend.emails.send({
        from: fromAddress,
        to: u.email,
        subject: `${recap.headline} — MacroWire ${today}`,
        html,
        text: `${recap.headline}\n\n${recap.summary}\n\nOpen: https://macro-wire-psi.vercel.app/app`,
      });
      results.push({ email: u.email, ok: true });
    } catch (err) {
      console.error("[email/digest] send failed", u.email, err);
      results.push({ email: u.email, ok: false, error: String(err) });
    }
  }

  return NextResponse.json({ hour: kstHour, count: recipients.length, results });
}
