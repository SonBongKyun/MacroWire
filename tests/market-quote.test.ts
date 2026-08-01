import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { fetchQuote, fetchQuotes } from "../src/lib/market/quote";

type ChartStub = {
  previousClose?: number;
  chartPreviousClose?: number;
  regularMarketPrice: number;
  closes?: Array<number | null>;
  regularMarketTime?: number;
  currency?: string;
};

const realFetch = globalThis.fetch;

function stubYahoo(byUrl: (url: string) => ChartStub | null) {
  globalThis.fetch = (async (input: unknown) => {
    const url = String(input);
    const stub = byUrl(url);
    if (!stub) return { ok: false, json: async () => ({}) } as Response;
    return {
      ok: true,
      json: async () => ({
        chart: {
          result: [
            {
              meta: {
                regularMarketPrice: stub.regularMarketPrice,
                previousClose: stub.previousClose,
                chartPreviousClose: stub.chartPreviousClose,
                regularMarketTime: stub.regularMarketTime,
                currency: stub.currency,
              },
              indicators: { quote: [{ close: stub.closes ?? [] }] },
            },
          ],
        },
      }),
    } as Response;
  }) as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = realFetch;
});

test("anchors the daily change on previousClose, not the range-relative chartPreviousClose", async () => {
  // Shape taken from a real ^KS11 response: over a 5d window Yahoo reports a
  // chartPreviousClose from five sessions back, which used to be presented as
  // a daily change (-21%) next to the ticker's correct -1.2%.
  stubYahoo(() => ({
    regularMarketPrice: 5593.56,
    previousClose: 5663.24,
    chartPreviousClose: 7096.89,
    closes: [5598.13, 5707.18, 5609.33, 5593.56],
  }));

  const quote = await fetchQuote("^KS11");
  assert.ok(quote);
  assert.equal(quote.previousClose, 5663.24);
  assert.ok(Math.abs(quote.changePct - -1.2303910835) < 1e-6, `got ${quote.changePct}`);
  assert.ok(Math.abs(quote.change - -69.68) < 1e-6);
});

test("falls back to chartPreviousClose only when previousClose is absent", async () => {
  stubYahoo(() => ({ regularMarketPrice: 100, chartPreviousClose: 80, closes: [90, 100] }));

  const quote = await fetchQuote("TEST");
  assert.ok(quote);
  assert.equal(quote.previousClose, 80);
  assert.equal(quote.changePct, 25);
});

test("returns the real intraday closes as the sparkline", async () => {
  stubYahoo(() => ({
    regularMarketPrice: 102,
    previousClose: 100,
    closes: [100, null, 101.5, 102],
  }));

  const quote = await fetchQuote("TEST");
  assert.ok(quote);
  assert.deepEqual(quote.sparkline, [100, 101.5, 102]);
});

test("widens the window when the 1d session has too few prints to draw", async () => {
  stubYahoo((url) =>
    url.includes("range=1d")
      ? { regularMarketPrice: 50, previousClose: 49, closes: [50] }
      : { regularMarketPrice: 50, previousClose: 49, closes: [47, 48, 49, 50] }
  );

  const quote = await fetchQuote("THIN");
  assert.ok(quote);
  assert.deepEqual(quote.sparkline, [47, 48, 49, 50]);
  // The widened window must not leak into the change — it stays a daily move.
  assert.equal(quote.previousClose, 49);
});

test("drops unusable symbols and preserves the caller's display order", async () => {
  stubYahoo((url) => {
    if (url.includes("BAD")) return null;
    if (url.includes("ZERO")) return { regularMarketPrice: 0, previousClose: 10 };
    return { regularMarketPrice: 10, previousClose: 8, closes: [9, 10] };
  });

  const quotes = await fetchQuotes(["ONE", "BAD", "TWO", "ZERO", "THREE"]);
  assert.deepEqual(
    quotes.map((q) => q.symbol),
    ["ONE", "TWO", "THREE"]
  );
});

test("exposes the quote timestamp so surfaces can label their as-of time", async () => {
  stubYahoo(() => ({
    regularMarketPrice: 10,
    previousClose: 10,
    regularMarketTime: 1785402340,
    currency: "KRW",
    closes: [10, 10],
  }));

  const quote = await fetchQuote("TEST");
  assert.ok(quote);
  assert.equal(quote.asOf, new Date(1785402340 * 1000).toISOString());
  assert.equal(quote.currency, "KRW");
  assert.equal(quote.changePct, 0);
});
