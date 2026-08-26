export interface WatchlistItem {
  keyword: string;
  createdAt: string;
}

export interface WatchlistStore {
  items: WatchlistItem[];
}

export type PortfolioAssetType = "stock" | "crypto" | "fx" | "commodity" | "index";

export interface PortfolioAsset {
  symbol: string;
  label: string;
  type: PortfolioAssetType;
  addedAt: string;
}

export interface PortfolioStore {
  assets: PortfolioAsset[];
}

export const DEFAULT_PORTFOLIO_ASSETS: readonly PortfolioAsset[] = [
  { symbol: "005930.KS", label: "삼성전자", type: "stock", addedAt: "" },
  { symbol: "000660.KS", label: "SK하이닉스", type: "stock", addedAt: "" },
  { symbol: "BTC-USD", label: "Bitcoin", type: "crypto", addedAt: "" },
  { symbol: "GC=F", label: "Gold", type: "commodity", addedAt: "" },
  { symbol: "^KS11", label: "KOSPI", type: "index", addedAt: "" },
  { symbol: "^GSPC", label: "S&P 500", type: "index", addedAt: "" },
];

const PORTFOLIO_TYPES = new Set<PortfolioAssetType>([
  "stock",
  "crypto",
  "fx",
  "commodity",
  "index",
]);

export function normalizeWatchlistKeyword(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.replace(/\s+/g, " ").trim();
  return value.length > 0 && value.length <= 80 ? value : null;
}

export function parseWatchlistStore(value: unknown): WatchlistStore {
  if (!value || typeof value !== "object") return { items: [] };
  const items = (value as { items?: unknown }).items;
  if (!Array.isArray(items)) return { items: [] };

  const seen = new Set<string>();
  const parsed: WatchlistItem[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const keyword = normalizeWatchlistKeyword(record.keyword);
    if (!keyword || seen.has(keyword)) continue;
    seen.add(keyword);
    parsed.push({
      keyword,
      createdAt: typeof record.createdAt === "string" ? record.createdAt : "",
    });
  }
  return { items: parsed };
}

export function parsePortfolioStore(
  value: unknown,
  options: { defaultWhenMissing?: boolean } = {},
): PortfolioStore {
  if (!value || typeof value !== "object") {
    return options.defaultWhenMissing === false
      ? { assets: [] }
      : { assets: DEFAULT_PORTFOLIO_ASSETS.map((asset) => ({ ...asset })) };
  }
  const assets = (value as { assets?: unknown }).assets;
  if (!Array.isArray(assets)) return { assets: [] };

  const seen = new Set<string>();
  const parsed: PortfolioAsset[] = [];
  for (const item of assets) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const symbol = typeof record.symbol === "string" ? record.symbol.trim() : "";
    const rawLabel = typeof record.label === "string"
      ? record.label
      : typeof record.name === "string"
        ? record.name
        : symbol;
    const label = rawLabel.replace(/\s+/g, " ").trim().slice(0, 80);
    const type = record.type;
    if (
      !symbol
      || symbol.length > 32
      || !label
      || typeof type !== "string"
      || !PORTFOLIO_TYPES.has(type as PortfolioAssetType)
      || seen.has(symbol)
    ) continue;
    seen.add(symbol);
    parsed.push({
      symbol,
      label,
      type: type as PortfolioAssetType,
      addedAt: typeof record.addedAt === "string" ? record.addedAt : "",
    });
  }
  return { assets: parsed };
}

export function normalizePortfolioAsset(value: unknown): Omit<PortfolioAsset, "addedAt"> | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const symbol = typeof record.symbol === "string" ? record.symbol.trim() : "";
  const label = typeof record.label === "string"
    ? record.label.replace(/\s+/g, " ").trim()
    : "";
  const type = record.type;
  if (
    !symbol
    || symbol.length > 32
    || !label
    || label.length > 80
    || typeof type !== "string"
    || !PORTFOLIO_TYPES.has(type as PortfolioAssetType)
  ) return null;
  return { symbol, label, type: type as PortfolioAssetType };
}
