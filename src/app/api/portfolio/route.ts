import { NextRequest, NextResponse } from "next/server";

interface PriceResult {
  symbol: string;
  label: string;
  price: number;
  change: number;
  changePct: number;
  sparkline: number[];
}

let cache: { data: PriceResult[]; symbols: string; ts: number } | null = null;
const CACHE_TTL = 3 * 60 * 1000; // 3 min

const LABEL_MAP: Record<string, string> = {
  "005930.KS": "삼성전자",
  "000660.KS": "SK하이닉스",
  "BTC-USD": "Bitcoin",
  "ETH-USD": "Ethereum",
  "GC=F": "Gold",
  "SI=F": "Silver",
  "CL=F": "WTI",
  "^KS11": "KOSPI",
  "^GSPC": "S&P 500",
  "^IXIC": "NASDAQ",
  "^DJI": "Dow Jones",
  "USDKRW=X": "USD/KRW",
  "EURUSD=X": "EUR/USD",
  "JPYKRW=X": "JPY/KRW",
};

async function fetchSymbol(symbol: string): Promise<PriceResult | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1h`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta;
    const price = meta.regularMarketPrice ?? 0;
    const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
    const change = price - prevClose;
    const changePct = prevClose ? (change / prevClose) * 100 : 0;

    // Extract sparkline from close prices
    const closes: number[] = result.indicators?.quote?.[0]?.close ?? [];
    const sparkline = closes
      .filter((v: number | null) => v !== null && v !== undefined)
      .slice(-24)
      .map((v: number) => Number(v.toFixed(2)));

    return {
      symbol,
      label: LABEL_MAP[symbol] || meta.shortName || symbol,
      price,
      change,
      changePct,
      sparkline,
    };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const symbolsParam = req.nextUrl.searchParams.get("symbols") || "";
  const symbols = symbolsParam.split(",").filter(Boolean);

  if (symbols.length === 0) {
    return NextResponse.json([]);
  }

  const cacheKey = symbols.sort().join(",");
  if (cache && cache.symbols === cacheKey && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  const results: PriceResult[] = [];
  await Promise.allSettled(
    symbols.map(async (sym) => {
      const data = await fetchSymbol(sym);
      if (data) results.push(data);
    })
  );

  const ordered = symbols
    .map((s) => results.find((r) => r.symbol === s))
    .filter(Boolean) as PriceResult[];

  if (ordered.length > 0) {
    cache = { data: ordered, symbols: cacheKey, ts: Date.now() };
  }

  return NextResponse.json(ordered);
}
