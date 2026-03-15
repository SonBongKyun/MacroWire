import { NextResponse } from "next/server";

interface MarketItem {
  symbol: string;
  label: string;
  price: number;
  change: number;
  changePct: number;
}

let cache: { data: MarketItem[]; ts: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 min

const SYMBOLS = [
  { symbol: "USDKRW=X", label: "USD/KRW" },
  { symbol: "^KS11", label: "KOSPI" },
  { symbol: "^GSPC", label: "S&P 500" },
  { symbol: "CL=F", label: "WTI" },
];

async function fetchYahoo(
  symbol: string
): Promise<{ price: number; change: number; changePct: number } | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      symbol
    )}?range=1d&interval=1d`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta;
    const price = meta.regularMarketPrice ?? 0;
    const prevClose =
      meta.chartPreviousClose ?? meta.previousClose ?? price;
    const change = price - prevClose;
    const changePct = prevClose ? (change / prevClose) * 100 : 0;

    return { price, change, changePct };
  } catch {
    return null;
  }
}

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  const results: MarketItem[] = [];

  await Promise.allSettled(
    SYMBOLS.map(async ({ symbol, label }) => {
      const data = await fetchYahoo(symbol);
      if (data) results.push({ symbol, label, ...data });
    })
  );

  // Maintain display order
  const ordered = SYMBOLS.map((s) =>
    results.find((r) => r.symbol === s.symbol)
  ).filter(Boolean) as MarketItem[];

  if (ordered.length > 0) {
    cache = { data: ordered, ts: Date.now() };
  }

  return NextResponse.json(ordered);
}
