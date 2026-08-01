import { NextRequest, NextResponse } from "next/server";
import { fetchQuotes, type Quote } from "@/lib/market/quote";

let cache: { data: Quote[]; symbols: string; ts: number } | null = null;
const CACHE_TTL = 3 * 60 * 1000; // 3 min

export async function GET(req: NextRequest) {
  const symbolsParam = req.nextUrl.searchParams.get("symbols") || "";
  const symbols = symbolsParam.split(",").filter(Boolean);

  if (symbols.length === 0) {
    return NextResponse.json([]);
  }

  const cacheKey = [...symbols].sort().join(",");
  if (cache && cache.symbols === cacheKey && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  const quotes = await fetchQuotes(symbols);
  if (quotes.length > 0) {
    cache = { data: quotes, symbols: cacheKey, ts: Date.now() };
  }

  return NextResponse.json(quotes);
}
