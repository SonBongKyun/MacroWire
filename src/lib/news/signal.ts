import type { Article } from "../../types";

export type SignalTier = "critical" | "important" | "general";

export interface ArticleSignal {
  score: number;
  tier: SignalTier;
  reasons: string[];
  isBreaking: boolean;
}

type SignalArticle = Pick<Article, "title" | "summary" | "tags" | "sourceName"> &
  Partial<Pick<Article, "sourceTier" | "importanceScore" | "importanceTier">>;

const TAG_SIGNALS: Record<
  string,
  { weight: number; reason: string; evidence: boolean }
> = {
  금리: { weight: 24, reason: "통화정책", evidence: true },
  연준: { weight: 24, reason: "통화정책", evidence: true },
  물가: { weight: 22, reason: "물가", evidence: true },
  환율: { weight: 22, reason: "외환시장", evidence: true },
  수출입: { weight: 18, reason: "무역", evidence: true },
  // Broad tags help rank an article after concrete evidence is found, but do
  // not promote political rhetoric or incidental property stories by
  // themselves. Specific fiscal and housing phrases are handled below.
  재정: { weight: 18, reason: "재정정책", evidence: false },
  에너지: { weight: 17, reason: "원자재", evidence: true },
  원자재: { weight: 16, reason: "원자재", evidence: true },
  가계부채: { weight: 20, reason: "금융안정", evidence: true },
  부동산: { weight: 10, reason: "부동산", evidence: false },
  경기: { weight: 8, reason: "경기", evidence: false },
  // Equity moves are colour, not a macro cause on their own — weighted low and
  // deliberately not counted as evidence, so "증시 급락" alone stays general
  // while "금리 급등에 증시 급락" is promoted by the rates signal.
  증시: { weight: 7, reason: "시장", evidence: false },
  반도체: { weight: 12, reason: "산업", evidence: false },
  AI: { weight: 6, reason: "산업", evidence: false },
  지정학: { weight: 10, reason: "지정학", evidence: false },
};

const TEXT_SIGNALS: Array<{ pattern: RegExp; weight: number; reason: string }> = [
  {
    pattern: /(기준금리|금리\s*(인상|인하|동결)|통화정책|federal reserve|\bfed\b|fomc|ecb|central bank|interest rates?)/i,
    weight: 38,
    reason: "통화정책",
  },
  {
    pattern: /(소비자물가|생산자물가|인플레이션|디플레이션|\bcpi\b|\bppi\b|inflation|deflation)/i,
    weight: 35,
    reason: "물가",
  },
  {
    pattern: /(원[·\-\/]?달러|달러[·\-\/]?원|환율|외환|국채|채권금리|수익률곡선|treasur|bond yield|currency|forex)/i,
    weight: 34,
    reason: "금융시장",
  },
  {
    pattern: /(국내총생산|\bgdp\b|경기침체|경기회복|고용지표|실업률|비농업|소매판매|산업생산|pmi|recession|payrolls?)/i,
    weight: 31,
    reason: "경기지표",
  },
  {
    pattern: /(주택가격|집값|아파트값|주택시장|부동산시장|주택담보대출|모기지\s*금리|주택착공|주택판매|home prices?|housing market|mortgage rates?|housing starts?|home sales?)/i,
    weight: 28,
    reason: "주택시장",
  },
  {
    pattern: /(관세|무역수지|수출|수입|재정적자|국가채무|추경|예산안|tariff|trade (deficit|friction|war)|fiscal|government debt)/i,
    weight: 29,
    reason: "정책·무역",
  },
  {
    pattern: /(국제유가|원유|천연가스|opec|브렌트|wti|에너지\s*(가격|공급)|crude oil|natural gas)/i,
    weight: 28,
    reason: "원자재",
  },
  {
    pattern: /(금\s*값|금\s*가격|국제\s*금값|귀금속|은\s*값|구리\s*값|곡물\s*(가격|수급)|gold price|bullion|copper price)/i,
    weight: 24,
    reason: "원자재",
  },
  {
    pattern: /(반도체|파운드리|메모리칩|hbm|chip export|semiconductor|nvidia|tsmc)/i,
    weight: 26,
    reason: "반도체",
  },
  {
    pattern: /((제재|휴전|전쟁|분쟁|미사일|핵협상|sanction|ceasefire|war|conflict|missile).*(증시|주가|환율|유가|원유|에너지|공급망|수출|관세|해운|호르무즈|홍해|stocks?|market|currency|oil|energy|supply chain|export|tariff|shipping)|(증시|주가|환율|유가|원유|에너지|공급망|수출|관세|해운|호르무즈|홍해|stocks?|market|currency|oil|energy|supply chain|export|tariff|shipping).*(제재|휴전|전쟁|분쟁|미사일|핵협상|sanction|ceasefire|war|conflict|missile))/i,
    weight: 30,
    reason: "지정학·시장",
  },
  {
    pattern: /(전쟁\s*(선포|발발)|침공|대규모\s*(공습|공격)|핵실험|invasion|declares? war|war breaks? out|major attack|nuclear test)/i,
    weight: 34,
    reason: "지정학 급변",
  },
  {
    pattern: /((인공지능|artificial intelligence|\bAI\b).*(증시|주가|투자|시장|반도체|수출|규제|stocks?|market|chips?|export|regulation)|(stocks?|market|chips?|export|regulation).*(인공지능|artificial intelligence|\bAI\b))/i,
    weight: 28,
    reason: "AI 산업",
  },
  {
    pattern: /(증시|코스피|코스닥|나스닥|s&p\s*500|다우지수|실적\s*(발표|전망)|earnings|stock market)/i,
    weight: 16,
    reason: "시장",
  },
];

