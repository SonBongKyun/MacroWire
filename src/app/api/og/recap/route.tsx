import { ImageResponse } from "next/og";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIZE = { width: 1200, height: 630 };

/** Twitter / OG card for the daily recap. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const locale = url.searchParams.get("locale") === "en" ? "en" : "ko";
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  const recap =
    (await prisma.dailyRecap.findFirst({ where: { date: today, locale } })) ??
    (await prisma.dailyRecap.findFirst({ where: { locale }, orderBy: { date: "desc" } }));

  const headline = recap?.headline ?? (locale === "ko" ? "오늘의 매크로" : "Today in Macro");
  const dateLabel = new Date().toLocaleDateString(locale === "ko" ? "ko-KR" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Seoul",
  });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#0B0E11",
          color: "#EDEAE0",
          padding: "60px 70px",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 60,
            left: 70,
            right: 70,
            height: 3,
            background: "#72AEF8",
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 30,
            fontSize: 22,
            letterSpacing: "0.16em",
            color: "#72AEF8",
            fontWeight: 700,
          }}
        >
          <span>MACROWIRE</span>
          <span style={{ color: "#8C8C91", letterSpacing: "0.08em" }}>{dateLabel}</span>
        </div>

        <div
          style={{
            fontSize: 24,
            letterSpacing: "0.18em",
            color: "#8C8C91",
            marginTop: 80,
            marginBottom: 16,
          }}
        >
          {locale === "ko" ? "오늘의 매크로 TOP 3" : "TODAY IN MACRO — TOP 3"}
        </div>

        <div
          style={{
            fontSize: 64,
            lineHeight: 1.1,
            fontWeight: 800,
            letterSpacing: "0.01em",
            display: "flex",
          }}
        >
          {headline.length > 80 ? `${headline.slice(0, 80)}…` : headline}
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 60,
            left: 70,
            right: 70,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            color: "#8C8C91",
            fontSize: 20,
          }}
        >
          <span>macro-wire-psi.vercel.app/macro</span>
          <span style={{ color: "#72AEF8", fontWeight: 700, letterSpacing: "0.12em" }}>
            {locale === "ko" ? "AI가 정리합니다" : "Distilled by AI"}
          </span>
        </div>
      </div>
    ),
    { ...SIZE }
  );
}
