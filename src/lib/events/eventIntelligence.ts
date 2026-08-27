import { extractKeywords, isStrongKeyword, keywordOverlap } from "@/lib/clustering/cluster";
import { canonicalSourceName } from "@/lib/events/sourceIdentity";

export type EventImportanceTier = "critical" | "major" | "general";
export type MarketImpactDirection = "up" | "down" | "mixed" | "watch";
export type MarketImpactChannel = "rates" | "fx" | "equities" | "energy" | "crypto" | "macro";
export type EventConfidence = "high" | "medium" | "low";
export type EventLifecycle = "flash" | "developing" | "confirmed" | "cooling";
export type EventUpdateKind = "initial" | "new_fact" | "confirmation" | "follow_up";

export interface EventArticleSignal {
  id?: string;
  title: string;
  sourceName: string;
  sourceTier?: "T0" | "T1" | "T2" | "T3";
  publishedAt: string | Date;
  importanceScore?: number;
  tags: string[];
  summary?: string | null;
  feedExcerpt?: string | null;
}

export interface EventSignal {
  title: string;
  tags: string[];
  regions?: string[];
  marketChannels?: string[];
  firstSeenAt?: string | Date;
  latestPublishedAt: string | Date;
  coverageCount: number;
  importanceScore: number;
  primarySourceName?: string | null;
  officialSourceName?: string | null;
}

export interface MarketImpact {
  channel: MarketImpactChannel;
  label: string;
  direction: MarketImpactDirection;
  score: number;
  rationale: string;
  confidence: EventConfidence;
}

export interface EventLatestUpdate {
  kind: EventUpdateKind;
  sourceName: string;
  sourceTier: "T0" | "T1" | "T2" | "T3" | null;
  publishedAt: string;
  headline: string;
  newFacts: string[];
  newAnchors: string[];
  summary: string;
}

export interface EventSourceTierCounts {
  T0: number;
  T1: number;
  T2: number;
  T3: number;
}

export interface EventIntelligence {
  deskScore: number;
  deskTier: EventImportanceTier;
  pulseScore: number;
  lifecycle: EventLifecycle;
  importanceReasons: string[];
  pulseReasons: string[];
  shortExplanation: string;
  whyNow: string;
  marketImpacts: MarketImpact[];
  confidence: EventConfidence;
  confirmationScore: number;
  sourceQualityScore: number;
  sourceTierCounts: EventSourceTierCounts;
  updatesLast15m: number;
  updatesLast60m: number;
  latestUpdate: EventLatestUpdate | null;
  distinctSources: number;
  evidenceCount: number;
}

const SOURCE_BOILERPLATE = /\s*[|—–-]\s*(reuters|bloomberg|cnbc|financial times|ft|wsj|yonhap|연합뉴스|한국경제).*$/i;

