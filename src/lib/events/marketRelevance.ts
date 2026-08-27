export interface MarketRelevanceInput {
  title: string;
  tags: string[];
  marketChannels: string[];
}

const DIRECT_MARKET_TAGS = new Set([
  "금리",
  "물가",
  "연준",
  "환율",
  "수출입",
  "부동산",
  "가계부채",
  "재정",
  "에너지",
  "반도체",
  "원자재",
  "증시",
  "지정학",
]);

/**
 * The raw wire intentionally stores broad source output. The event desk is
 * stricter: a story must have an explicit market transmission channel or a
 * macro/market topic. This prevents weather, sports and general local news
 * from surfacing merely because a fast T1 source and freshness bonuses give
 * them a respectable score.
 */
export function isMarketRelevantEvent(input: MarketRelevanceInput): boolean {
  if (input.marketChannels.length > 0) return true;
  if (input.tags.some((tag) => DIRECT_MARKET_TAGS.has(tag))) return true;

  const text = `${input.title} ${input.tags.join(" ")}`.toLowerCase();

  // "경기" alone is ambiguous with sports. Only accept it with unmistakable
  // economic-cycle context.
  if (/(?:경제|성장|침체|회복|둔화|부진|호황|불황|소비|고용|실업|gdp|pmi).{0,16}경기|경기.{0,16}(?:경제|성장|침체|회복|둔화|부진|호황|불황|소비|고용|실업|gdp|pmi)/i.test(text)) {
    return true;
  }

  return /\b(central bank|monetary policy|fiscal|inflation|recession|payrolls?|unemployment|tariffs?|trade war|sanctions?|geopolitics?|treasury|bonds?|yields?|commodit(?:y|ies)|semiconductor|stock market|equities|forex|currency)\b|중앙은행|통화정책|재정정책|인플레이션|경기침체|고용보고서|실업률|관세|무역전쟁|제재|지정학|국채|채권|수익률|원자재|반도체|주식시장|외환시장/.test(text);
}
