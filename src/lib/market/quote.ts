/**
 * Single source of truth for market quotes.
 * Both /api/market and /api/portfolio use this path so daily-change math,
 * outbound limits, and failure behavior stay identical.
 */

export interface Quote {
  symbol: string;
  label: string;
  price: number;
  previousClose: number;
  change: number;
  changePct: number;
  sparkline: number[];
  asOf: string | null;
  currency: string | null;
}

export const SYMBOL_LABELS: Record<string, string> = {
  "005930.KS": "삼성전자",
  "000660.KS": "SK하이닉스",
  "BTC-USD": "Bitcoin",
  "ETH-USD": "Ethereum",
  "GC=F": "Gold",
  "SI=F": "Silver",
  "CL=F": "WTI",
  "^KS11": "KOSPI",
  "^KQ11": "KOSDAQ",
  "^GSPC": "S&P 500",
  "^IXIC": "NASDAQ",
  "^DJI": "Dow Jones",
  "^N225": "Nikkei 225",
  "^TNX": "US 10Y",
  "^FVX": "US 5Y",
  "^IRX": "US 13W",
  "^VIX": "VIX",
  "DX-Y.NYB": "Dollar Index",
  "USDKRW=X": "USD/KRW",
  "EURUSD=X": "EUR/USD",
  "JPYKRW=X": "JPY/KRW",
};

export const MAX_QUOTE_SYMBOLS = 24;
const MAX_SYMBOL_LENGTH = 32;
const QUOTE_REQUEST_TIMEOUT_MS = 8_000;
const QUOTE_FETCH_CONCURRENCY = 6;
const MAX_SPARKLINE_POINTS = 48;
const VALID_SYMBOL = /^[A-Za-z0-9^=._-]+$/;

export function isValidQuoteSymbol(symbol: string): boolean {
  const value = symbol.trim();
  return value.length > 0 && value.length <= MAX_SYMBOL_LENGTH && VALID_SYMBOL.test(value);
}

export function normalizeQuoteSymbols(symbols: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const raw of symbols) {
    const symbol = raw.trim();
    if (!symbol || seen.has(symbol)) continue;
    seen.add(symbol);
    normalized.push(symbol);
  }
  return normalized;
}

interface YahooMeta {
  regularMarketPrice?: number;
  previousClose?: number;
  chartPreviousClose?: number;
  regularMarketTime?: number;
  currency?: string;
  shortName?: string;
}

interface YahooResult {
  meta?: YahooMeta;
  indicators?: { quote?: Array<{ close?: Array<number | null> }> };
}

async function requestChart(
  symbol: string,
  range: string,
  interval: string,
): Promise<YahooResult | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), QUOTE_REQUEST_TIMEOUT_MS);
  try {
    const url =
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
      `?range=${range}&interval=${interval}`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.chart?.result?.[0] ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function extractCloses(result: YahooResult | null): number[] {
  const raw = result?.indicators?.quote?.[0]?.close ?? [];
  return raw
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v))
    .slice(-MAX_SPARKLINE_POINTS)
    .map((v) => Number(v.toFixed(4)));
}

export async function fetchQuote(symbol: string): Promise<Quote | null> {
  if (!isValidQuoteSymbol(symbol)) return null;

  const intraday = await requestChart(symbol, "1d", "5m");
  if (!intraday?.meta) return null;

  const meta = intraday.meta;
  const price = meta.regularMarketPrice ?? 0;
  if (!price) return null;

  const previousClose = meta.previousClose ?? meta.chartPreviousClose ?? price;
  const change = price - previousClose;
  const changePct = previousClose ? (change / previousClose) * 100 : 0;

  let sparkline = extractCloses(intraday);
  if (sparkline.length < 2) {
    sparkline = extractCloses(await requestChart(symbol, "5d", "1h"));
  }

  return {
    symbol,
    label: SYMBOL_LABELS[symbol] || meta.shortName || symbol,
    price,
    previousClose,
    change,
    changePct,
    sparkline,
    asOf: meta.regularMarketTime
      ? new Date(meta.regularMarketTime * 1000).toISOString()
      : null,
    currency: meta.currency ?? null,
  };
}

/**
 * Fetch many symbols with bounded concurrency. A public portfolio request can
 * no longer turn into an unbounded Promise.all burst against Yahoo/Vercel.
 */
export async function fetchQuotes(symbols: string[]): Promise<Quote[]> {
  const unique = normalizeQuoteSymbols(symbols).filter(isValidQuoteSymbol);
  if (unique.length === 0) return [];

  const bySymbol = new Map<string, Quote>();
  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(QUOTE_FETCH_CONCURRENCY, unique.length) },
    async () => {
      while (cursor < unique.length) {
        const symbol = unique[cursor++];
        try {
          const quote = await fetchQuote(symbol);
          if (quote) bySymbol.set(symbol, quote);
        } catch {
          // One provider/symbol failure must not fail the batch.
        }
      }
    },
  );

  await Promise.all(workers);
  return unique
    .map((symbol) => bySymbol.get(symbol))
    .filter((quote): quote is Quote => Boolean(quote));
}
