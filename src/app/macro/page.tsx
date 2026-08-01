import { Metadata } from "next";
import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import { editorialSerif } from "../fonts-editorial";

// Render at request time so build doesn't depend on Neon being reachable.
// The DailyRecap row only changes when the cron fires, so the LATER move is
// to pair this with an in-memory or Next.js-cache wrapper.
export const dynamic = "force-dynamic";

type TopStory = {
  articleId: string;
  title: string;
  url: string;
  sourceName: string;
  why: string;
  tradeImplication: string;
};

async function getRecap(locale: "ko" | "en") {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  let recap = await prisma.dailyRecap.findFirst({ where: { date: today, locale } });
  if (!recap) {
    recap = await prisma.dailyRecap.findFirst({
      where: { locale },
      orderBy: { date: "desc" },
    });
  }
  return recap;
}

export async function generateMetadata(): Promise<Metadata> {
  const recap = await getRecap("ko");
  const title = recap ? `${recap.headline} — MacroWire` : "오늘의 매크로 — MacroWire";
  const description = recap
    ? `${recap.summary}. AI가 정리한 매크로 TOP 3.`
    : "AI가 매일 정리하는 오늘의 매크로 TOP 3 스토리.";
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      url: "https://macro-wire-psi.vercel.app/macro",
      images: [{ url: "/api/og/recap", width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function MacroLanding() {
  const recap = await getRecap("ko");
  const recapEn = await getRecap("en");
  const todayLabel = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
    timeZone: "Asia/Seoul",
  });

  return (
    <main
      className={editorialSerif.variable}
      style={{
        minHeight: "100dvh",
        background: "#0B0E11",
        color: "#EDEAE0",
        padding: "60px 24px 96px",
        fontFamily: "var(--font-mono)",
      }}
    >
      <article style={{ maxWidth: 760, margin: "0 auto" }}>
        <Link
          href="/"
          style={{
            fontSize: 11,
            color: "#72AEF8",
            letterSpacing: "0.10em",
            textDecoration: "none",
            display: "inline-block",
            marginBottom: 32,
          }}
        >
          ← MACROWIRE
        </Link>

        <div
          style={{
            fontSize: 11,
            color: "#8C8C91",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          오늘의 매크로 · {todayLabel}
        </div>

        <h1
          style={{
            fontFamily: "var(--font-display-condensed)",
            fontSize: 56,
            lineHeight: 1.08,
            letterSpacing: "0.02em",
            margin: "0 0 20px",
          }}
        >
          {recap?.headline ?? "AI가 정리하는 오늘의 매크로"}
        </h1>

        {recap?.summary && (
          <p
            style={{
              fontFamily: "var(--font-serif), serif",
              fontSize: 20,
              lineHeight: 1.55,
              color: "#A9A79E",
              marginBottom: 40,
            }}
          >
            {recap.summary}
          </p>
        )}

        {recap ? (
          <section style={{ marginTop: 40 }}>
            <div
              style={{
                fontSize: 11,
                letterSpacing: "0.20em",
                color: "#72AEF8",
                marginBottom: 20,
              }}
            >
              TOP 3 STORIES
            </div>
            <ol style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {(recap.topStories as unknown as TopStory[]).map((s, i) => (
                <li
                  key={s.articleId}
                  style={{
                    marginBottom: 36,
                    paddingBottom: 28,
                    borderBottom: "1px solid rgba(237,234,224,0.10)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: "#8C8C91",
                      letterSpacing: "0.10em",
                      marginBottom: 8,
                    }}
                  >
                    #{i + 1} · {s.sourceName}
                  </div>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: 22,
                      lineHeight: 1.35,
                      color: "#EDEAE0",
                      textDecoration: "none",
                      fontWeight: 600,
                    }}
                  >
                    {s.title}
                  </a>
                  <p style={{ marginTop: 12, fontSize: 15, lineHeight: 1.65, color: "#A9A79E" }}>
                    {s.why}
                  </p>
                  <div
                    style={{
                      marginTop: 12,
                      padding: "10px 14px",
                      background: "rgba(114,174,248,0.08)",
                      borderLeft: "2px solid #72AEF8",
                      fontSize: 13,
                      lineHeight: 1.5,
                      color: "#72AEF8",
                    }}
                  >
                    <strong>TRADE IMPLICATION</strong> — {s.tradeImplication}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ) : (
          <p style={{ fontSize: 14, color: "#8C8C91" }}>
            아직 오늘의 리캡이 준비되지 않았습니다. 잠시 후 다시 확인해주세요.
          </p>
        )}

        <section
          style={{
            marginTop: 48,
            padding: "32px",
            background: "#11161A",
            border: "1px solid rgba(237,234,224,0.18)",
          }}
        >
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.16em",
              color: "#72AEF8",
              marginBottom: 8,
            }}
          >
            MACROWIRE — JOIN THE WIRE
          </div>
          <h2
            style={{
              fontFamily: "var(--font-display-condensed)",
              fontSize: 28,
              lineHeight: 1.2,
              margin: "0 0 12px",
            }}
          >
            매크로 트레이더를 위한 단 하나의 데스크
          </h2>
          <p style={{ fontSize: 14, color: "#A9A79E", marginBottom: 20 }}>
            지속적으로 수집되는 글로벌 매크로 와이어. AI가 \"왜 중요한지\"까지 정리합니다.
          </p>
          <Link
            href="/sign-up"
            style={{
              display: "inline-block",
              padding: "10px 18px",
              background: "#72AEF8",
              color: "#0B0E11",
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: "0.10em",
              textDecoration: "none",
            }}
          >
            START FREE
          </Link>
        </section>

        {recapEn && (
          <section style={{ marginTop: 36, color: "#8C8C91", fontSize: 12 }}>
            <Link href="/macro/en" style={{ color: "#72AEF8" }}>
              Read this recap in English →
            </Link>
          </section>
        )}
      </article>
    </main>
  );
}
