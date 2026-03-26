import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

const SOURCES = [
  // --- Korean Breaking News / Macro ---
  { name: "연합뉴스 속보", feedUrl: "https://www.yna.co.kr/rss/news.xml", category: "속보" },
  { name: "뉴스핌 속보", feedUrl: "https://www.newspim.com/rss/breaking.xml", category: "속보" },
  { name: "이데일리 경제", feedUrl: "https://www.edaily.co.kr/rss/economy.xml", category: "경제" },
  { name: "머니투데이", feedUrl: "https://rss.mt.co.kr/mt/mtview/mt_all/rss.xml", category: "경제" },
  { name: "매일경제 증권", feedUrl: "https://www.mk.co.kr/rss/30100041/", category: "증권" },
  { name: "한국경제 국제", feedUrl: "https://www.hankyung.com/feed/international", category: "국제" },
  { name: "조선비즈", feedUrl: "https://biz.chosun.com/rss/all.xml", category: "경제" },
  { name: "서울경제 금융", feedUrl: "https://www.sedaily.com/RSS/Finance", category: "금융" },

  // --- Global Macro / Markets ---
  { name: "CNBC Top News", feedUrl: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114", category: "글로벌" },
  { name: "CNBC Economy", feedUrl: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=20910258", category: "글로벌" },
  { name: "MarketWatch Top", feedUrl: "https://feeds.content.dowjones.io/public/rss/mw_topstories", category: "글로벌" },
  { name: "MarketWatch Markets", feedUrl: "https://feeds.content.dowjones.io/public/rss/mw_marketpulse", category: "글로벌" },
  { name: "Financial Times", feedUrl: "https://www.ft.com/rss/home", category: "글로벌" },
  { name: "WSJ Markets", feedUrl: "https://feeds.content.dowjones.io/public/rss/WSJcomUSBusiness", category: "글로벌" },
  { name: "Bloomberg Markets", feedUrl: "https://feeds.bloomberg.com/markets/news.rss", category: "글로벌" },
  { name: "Reuters World", feedUrl: "https://www.reutersagency.com/feed/?taxonomy=best-sectors&post_type=best", category: "글로벌" },

  // --- Crypto / FX ---
  { name: "CoinDesk", feedUrl: "https://www.coindesk.com/arc/outboundfeeds/rss/", category: "크립토" },
  { name: "코인텔레그래프 KR", feedUrl: "https://kr.cointelegraph.com/rss", category: "크립토" },

  // --- Central Banks / Policy ---
  { name: "한국은행 보도자료", feedUrl: "https://www.bok.or.kr/portal/bbs/B0000245/rss.do", category: "정책" },
  { name: "Fed Reserve News", feedUrl: "https://www.federalreserve.gov/feeds/press_all.xml", category: "정책" },
] as const;

export async function POST() {
  try {
    let added = 0;
    let skipped = 0;

    for (const src of SOURCES) {
      const existing = await prisma.source.findUnique({
        where: { feedUrl: src.feedUrl },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await prisma.source.create({
        data: {
          name: src.name,
          feedUrl: src.feedUrl,
          category: src.category,
          enabled: true,
        },
      });
      added++;
    }

    return NextResponse.json({ added, skipped });
  } catch (err) {
    console.error("[api/sources/seed] error:", err);
    return NextResponse.json(
      { error: "Failed to seed sources" },
      { status: 500 }
    );
  }
}
