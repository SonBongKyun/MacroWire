import { NextRequest, NextResponse } from "next/server";
import {
  fetchQuotes,
  isValidQuoteSymbol,
  MAX_QUOTE_SYMBOLS,
  normalizeQuoteSymbols,
  type Quote,
} from "@/lib/market/quote";

let cache: { data: Quote[]; symbols: string; ts: number } | null = null;
const CACHE_TTL = 3 * 60 * 1000;
const MAX_SYMBOL_PARAM_LENGTH = 1_024;

export async function GET(req: NextRequest) {
  const symbolsParam = req.nextUrl.searchParams.get("symbols") || "";
  if (symbolsParam.length > MAX_SYMBOL_PARAM_LENGTH) {
    return NextResponse.json({ error: "Symbol query is too long" }, { status: 400 });
  }

  const rawSymbols = symbolsParam.split(",").map((value) => value.trim()).filter(Boolean);
  if (rawSymbols.length > MAX_QUOTE_SYMBOLS) {
    return NextResponse.json(
      { error: `Too many symbols; maximum is ${MAX_QUOTE_SYMBOLS}` },
      { status: 400 },
    );
  }

  const invalid = rawSymbols.filter((symbol) => !isValidQuoteSymbol(symbol));
  if (invalid.length > 0) {
    return NextResponse.json(
      { error: "Invalid symbol", symbols: invalid.slice(0, 5) },
      { status: 400 },
    );
  }

  const symbols = normalizeQuoteSymbols(rawSymbols);
  if (symbols.length === 0) return NextResponse.json([]);

  // Keep ordering in the cache key so a cached response preserves the caller's
  // requested display order.
  const cacheKey = symbols.join(",");
  if (cache && cache.symbols === cacheKey && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  const quotes = await fetchQuotes(symbols);
  if (quotes.length > 0) cache = { data: quotes, symbols: cacheKey, ts: Date.now() };

  return NextResponse.json(quotes);
}