const ANCHOR_PATTERNS: Array<[string, RegExp]> = [
  ["fed", /\b(fed|federal reserve|fomc)\b|연준|미 연방준비제도/i],
  ["bok", /\b(bank of korea|bok)\b|한국은행|금통위/i],
  ["ecb", /\b(ecb|european central bank)\b|유럽중앙은행/i],
  ["boj", /\b(boj|bank of japan)\b|일본은행/i],
  ["pboc", /\b(pboc|people'?s bank of china)\b|중국인민은행/i],
  ["cpi", /\b(cpi|consumer price index)\b|소비자물가/i],
  ["pce", /\b(pce|personal consumption expenditures)\b|개인소비지출/i],
  ["payrolls", /\b(nonfarm payrolls?|payrolls?|nfp)\b|비농업 고용|고용보고서/i],
  ["gdp", /\b(gdp|gross domestic product)\b|국내총생산/i],
  ["nvidia", /\bnvidia\b|엔비디아/i],
  ["samsung", /\bsamsung\b|삼성전자/i],
  ["skhynix", /\bsk hynix\b|하이닉스/i],
  ["iran", /\biran\b|이란/i],
  ["israel", /\bisrael\b|이스라엘/i],
  ["hormuz", /\bhormuz\b|호르무즈/i],
  ["opec", /\bopec\+?\b|오펙/i],
  ["trump", /\btrump\b|트럼프/i],
  ["china", /\bchina\b|중국/i],
  ["korea", /\b(south korea|korea)\b|한국/i],
  ["japan", /\bjapan\b|일본/i],
  ["bitcoin", /\b(bitcoin|btc)\b|비트코인/i],
];

const ANCHOR_LABELS: Record<string, string> = {
  fed: "연준",
  bok: "한국은행",
  ecb: "ECB",
  boj: "BOJ",
  pboc: "PBOC",
  cpi: "CPI",
  pce: "PCE",
  payrolls: "고용보고서",
  gdp: "GDP",
  nvidia: "Nvidia",
  samsung: "Samsung",
  skhynix: "SK hynix",
  iran: "이란",
  israel: "이스라엘",
  hormuz: "호르무즈",
  opec: "OPEC",
  trump: "Trump",
  china: "중국",
  korea: "한국",
  japan: "일본",
  bitcoin: "Bitcoin",
};

const CHANNEL_LABELS: Record<MarketImpactChannel, string> = {
  rates: "RATES",
  fx: "FX",
  equities: "EQUITIES",
  energy: "ENERGY",
  crypto: "CRYPTO",
  macro: "MACRO",
};

const SOURCE_TIER_WEIGHT: Record<NonNullable<EventArticleSignal["sourceTier"]>, number> = {
  T0: 100,
  T1: 84,
  T2: 62,
  T3: 38,
};

const FACT_PATTERNS = [
  /\b\d+(?:\.\d+)?\s?(?:%|(?:bp|bps|basis points?)\b)/gi,
  /[$€£₩]\s?\d[\d,.]*(?:\s?(?:trillion|billion|million|tn|bn|mn))?/gi,
  /\b\d[\d,.]*(?:\.\d+)?\s?(?:trillion|billion|million|tn|bn|mn)\b/gi,
  /\b\d[\d,.]*(?:\.\d+)?\s?(?:조|억|만)?원\b/g,
];

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function safeTime(value: string | Date): number {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

export function normalizeEventHeadline(title: string): string {
  return title
    .replace(SOURCE_BOILERPLATE, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9가-힣%+\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractEventAnchors(title: string, tags: string[] = []): Set<string> {
  const haystack = `${title} ${tags.join(" ")}`;
  const anchors = new Set<string>();
  for (const [key, pattern] of ANCHOR_PATTERNS) {
    if (pattern.test(haystack)) anchors.add(key);
  }
  return anchors;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const item of a) if (b.has(item)) intersection += 1;
  return intersection / Math.max(1, new Set([...a, ...b]).size);
}

/**
 * Event V2 matching is conservative by design. A shared generic macro tag is
 * useful context but never enough to merge stories on its own.
 */
export function eventSimilarityV2(
  a: { title: string; tags: string[] },
  b: { title: string; tags: string[] },
): number {
  const normalizedA = normalizeEventHeadline(a.title);
  const normalizedB = normalizeEventHeadline(b.title);
  if (normalizedA && normalizedA === normalizedB) return 1;

  const tagsA = new Set(a.tags.map((tag) => tag.toLowerCase()));
  const tagsB = new Set(b.tags.map((tag) => tag.toLowerCase()));
  const sharedTags = [...tagsA].filter((tag) => tagsB.has(tag));
  if (sharedTags.length === 0) return 0;

  const anchorsA = extractEventAnchors(a.title, a.tags);
  const anchorsB = extractEventAnchors(b.title, b.tags);
  const sharedAnchors = [...anchorsA].filter((anchor) => anchorsB.has(anchor));

  const keywordsA = extractKeywords(normalizedA);
  const keywordsB = extractKeywords(normalizedB);
  const overlap = keywordOverlap(keywordsA, keywordsB);
  const sharedStrong = [...keywordsA].filter((word) => keywordsB.has(word) && isStrongKeyword(word));

  // If both headlines clearly name entities but none match, generic tags such
  // as "증시" or "금리" must not fuse unrelated stories.
  if (anchorsA.size > 0 && anchorsB.size > 0 && sharedAnchors.length === 0 && overlap < 3) return 0;
  if (sharedAnchors.length === 0 && (overlap < 2 || sharedStrong.length === 0)) return 0;

  const keywordScore = jaccard(keywordsA, keywordsB);
  const tagScore = sharedTags.length / Math.max(tagsA.size, tagsB.size, 1);
  const anchorScore = sharedAnchors.length > 0
    ? sharedAnchors.length / Math.max(anchorsA.size, anchorsB.size, 1)
    : 0;

  const score = keywordScore * 0.5 + tagScore * 0.2 + anchorScore * 0.3;
  return Math.min(0.99, Math.max(0, score));
}

export const EVENT_MATCH_THRESHOLD = 0.28;

/**
 * Event V1 links already stored in production are revalidated on read. This
 * prevents old false-positive clusters from leaking into the Event Desk while
 * new ingestion progressively builds cleaner V2 links.
 */
export function filterEventEvidence<T extends EventArticleSignal & { isPrimary?: boolean }>(
  event: { title: string; tags: string[] },
  articles: T[],
): T[] {
  if (articles.length <= 1) return articles;
  return articles.filter((article) => {
    if (article.isPrimary) return true;
    return eventSimilarityV2(
      { title: event.title, tags: event.tags },
      { title: article.title, tags: article.tags },
    ) >= EVENT_MATCH_THRESHOLD;
  });
}

export function deriveEventTags(articles: EventArticleSignal[]): string[] {
  return [...new Set(articles.flatMap((article) => article.tags).filter(Boolean))];
}

export function deriveMarketChannels(title: string, tags: string[]): MarketImpactChannel[] {
  const text = `${title} ${tags.join(" ")}`.toLowerCase();
  const channels: MarketImpactChannel[] = [];
  if (/\b(fed|fomc|ecb|boj|bok|treasury|bond|yield|rates?)\b|국채|금리|연준|한국은행|금통위/.test(text)) channels.push("rates");
  if (/\b(fx|dollar|usd|krw|yen|jpy|yuan|cny)\b|환율|달러|원화|엔화|위안/.test(text)) channels.push("fx");
  if (/\b(stocks?|equity|nasdaq|s&p|kospi|semiconductor|nvidia)\b|주식|증시|반도체|엔비디아/.test(text)) channels.push("equities");
  if (/\b(oil|crude|brent|wti|opec|gas|energy)\b|원유|유가|천연가스|에너지/.test(text)) channels.push("energy");
  if (/\b(bitcoin|btc|crypto|ethereum)\b|비트코인|가상자산/.test(text)) channels.push("crypto");
  if (/\b(gdp|growth|inflation|cpi|pce|employment|payroll|unemployment)\b|성장|물가|고용|실업/.test(text)) channels.push("macro");
  return [...new Set(channels)];
}

export function deriveRegions(title: string, tags: string[]): string[] {
  const text = `${title} ${tags.join(" ")}`.toLowerCase();
  const regions: string[] = [];
  if (/한국|south korea|\bkorea\b|kospi|krw|한국은행/.test(text)) regions.push("KR");
  if (/미국|united states|\bu\.s\.\b|\bfed\b|federal reserve|treasury|\busd\b/.test(text)) regions.push("US");
  if (/유럽|\beurope\b|\beuro\b|\becb\b|독일|france|italy/.test(text)) regions.push("EU");
  if (/일본|\bjapan\b|\bboj\b|\bjpy\b|\byen\b/.test(text)) regions.push("JP");
  if (/중국|\bchina\b|\bpboc\b|\bcny\b|\byuan\b/.test(text)) regions.push("CN");
  if (/중동|\biran\b|\bisrael\b|\bhormuz\b|\bsaudi\b|\bgulf\b/.test(text)) regions.push("ME");
  return [...new Set(regions)];
}

function firstUsefulSentence(article: EventArticleSignal | undefined): string | null {
  const raw = article?.feedExcerpt ?? article?.summary;
  if (!raw) return null;
  const clean = raw.replace(/\s+/g, " ").trim();
  if (!clean) return null;
  const sentence = clean.split(/(?<=[.!?。])\s+/)[0] ?? clean;
  return sentence.slice(0, 220);
}

function detectDirection(text: string, positive: RegExp, negative: RegExp): MarketImpactDirection {
  const hasPositive = positive.test(text);
  const hasNegative = negative.test(text);
  if (hasPositive && hasNegative) return "mixed";
  if (hasPositive) return "up";
  if (hasNegative) return "down";
  return "watch";
}

function pushImpact(
  impacts: MarketImpact[],
  channel: MarketImpactChannel,
  direction: MarketImpactDirection,
  score: number,
  rationale: string,
) {
  const existing = impacts.find((impact) => impact.channel === channel);
  if (!existing || score > existing.score) {
    const next: MarketImpact = {
      channel,
      label: CHANNEL_LABELS[channel],
      direction,
      score: clampScore(score),
      rationale,
      confidence: "low",
    };
    if (existing) impacts.splice(impacts.indexOf(existing), 1, next);
    else impacts.push(next);
  }
}

/** Rule-based market transmission map. It intentionally states pressure/risk,
 * not a guaranteed price forecast. */
export function inferMarketImpacts(
  event: Pick<EventSignal, "title" | "tags" | "marketChannels">,
  articles: EventArticleSignal[] = [],
): MarketImpact[] {
  const text = [event.title, ...event.tags, ...articles.slice(0, 4).map((article) => article.title)]
    .join(" ")
    .toLowerCase();
  const impacts: MarketImpact[] = [];

  const rateDirection = detectDirection(
    text,
    /rate hike|rates? higher|hawkish|inflation (?:rises|accelerates|hot)|cpi (?:beats|above)|pce (?:beats|above)|금리 인상|매파|물가 (?:상승|급등)|인플레이션 (?:상승|가속)/i,
    /rate cut|rates? lower|dovish|inflation (?:falls|cools)|cpi (?:misses|below)|weak jobs|금리 인하|비둘기|물가 둔화|고용 둔화/i,
  );
  if (event.marketChannels?.includes("rates") || /\b(fed|fomc|ecb|boj|bok|treasury|bond)\b|국채|금리|연준|한국은행/.test(text)) {
    pushImpact(impacts, "rates", rateDirection, rateDirection === "watch" ? 58 : 78,
      rateDirection === "up" ? "인플레이션·긴축 신호는 금리 상승 압력으로 연결될 수 있음"
        : rateDirection === "down" ? "완화·성장 둔화 신호는 금리 하락 압력으로 연결될 수 있음"
          : "정책·채권 재가격 가능성이 있어 금리 반응 확인이 필요함");
  }

  const energyDirection = detectDirection(
    text,
    /\bhormuz\b|supply cut|production cut|\bsanction(?:s|ed)?\b|\battack(?:s|ed)?\b|\bwar\b|shipping disruption|호르무즈|공급 감소|감산|제재|공격|전쟁|운송 차질/i,
    /\bceasefire\b|supply increase|production increase|demand slowdown|휴전|증산|수요 둔화/i,
  );
  if (event.marketChannels?.includes("energy") || /\b(oil|crude|brent|wti|opec|gas|energy)\b|원유|유가|천연가스|에너지/.test(text)) {
    pushImpact(impacts, "energy", energyDirection, energyDirection === "watch" ? 60 : 82,
      energyDirection === "up" ? "공급·운송 리스크는 에너지 가격의 상방 압력으로 이어질 수 있음"
        : energyDirection === "down" ? "공급 확대·수요 둔화는 에너지 가격의 하방 압력으로 이어질 수 있음"
          : "공급과 수요 경로가 엇갈려 에너지 변동성 확인이 필요함");
  }

  const equityDirection = detectDirection(
    text,
    /earnings beat|guidance raised|record revenue|stimulus|rate cut|liquidity|실적 상회|가이던스 상향|부양책|금리 인하/i,
    /earnings miss|guidance cut|rate hike|\bsanction(?:s|ed)?\b|\bwar\b|\btariff(?:s)?\b|\brecession\b|실적 하회|가이던스 하향|금리 인상|제재|전쟁|관세|침체/i,
  );
  if (event.marketChannels?.includes("equities") || /\b(stocks?|equity|nasdaq|s&p|kospi|semiconductor|nvidia)\b|주식|증시|반도체|엔비디아/.test(text)) {
    pushImpact(impacts, "equities", equityDirection, equityDirection === "watch" ? 56 : 74,
      equityDirection === "up" ? "실적·유동성 개선 신호는 주식 위험선호에 우호적일 수 있음"
        : equityDirection === "down" ? "긴축·지정학·실적 악화 신호는 주식 위험선호를 압박할 수 있음"
          : "실적과 금리 경로에 따라 주식 반응이 갈릴 수 있음");
  }

  const fxDirection = detectDirection(
    text,
    /dollar rises|dollar strengthens|hawkish fed|usd higher|달러 강세|연준 매파/i,
    /dollar falls|dollar weakens|dovish fed|usd lower|달러 약세|연준 비둘기/i,
  );
  if (event.marketChannels?.includes("fx") || /\b(dollar|usd|krw|yen|jpy|yuan|cny)\b|환율|달러|원화|엔화|위안/.test(text)) {
    pushImpact(impacts, "fx", fxDirection, fxDirection === "watch" ? 54 : 72,
      fxDirection === "up" ? "달러 강세 압력이 커질 수 있어 주요 통화와 원화 반응 확인이 필요함"
        : fxDirection === "down" ? "달러 약세 압력이 커질 수 있어 주요 통화와 원화 반응 확인이 필요함"
          : "금리차와 위험선호 변화가 환율에 전달되는지 확인이 필요함");
  }

  const cryptoDirection = detectDirection(
    text,
    /etf inflow|rate cut|liquidity|risk on|crypto adoption|유입|금리 인하|유동성|위험선호/i,
    /etf outflow|rate hike|liquidation|regulation|hack|risk off|유출|금리 인상|청산|규제|해킹|위험회피/i,
  );
  if (event.marketChannels?.includes("crypto") || /\b(bitcoin|btc|crypto|ethereum)\b|비트코인|가상자산/.test(text)) {
    pushImpact(impacts, "crypto", cryptoDirection, cryptoDirection === "watch" ? 50 : 68,
      cryptoDirection === "up" ? "유동성·자금 유입은 크립토 위험선호에 우호적일 수 있음"
        : cryptoDirection === "down" ? "긴축·자금 유출·규제 리스크는 크립토를 압박할 수 있음"
          : "유동성과 현물 자금 흐름 확인이 필요함");
  }

  if (/\b(gdp|growth|inflation|cpi|pce|employment|payroll|unemployment)\b|성장|물가|고용|실업/.test(text)) {
    pushImpact(impacts, "macro", "watch", 62, "성장·물가·고용 경로가 정책 기대를 바꿀 수 있는 매크로 신호");
  }

  return impacts.sort((a, b) => b.score - a.score).slice(0, 4);
}

/**
 * Desk score is deliberately structural. Freshness and update velocity belong
 * to Pulse score, otherwise an old but still important event silently loses
 * its identity as time passes.
 */
export function scoreEventPriority(
  event: Pick<EventSignal, "coverageCount" | "importanceScore" | "officialSourceName" | "latestPublishedAt" | "marketChannels">,
  distinctSources = event.coverageCount,
  _now = Date.now(),
): { score: number; tier: EventImportanceTier; reasons: string[] } {
  let score = Math.max(0, Math.min(100, event.importanceScore));
  const reasons: string[] = [];

  if (event.officialSourceName) {
    score += 8;
    reasons.push("공식 소스 확인");
  }
  if (distinctSources >= 5) {
    score += 14;
    reasons.push(`${distinctSources}개 독립 소스`);
  } else if (distinctSources >= 3) {
    score += 9;
    reasons.push(`${distinctSources}개 독립 소스`);
  } else if (distinctSources >= 2) {
    score += 5;
    reasons.push("복수 소스 확인");
  }

  const channels = new Set(event.marketChannels ?? []);
  if (channels.size >= 3) {
    score += 6;
    reasons.push("다중 시장 전이");
  } else if (channels.size >= 2) {
    score += 3;
    reasons.push("복수 시장 전이");
  }

  score = clampScore(score);
  const tier: EventImportanceTier = score >= 78 ? "critical" : score >= 48 ? "major" : "general";
  return { score, tier, reasons: reasons.slice(0, 4) };
}

export function dedupeEventArticles<T extends EventArticleSignal>(articles: T[]): T[] {
  const seenHeadline = new Set<string>();
  const seenSourceTitle = new Set<string>();
  const result: T[] = [];

  for (const article of articles) {
    const normalized = normalizeEventHeadline(article.title);
    const sourceTitle = `${canonicalSourceName(article.sourceName).toLowerCase()}::${normalized}`;
    if (seenSourceTitle.has(sourceTitle)) continue;
    // Exact syndicated headlines from multiple mirrors add little evidence.
    if (normalized.length > 20 && seenHeadline.has(normalized) && article.sourceTier === "T3") continue;
    seenSourceTitle.add(sourceTitle);
    seenHeadline.add(normalized);
    result.push(article);
  }
  return result;
}

function canonicalFact(value: string): string {
  return value
    .toLowerCase()
    .replace(/,/g, "")
    .replace(/\s+/g, " ")
    .replace(/(\d+)\.0+(?=\D|$)/g, "$1")
    .trim();
}

export function extractExplicitFacts(text: string): string[] {
  const seen = new Set<string>();
  const facts: string[] = [];
  for (const pattern of FACT_PATTERNS) {
    for (const match of text.match(pattern) ?? []) {
      const clean = match.replace(/\s+/g, " ").trim();
      const canonical = canonicalFact(clean);
      if (!canonical || seen.has(canonical)) continue;
      seen.add(canonical);
      facts.push(clean);
    }
  }
  return facts.slice(0, 8);
}

function uniqueSourceArticles(articles: EventArticleSignal[]): EventArticleSignal[] {
  const bySource = new Map<string, EventArticleSignal>();
  for (const article of articles) {
    const key = canonicalSourceName(article.sourceName).toLowerCase();
    if (!key) continue;
    const current = bySource.get(key);
    if (!current) {
      bySource.set(key, article);
      continue;
    }
    const currentWeight = current.sourceTier ? SOURCE_TIER_WEIGHT[current.sourceTier] : 50;
    const nextWeight = article.sourceTier ? SOURCE_TIER_WEIGHT[article.sourceTier] : 50;
    if (nextWeight > currentWeight || (nextWeight === currentWeight && safeTime(article.publishedAt) > safeTime(current.publishedAt))) {
      bySource.set(key, article);
    }
  }
  return [...bySource.values()];
}

export function deriveSourceTierCounts(articles: EventArticleSignal[]): EventSourceTierCounts {
  const counts: EventSourceTierCounts = { T0: 0, T1: 0, T2: 0, T3: 0 };
  for (const article of uniqueSourceArticles(articles)) {
    if (article.sourceTier) counts[article.sourceTier] += 1;
  }
  return counts;
}

export function scoreSourceQuality(articles: EventArticleSignal[]): number {
  const sources = uniqueSourceArticles(articles);
  if (sources.length === 0) return 0;
  const average = sources.reduce((sum, article) => (
    sum + (article.sourceTier ? SOURCE_TIER_WEIGHT[article.sourceTier] : 50)
  ), 0) / sources.length;
  const diversityBonus = Math.min(12, Math.max(0, sources.length - 1) * 4);
  return clampScore(average + diversityBonus);
}

export function scoreEventConfirmation(
  event: Pick<EventSignal, "officialSourceName">,
  articles: EventArticleSignal[],
): number {
  const sources = uniqueSourceArticles(articles);
  const counts = deriveSourceTierCounts(articles);
  const sourceCount = sources.length;
  let score = sourceCount <= 1 ? 20 : sourceCount === 2 ? 48 : sourceCount === 3 ? 65 : 80;

  if (event.officialSourceName || counts.T0 > 0) score = Math.max(score, 72);
  if ((event.officialSourceName || counts.T0 > 0) && sourceCount >= 2) score += 8;
  if (counts.T0 + counts.T1 >= 2) score += 5;
  return clampScore(score);
}

function articleEvidenceText(article: EventArticleSignal): string {
  return `${article.title} ${article.feedExcerpt ?? article.summary ?? ""}`.replace(/\s+/g, " ").trim();
}

export function deriveLatestUpdate(articles: EventArticleSignal[]): EventLatestUpdate | null {
  const sorted = [...articles].sort((a, b) => safeTime(b.publishedAt) - safeTime(a.publishedAt));
  const latest = sorted[0];
  if (!latest) return null;
  const previous = sorted.slice(1);
  const latestFacts = extractExplicitFacts(articleEvidenceText(latest));
  const previousFacts = new Set(
    previous.flatMap((article) => extractExplicitFacts(articleEvidenceText(article))).map(canonicalFact),
  );
  const newFacts = previous.length > 0
    ? latestFacts.filter((fact) => !previousFacts.has(canonicalFact(fact))).slice(0, 4)
    : [];

  const latestAnchors = extractEventAnchors(latest.title, latest.tags);
  const previousAnchors = new Set<string>();
  for (const article of previous) {
    for (const anchor of extractEventAnchors(article.title, article.tags)) previousAnchors.add(anchor);
  }
  const newAnchors = previous.length > 0
    ? [...latestAnchors]
      .filter((anchor) => !previousAnchors.has(anchor))
      .map((anchor) => ANCHOR_LABELS[anchor] ?? anchor)
      .slice(0, 3)
    : [];

  const previousSources = new Set(previous.map((article) => canonicalSourceName(article.sourceName).toLowerCase()));
  const latestSource = canonicalSourceName(latest.sourceName);
  const isNewSource = previous.length > 0 && !previousSources.has(latestSource.toLowerCase());
  const kind: EventUpdateKind = previous.length === 0
    ? "initial"
    : newFacts.length > 0 || newAnchors.length > 0
      ? "new_fact"
      : isNewSource
        ? "confirmation"
        : "follow_up";

  let summary: string;
  if (kind === "initial") {
    summary = `${latestSource}에서 처음 포착된 이벤트입니다.`;
  } else if (kind === "new_fact") {
    const details = [...newFacts, ...newAnchors.map((anchor) => `새 핵심축 ${anchor}`)].slice(0, 4);
    summary = details.length > 0
      ? `${latestSource} 최신 업데이트에서 ${details.join(", ")} 항목이 새로 포착됐습니다.`
      : `${latestSource}에서 새로운 핵심 정보가 추가됐습니다.`;
  } else if (kind === "confirmation") {
    summary = `${latestSource}가 새 독립 소스로 합류해 같은 사건을 추가 확인했습니다.`;
  } else {
    summary = `${latestSource}에서 후속 보도가 추가됐습니다. 핵심 수치의 새 변화는 아직 포착되지 않았습니다.`;
  }

  const publishedTime = safeTime(latest.publishedAt);
  return {
    kind,
    sourceName: latestSource,
    sourceTier: latest.sourceTier ?? null,
    publishedAt: new Date(publishedTime || Date.now()).toISOString(),
    headline: latest.title,
    newFacts,
    newAnchors,
    summary,
  };
}

function freshnessScore(latestPublishedAt: string | Date, now: number): number {
  const age = Math.max(0, now - safeTime(latestPublishedAt));
  if (age <= 5 * 60_000) return 100;
  if (age <= 15 * 60_000) return 90;
  if (age <= 60 * 60_000) return 70;
  if (age <= 3 * 60 * 60_000) return 45;
  if (age <= 6 * 60 * 60_000) return 25;
  if (age <= 12 * 60 * 60_000) return 10;
  return 0;
}

function updateVelocity(articles: EventArticleSignal[], now: number): {
  updatesLast15m: number;
  updatesLast60m: number;
  score: number;
} {
  const updatesLast15m = articles.filter((article) => Math.max(0, now - safeTime(article.publishedAt)) <= 15 * 60_000).length;
  const updatesLast60m = articles.filter((article) => Math.max(0, now - safeTime(article.publishedAt)) <= 60 * 60_000).length;
  const distinctSources = uniqueSourceArticles(articles).length;
  const score = clampScore(
    updatesLast15m * 24
    + Math.max(0, updatesLast60m - updatesLast15m) * 8
    + Math.min(distinctSources, 5) * 6,
  );
  return { updatesLast15m, updatesLast60m, score };
}

function lifecycleForEvent(
  event: EventSignal,
  articles: EventArticleSignal[],
  confirmationScore: number,
  now: number,
): EventLifecycle {
  const latest = safeTime(event.latestPublishedAt);
  const articleTimes = articles.map((article) => safeTime(article.publishedAt)).filter((time) => time > 0);
  const articleFirst = articleTimes.length > 0 ? Math.min(...articleTimes) : latest;
  const first = event.firstSeenAt ? safeTime(event.firstSeenAt) : articleFirst;
  const latestAge = Math.max(0, now - latest);
  const eventAge = Math.max(0, now - first);
  const distinctSources = uniqueSourceArticles(articles).length;

  if (latestAge > 3 * 60 * 60_000) return "cooling";
  if (eventAge <= 12 * 60_000 && distinctSources <= 1 && confirmationScore < 70) return "flash";
  if (confirmationScore >= 75) return "confirmed";
  return "developing";
}

function confidenceFromScore(score: number): EventConfidence {
  if (score >= 75) return "high";
  if (score >= 45) return "medium";
  return "low";
}

function impactConfidence(impact: MarketImpact, confirmationScore: number): EventConfidence {
  const directionalBonus = impact.direction === "watch" ? 0 : 6;
  const score = confirmationScore * 0.65 + impact.score * 0.35 + directionalBonus;
  return confidenceFromScore(score);
}

export function buildEventIntelligence(
  event: EventSignal,
  rawArticles: EventArticleSignal[],
  now = Date.now(),
): EventIntelligence {
  const articles = dedupeEventArticles(rawArticles);
  const distinctSources = new Set(articles.map((article) => canonicalSourceName(article.sourceName).toLowerCase())).size
    || event.coverageCount
    || 1;
  const priority = scoreEventPriority(event, distinctSources, now);
  const confirmationScore = scoreEventConfirmation(event, articles);
  const sourceQualityScore = scoreSourceQuality(articles);
  const sourceTierCounts = deriveSourceTierCounts(articles);
  const latestUpdate = deriveLatestUpdate(articles);
  const velocity = updateVelocity(articles, now);
  const lifecycle = lifecycleForEvent(event, articles, confirmationScore, now);
  const freshScore = freshnessScore(event.latestPublishedAt, now);
  const noveltyScore = latestUpdate?.kind === "new_fact"
    ? 100
    : latestUpdate?.kind === "confirmation"
      ? 80
      : latestUpdate?.kind === "initial"
        ? 65
        : 45;
  let pulseScore = clampScore(
    priority.score * 0.55
    + freshScore * 0.20
    + velocity.score * 0.15
    + noveltyScore * 0.10,
  );
  if (lifecycle === "cooling") pulseScore = clampScore(pulseScore - 8);

  const pulseReasons: string[] = [];
  if (latestUpdate?.kind === "new_fact") {
    pulseReasons.push(latestUpdate.newFacts.length > 0
      ? `새 수치 ${latestUpdate.newFacts.length}개`
      : "새 핵심 정보");
  }
  if (velocity.updatesLast15m >= 2) pulseReasons.push(`15분 ${velocity.updatesLast15m}개 업데이트`);
  else if (velocity.updatesLast60m >= 2) pulseReasons.push(`1시간 ${velocity.updatesLast60m}개 업데이트`);
  else if (velocity.updatesLast60m === 0 && lifecycle !== "flash") pulseReasons.push("1시간 신규 업데이트 없음");
  if (confirmationScore >= 75) pulseReasons.push("교차 확인 강함");
  if (lifecycle === "cooling") pulseReasons.push("최근 업데이트 둔화");

  const marketImpacts = inferMarketImpacts(event, articles).map((impact) => ({
    ...impact,
    confidence: impactConfidence(impact, confirmationScore),
  }));
  const primaryCanonical = event.primarySourceName ? canonicalSourceName(event.primarySourceName) : null;
  const primary = articles.find((article) => (
    primaryCanonical && canonicalSourceName(article.sourceName) === primaryCanonical
  )) ?? articles[0];
  const firstSentence = firstUsefulSentence(primary);

  const coveragePhrase = distinctSources >= 2
    ? `${distinctSources}개 독립 소스가 같은 사건을 확인 중입니다.`
    : "현재 단일 소스에서 포착된 사건입니다.";
  const impactPhrase = marketImpacts[0]?.rationale;
  const shortExplanation = [firstSentence ?? event.title, coveragePhrase, impactPhrase]
    .filter(Boolean)
    .join(" ")
    .slice(0, 420);

  return {
    deskScore: priority.score,
    deskTier: priority.tier,
    pulseScore,
    lifecycle,
    importanceReasons: priority.reasons,
    pulseReasons: pulseReasons.slice(0, 4),
    shortExplanation,
    whyNow: latestUpdate?.summary ?? "새 업데이트를 기다리고 있습니다.",
    marketImpacts,
    confidence: confidenceFromScore(confirmationScore),
    confirmationScore,
    sourceQualityScore,
    sourceTierCounts,
    updatesLast15m: velocity.updatesLast15m,
    updatesLast60m: velocity.updatesLast60m,
    latestUpdate,
    distinctSources,
    evidenceCount: articles.length,
  };
}
