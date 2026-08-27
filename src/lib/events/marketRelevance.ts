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
  "증시",
  "지정학",
]);

const EXPLICIT_COMMODITY_MARKET = /\b(gold|silver|copper|nickel|aluminum|wheat|corn|soybeans?|commodit(?:y|ies)|bullion)\b|금 가격|금 시세|금 선물|은 가격|은 시세|구리 가격|니켈 가격|알루미늄 가격|곡물 가격|밀 가격|옥수수 가격|대두 가격|원자재 (?:가격|시장|선물)|금값.{0,12}(?:상승|하락|급등|급락|최고|최저|신고가|온스|달러)/i;

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

  // "원자재" can be produced by metaphorical phrases such as "금값 된
  // 해산물". Require an actual traded-commodity/price context before a
  // commodity-only story enters the desk.
  if (input.tags.includes("원자재") && EXPLICIT_COMMODITY_MARKET.test(text)) return true;

  // "경기" alone is ambiguous with sports. Only accept it with unmistakable
  // economic-cycle context.
  if (/(?:경제|성장|침체|회복|둔화|부진|호황|불황|소비|고용|실업|gdp|pmi).{0,16}경기|경기.{0,16}(?:경제|성장|침체|회복|둔화|부진|호황|불황|소비|고용|실업|gdp|pmi)/i.test(text)) {
    return true;
  }

  return /\b(central bank|monetary policy|fiscal|inflation|recession|payrolls?|unemployment|tariffs?|trade war|sanctions?|geopolitics?|treasury|bonds?|yields?|commodit(?:y|ies)|semiconductor|stock market|equities|forex|currency)\b|중앙은행|통화정책|재정정책|인플레이션|경기침체|고용보고서|실업률|관세|무역전쟁|제재|지정학|국채|채권|수익률|반도체|주식시장|외환시장/.test(text);
}
