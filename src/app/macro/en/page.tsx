import { Metadata } from "next";
import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import { crimsonPro } from "../../fonts-editorial";

export const dynamic = "force-dynamic";

type TopStory = {
  articleId: string;
  title: string;
  url: string;
  sourceName: string;
  why: string;
  tradeImplication: string;
};

async function getRecap() {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  let recap = await prisma.dailyRecap.findFirst({ where: { date: today, locale: "en" } });
  if (!recap) {
    recap = await prisma.dailyRecap.findFirst({
      where: { locale: "en" },
      orderBy: { date: "desc" },
    });
  }
  return recap;
}

export async function generateMetadata(): Promise<Metadata> {
  const recap = await getRecap();
  const title = recap ? `${recap.headline} — MacroWire` : "Today in Macro — MacroWire";
  const description = recap
    ? `${recap.summary}. The top 3 macro stories that matter today, distilled by Claude.`
    : "Top 3 macro stories every trading day, distilled by Claude.";
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      url: "https://macro-wire-psi.vercel.app/macro/en",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function MacroLandingEn() {
  const recap = await getRecap();
  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Seoul",
  });

  return (
    <main
      className={crimsonPro.variable}
      style={{
        minHeight: "100dvh",
        background: "#08090B",
        color: "#F5F0E1",
        padding: "60px 24px 96px",
        fontFamily: "var(--font-mono)",
      }}
    >
      <article style={{ maxWidth: 760, margin: "0 auto" }}>
        <Link href="/" style={{ fontSize: 11, color: "#FFB000", letterSpacing: "0.10em", textDecoration: "none", display: "inline-block", marginBottom: 32 }}>
          ← MACROWIRE
        </Link>

        <div style={{ fontSize: 11, color: "#8C8C91", letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 12 }}>
          TODAY IN MACRO · {todayLabel}
        </div>

        <h1 style={{ fontFamily: "var(--font-display-condensed)", fontSize: 56, lineHeight: 1.08, letterSpacing: "0.02em", margin: "0 0 20px" }}>
          {recap?.headline ?? "Today's macro, distilled by Claude"}
        </h1>

        {recap?.summary && (
          <p style={{ fontFamily: "var(--font-serif), Crimson Pro, serif", fontSize: 20, lineHeight: 1.55, color: "#C9C4B6", marginBottom: 40 }}>
            {recap.summary}
          </p>
        )}

        {recap ? (
          <section style={{ marginTop: 40 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.20em", color: "#FFB000", marginBottom: 20 }}>TOP 3 STORIES</div>
            <ol style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {(recap.topStories as unknown as TopStory[]).map((s, i) => (
                <li key={s.articleId} style={{ marginBottom: 36, paddingBottom: 28, borderBottom: "1px solid rgba(245,240,225,0.08)" }}>
                  <div style={{ fontSize: 11, color: "#8C8C91", letterSpacing: "0.10em", marginBottom: 8 }}>
                    #{i + 1} · {s.sourceName}
                  </div>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 22, lineHeight: 1.35, color: "#F5F0E1", textDecoration: "none", fontWeight: 600 }}>
                    {s.title}
                  </a>
                  <p style={{ marginTop: 12, fontSize: 15, lineHeight: 1.65, color: "#C9C4B6" }}>{s.why}</p>
                  <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(255,176,0,0.06)", borderLeft: "2px solid #FFB000", fontSize: 13, lineHeight: 1.5, color: "#FFB000" }}>
                    <strong>TRADE IMPLICATION</strong> — {s.tradeImplication}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ) : (
          <p style={{ fontSize: 14, color: "#8C8C91" }}>Today&apos;s recap isn&apos;t ready yet. Check back shortly.</p>
        )}

        <section style={{ marginTop: 48, padding: "32px", background: "#0D0D0F", border: "1px solid rgba(245,240,225,0.12)" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.16em", color: "#FFB000", marginBottom: 8 }}>MACROWIRE — JOIN THE WIRE</div>
          <h2 style={{ fontFamily: "var(--font-display-condensed)", fontSize: 28, lineHeight: 1.2, margin: "0 0 12px" }}>
            The desk every macro trader needs.
          </h2>
          <p style={{ fontSize: 14, color: "#C9C4B6", marginBottom: 20 }}>
            A continuously collected global macro wire. Claude tells you why each story matters.
          </p>
          <Link href="/sign-up" style={{ display: "inline-block", padding: "10px 18px", background: "#FFB000", color: "#08090B", fontWeight: 700, fontSize: 12, letterSpacing: "0.10em", textDecoration: "none" }}>
            START FREE
          </Link>
        </section>
      </article>
    </main>
  );
}
