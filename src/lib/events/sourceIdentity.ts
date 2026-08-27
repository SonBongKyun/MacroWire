const SOURCE_FAMILIES: Array<[RegExp, string]> = [
  [/^연합뉴스(?:\s|$)|\byonhap\b/i, "연합뉴스"],
  [/^bloomberg(?:\s|$)|\bbloomberg\b/i, "Bloomberg"],
  [/^cnbc(?:\s|$)|\bcnbc\b/i, "CNBC"],
  [/\breuters\b/i, "Reuters"],
  [/^financial times(?:\s|$)|^ft(?:\s|$)/i, "Financial Times"],
  [/^wall street journal(?:\s|$)|^wsj(?:\s|$)/i, "Wall Street Journal"],
  [/^매일경제(?:\s|$)/i, "매일경제"],
  [/^한국경제(?:\s|$)/i, "한국경제"],
  [/^coindesk(?:\s|$)/i, "CoinDesk"],
  [/^federal reserve(?:\s|$)/i, "Federal Reserve"],
  [/^bank of korea(?:\s|$)|^한국은행(?:\s|$)/i, "Bank of Korea"],
  [/^european central bank(?:\s|$)|^ecb(?:\s|$)/i, "ECB"],
  [/^bank of japan(?:\s|$)|^boj(?:\s|$)/i, "Bank of Japan"],
];

/**
 * Source rows represent feeds, not necessarily independent publishers. Event
 * confirmation must count publisher families rather than RSS endpoints, or a
 * breaking feed plus an economy feed from the same newsroom will inflate the
 * apparent corroboration strength.
 */
export function canonicalSourceName(sourceName: string): string {
  const clean = sourceName.replace(/\s+/g, " ").trim();
  for (const [pattern, canonical] of SOURCE_FAMILIES) {
    if (pattern.test(clean)) return canonical;
  }
  return clean;
}
