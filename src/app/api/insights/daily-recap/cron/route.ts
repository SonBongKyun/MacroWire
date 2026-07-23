import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { dailyRecap } from "@/lib/ai/claude";
import { authorizeCron } from "@/lib/security/cron";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const HIGH_SIGNAL_SOURCES = [
  "Federal Reserve",
  "ECB Press",
  "Bloomberg Markets",
  "Financial Times",
  "WSJ Markets",
  "연합뉴스 경제",
  "연합뉴스 속보",
  "한국경제 경제",
  "매일경제 경제",
  "서울경제 경제",
  "CNBC Top News",
  "CNBC Economy",
];

/**
 * Daily-recap cron. Vercel hits this once a day (vercel.json schedule).
 * Builds both ko + en recaps so SEO landing pages have content ready.
 */
export async function GET(req: NextRequest) {
  const denied = authorizeCron(req);
  if (denied) return denied;

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const all = await prisma.article.findMany({
    where: { publishedAt: { gte: since } },
    orderBy: { publishedAt: "desc" },
    take: 200,
  });

  if (all.length === 0) {
    return NextResponse.json({ skipped: true, reason: "no articles in window" });
  }

  const ranked = all.sort((a, b) => {
    const ai = HIGH_SIGNAL_SOURCES.indexOf(a.sourceName);
    const bi = HIGH_SIGNAL_SOURCES.indexOf(b.sourceName);
    const aRank = ai === -1 ? 999 : ai;
    const bRank = bi === -1 ? 999 : bi;
    if (aRank !== bRank) return aRank - bRank;
    return b.publishedAt.getTime() - a.publishedAt.getTime();
  });

  const seen = new Set<string>();
  const articles: typeof all = [];
  for (const a of ranked) {
    const key = a.title.replace(/\s+/g, " ").slice(0, 40);
    if (seen.has(key)) continue;
    seen.add(key);
    articles.push(a);
    if (articles.length >= 40) break;
  }

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  const results: Record<string, unknown> = {};

  for (const locale of ["ko", "en"] as const) {
    try {
      const payload = await dailyRecap(
        articles.map((a) => ({
          id: a.id,
          title: a.title,
          summary: a.summary,
          sourceName: a.sourceName,
          publishedAt: a.publishedAt,
          url: a.url,
        })),
        { tier: "PRO", locale }
      );
      const topStories = payload.topStories
        .map((s) => {
          const a = articles[s.articleIndex - 1] ?? articles[s.articleIndex];
          if (!a) return null;
          return {
            articleId: a.id,
            title: a.title,
            url: a.url,
            sourceName: a.sourceName,
            why: s.why,
            tradeImplication: s.tradeImplication,
          };
        })
        .filter(Boolean);
      await prisma.dailyRecap.upsert({
        where: { date_locale: { date: today, locale } },
        update: {
          headline: payload.headline,
          summary: payload.themes.join(", "),
          topStories: topStories as never,
        },
        create: {
          date: today,
          locale,
          headline: payload.headline,
          summary: payload.themes.join(", "),
          topStories: topStories as never,
        },
      });
      results[locale] = { ok: true, stories: topStories.length };
    } catch (err) {
      console.error(`[cron daily-recap ${locale}]`, err);
      results[locale] = { ok: false, error: String(err) };
    }
  }

  return NextResponse.json({ date: today, results });
}
