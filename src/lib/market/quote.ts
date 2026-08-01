/**
 * Single source of truth for market quotes.
 *
 * Both /api/market (ticker + dashboard strip) and /api/portfolio (watchlist
 * rows) used to call Yahoo separately and derive the daily change themselves.
 * They disagreed: /api/portfolio asked for a 5-day range and read
 * `meta.chartPreviousClose`, which for a 5d window is the close *before the
 * window* — a 5-day change presented as a daily one. KOSPI showed -1.23% in
 * the ticker and -21.18% in the dashboard on the same screen.
 *
 * The fix is to always anchor the change on `meta.previousClose` (the prior
 * regular session close) and to share one fetch path.
 */

export interface Quote {
  symbol: string;
  label: string;
  price: number;
  previousClose: number;
  change: number;
  changePct: number;
  /** Real intraday closes for the current session — never synthesised. */
  sparkline: number[];
  /** Last regular-market tick, ISO. Null when Yahoo omits it. */
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

const MAX_SPARKLINE_POINTS = 48;

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
  interval: string
): Promise<YahooResult | null> {
  try {
    const url =
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
      `?range=${range}&interval=${interval}`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.chart?.result?.[0] ?? null;
  } catch {
    return null;
  }
}

function extractCloses(result: YahooResult | null): number[] {
  const raw = result?.indicators?.quote?.[0]?.close ?? [];
  return raw
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v))
    .slice(-MAX_SPARKLINE_POINTS)
    .map((v) => Number(v.toFixed(4)));
}

/**
 * One quote, with the daily change anchored on the prior session close and a
 * sparkline built from real intraday prints.
 */
export async function fetchQuote(symbol: string): Promise<Quote | null> {
  const intraday = await requestChart(symbol, "1d", "5m");
  if (!intraday?.meta) return null;

  const meta = intraday.meta;
  const price = meta.regularMarketPrice ?? 0;
  if (!price) return null;

  // previousClose is the prior *session* close regardless of the chart range;
  // chartPreviousClose moves with the range and is only a safe fallback here
  // because this request is always a 1-day window.
  const previousClose = meta.previousClose ?? meta.chartPreviousClose ?? price;
  const change = price - previousClose;
  const changePct = previousClose ? (change / previousClose) * 100 : 0;

  let sparkline = extractCloses(intraday);
  if (sparkline.length < 2) {
    // Thin session (holiday, pre-open, illiquid symbol) — widen the window so
    // the card still draws a real line instead of a flat stub.
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

/** Fetch many symbols in parallel, preserving the caller's display order. */
export async function fetchQuotes(symbols: string[]): Promise<Quote[]> {
  const settled = await Promise.allSettled(symbols.map(fetchQuote));
  const bySymbol = new Map<string, Quote>();
  for (const entry of settled) {
    if (entry.status === "fulfilled" && entry.value) {
      bySymbol.set(entry.value.symbol, entry.value);
    }
  }
  return symbols
    .map((symbol) => bySymbol.get(symbol))
    .filter((quote): quote is Quote => Boolean(quote));
}