const NOISE_SIGNALS: Array<{ pattern: RegExp; penalty: number }> = [
  {
    pattern: /(야구|축구|농구|배구|골프|테니스|홈런|득점|선수|감독|프로리그|올림픽|월드컵|챔피언스리그|경기종료|우승컵)/i,
    penalty: 52,
  },
  {
    pattern: /(가수|배우|드라마|예능|영화제|음악방송|컴백|앨범|걸그룹|보이그룹|연예계|팬미팅|콘서트)/i,
    penalty: 52,
  },
  {
    pattern: /(입건|구속영장|흉기|실종|교통사고|화재\s*발생|부고|별세|장례식|자수|피의자|압수수색|마약|살인|경찰\s*(수사|출동))/i,
    penalty: 46,
  },
  {
    pattern: /(국민의힘|국힘|더불어민주당|민주당|여당|야당|대변인|원내대표).*(비판|촉구|사과|재검토|철회|규탄|논평|입장)|(republicans?|democrats?|opposition|ruling party).*(critic|urge|demand|call for|slam|apolog)/i,
    penalty: 22,
  },
];

function normalizeTag(tag: string): string {
  return tag.trim().replace(/^#/, "");
}

export function isBreakingArticle(article: SignalArticle): boolean {
  const hasExplicitMarker = (
    article.tags.some((tag) => normalizeTag(tag) === "속보") ||
    /속보|breaking/i.test(article.sourceName)
  );
  const storedImportance = article.importanceScore;

  // During ingest there is no stored importance yet, so the explicit marker is
  // carried into the importance pass. Once stored, weak stories from a fast
  // source stop presenting as BREAKING solely because of the feed they used.
  if (typeof storedImportance !== "number") return hasExplicitMarker;
  if (article.sourceTier === "T0" && storedImportance >= 70) return true;
  return hasExplicitMarker && storedImportance >= 38;
}

export function classifyArticleSignal(article: SignalArticle): ArticleSignal {
  const text = `${article.title} ${article.summary || ""}`;
  const reasonWeights = new Map<string, number>();
  let score = 4;
  let hasMacroEvidence = false;

  const addReason = (reason: string, weight: number) => {
    reasonWeights.set(reason, Math.max(reasonWeights.get(reason) || 0, weight));
  };

  for (const rawTag of article.tags) {
    const signal = TAG_SIGNALS[normalizeTag(rawTag)];
    if (!signal) continue;
    score += signal.weight;
    hasMacroEvidence ||= signal.evidence;
    addReason(signal.reason, signal.weight);
  }

  for (const signal of TEXT_SIGNALS) {
    if (!signal.pattern.test(text)) continue;
    score += signal.weight;
    hasMacroEvidence = true;
    addReason(signal.reason, signal.weight);
  }

  for (const noise of NOISE_SIGNALS) {
    if (noise.pattern.test(text)) score -= noise.penalty;
  }

  const isBreaking = isBreakingArticle(article);
  if (isBreaking) {
    score += hasMacroEvidence ? 8 : 2;
    if (hasMacroEvidence) addReason("속보", 8);
  }

  // A breaking label or regional tag alone is not enough to call an article a macro signal.
  if (!hasMacroEvidence) score = Math.min(score, 24);

  const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));
  const tier: SignalTier =
    normalizedScore >= 70
      ? "critical"
      : normalizedScore >= 38
        ? "important"
        : "general";

  const reasons = [...reasonWeights.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([reason]) => reason);

  return { score: normalizedScore, tier, reasons, isBreaking };
}

export function isMacroSignal(article: SignalArticle): boolean {
  return classifyArticleSignal(article).tier !== "general";
}
