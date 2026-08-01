import { NextResponse } from "next/server";
import { fetchQuotes, type Quote } from "@/lib/market/quote";

let cache: { data: Quote[]; ts: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 min

const SYMBOLS = ["USDKRW=X", "^KS11", "^GSPC", "CL=F"];

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  const quotes = await fetchQuotes(SYMBOLS);
  if (quotes.length > 0) {
    cache = { data: quotes, ts: Date.now() };
  }

  return NextResponse.json(quotes);
}
