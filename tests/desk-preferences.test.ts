import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_PORTFOLIO_ASSETS,
  normalizePortfolioAsset,
  normalizeWatchlistKeyword,
  parsePortfolioStore,
  parseWatchlistStore,
} from "../src/lib/personalization/deskPreferences";

test("watchlist normalization bounds and deduplicates persisted keywords", () => {
  assert.equal(normalizeWatchlistKeyword("  fed   rates  "), "fed rates");
  assert.equal(normalizeWatchlistKeyword(""), null);
  assert.deepEqual(parseWatchlistStore({
    items: [
      { keyword: "Fed", createdAt: "a" },
      { keyword: "Fed", createdAt: "b" },
      { keyword: "  CPI  ", createdAt: "c" },
      { keyword: 42 },
    ],
  }), {
    items: [
      { keyword: "Fed", createdAt: "a" },
      { keyword: "CPI", createdAt: "c" },
    ],
  });
});

test("missing portfolio receives defaults while an explicitly empty portfolio stays empty", () => {
  assert.equal(parsePortfolioStore(null).assets.length, DEFAULT_PORTFOLIO_ASSETS.length);
  assert.deepEqual(parsePortfolioStore({ assets: [] }), { assets: [] });
});

test("portfolio parser accepts the legacy name field and removes duplicate symbols", () => {
  const parsed = parsePortfolioStore({
    assets: [
      { symbol: "BTC-USD", name: "Bitcoin", type: "crypto", addedAt: "a" },
      { symbol: "BTC-USD", label: "Duplicate", type: "crypto", addedAt: "b" },
      { symbol: "^GSPC", label: "S&P 500", type: "index", addedAt: "c" },
    ],
  });
  assert.deepEqual(parsed.assets.map((asset) => asset.symbol), ["BTC-USD", "^GSPC"]);
  assert.equal(parsed.assets[0]?.label, "Bitcoin");
});

test("portfolio input schema rejects unsupported types and oversized labels", () => {
  assert.deepEqual(normalizePortfolioAsset({ symbol: "GC=F", label: "Gold", type: "commodity" }), {
    symbol: "GC=F",
    label: "Gold",
    type: "commodity",
  });
  assert.equal(normalizePortfolioAsset({ symbol: "GC=F", label: "Gold", type: "option" }), null);
  assert.equal(normalizePortfolioAsset({ symbol: "GC=F", label: "x".repeat(81), type: "commodity" }), null);
});
