import { NextResponse } from "next/server";

interface ExchangeRates {
  base: string;
  rates: Record<string, number>;
  ts: number;
}

let cache: ExchangeRates | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 min

const SYMBOLS: { symbol: string; key: string; invert: boolean }[] = [
  { symbol: "USDKRW=X", key: "KRW", invert: false },
  { symbol: "EURUSD=X", key: "EUR", invert: true },
  { symbol: "USDJPY=X", key: "JPY", invert: false },
  { symbol: "USDCNY=X", key: "CNY", invert: false },
  { symbol: "GBPUSD=X", key: "GBP", invert: true },
];

async function fetchRate(symbol: string): Promise<number | null> {
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
    return result.meta.regularMarketPrice ?? null;
  } catch {
    return null;
  }
}

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache);
  }

  const rates: Record<string, number> = { USD: 1 };

  await Promise.allSettled(
    SYMBOLS.map(async ({ symbol, key, invert }) => {
      const price = await fetchRate(symbol);
      if (price != null) {
        // For pairs like EURUSD=X, price is EUR per USD inverted (actually USD per EUR)
        // invert=true means price is "X per 1 USD" needs to become "USD per X"
        rates[key] = invert ? +(1 / price).toFixed(6) : +price.toFixed(6);
      }
    })
  );

  // Fallback rates if API fails
  if (!rates.KRW) rates.KRW = 1385.5;
  if (!rates.EUR) rates.EUR = 0.92;
  if (!rates.JPY) rates.JPY = 149.2;
  if (!rates.CNY) rates.CNY = 7.24;
  if (!rates.GBP) rates.GBP = 0.79;

  const result: ExchangeRates = { base: "USD", rates, ts: Date.now() };
  cache = result;

  return NextResponse.json(result);
}
