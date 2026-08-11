import { classifyArticleSignal } from "../news/signal";

export type ContentSourceKind = "official" | "rss" | "metadata" | "coverage" | "rules";

export interface TextEvidence {
  kind: Exclude<ContentSourceKind, "rules">;
  label: string;
  text: string;
  url?: string;
}

export interface KeyFact {
  text: string;
  sourceKind: TextEvidence["kind"];
  sourceLabel: string;
}

export interface KeyNumber {
  label: string;
  value: string;
  context: string;
  sourceLabel: string;
}

const ENTITY_PATTERNS: Array<[string, RegExp]> = [
  ["Federal Reserve", /\b(federal reserve|fed|fomc)\b/i],
  ["ECB", /\b(ecb|european central bank)\b/i],
  ["Bank of Korea", /(한국은행|bank of korea)/i],
  ["BLS", /\b(bureau of labor statistics|bls)\b/i],
  ["BEA", /\b(bureau of economic analysis|bea)\b/i],
  ["U.S. Treasury", /\b(u\.?s\.? treasury|treasury department)\b/i],
  ["OPEC", /\bopec\+?\b/i],
  ["IMF", /\bimf|international monetary fund\b/i],
];

const NUMBER_PATTERN = /(?:[$€£¥₩]\s*)?[+-]?\d[\d,]*(?:\.\d+)?(?:\s*[–—-]\s*(?:[$€£¥₩]\s*)?[+-]?\d[\d,]*(?:\.\d+)?)?\s*(?:%|bp|bps|basis points?|percentage points?|조원|억원|만원|원|달러|유로|엔|포인트|배럴|명|건|개월|분기|billion|million|trillion|percent)(?=\s|[.,;:!?)}\]]|$)/giu;

export function decodeHtmlEntities(value: string): string {
  const named: Record<string, string> = {
    amp: "&",
    quot: '"',
    apos: "'",
    lt: "<",
    gt: ">",
    nbsp: " ",
  };
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
    const lower = entity.toLowerCase();
    if (lower.startsWith("#x")) return String.fromCodePoint(Number.parseInt(lower.slice(2), 16));
    if (lower.startsWith("#")) return String.fromCodePoint(Number.parseInt(lower.slice(1), 10));
    return named[lower] ?? match;
  });
}

export function cleanEvidenceText(value: string): string {
  return decodeHtmlEntities(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sentences(text: string): string[] {
  const cleaned = cleanEvidenceText(text);
  if (!cleaned) return [];
  const split = cleaned
    .split(/(?<=[.!?。！？])\s+|\s*[•·]\s*|\n+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 18);
  return split.length > 0 ? split : cleaned.length >= 18 ? [cleaned] : [];
}

export function extractKeyFacts(evidence: TextEvidence[], limit = 5): KeyFact[] {
  const facts: KeyFact[] = [];
  const seen = new Set<string>();

  for (const source of evidence) {
    for (const sentence of sentences(source.text)) {
      const text = sentence.slice(0, 360);
      const fingerprint = text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
      if (!fingerprint || [...seen].some((existing) => existing.includes(fingerprint) || fingerprint.includes(existing))) {
        continue;
      }
      seen.add(fingerprint);
      facts.push({ text, sourceKind: source.kind, sourceLabel: source.label });
      if (facts.length >= limit) return facts;
    }
  }

  return facts;
}

function extractedLabel(context: string, value: string): string {
  const index = context.indexOf(value);
  const before = (index >= 0 ? context.slice(Math.max(0, index - 52), index) : context)
    .replace(/[,:;()\[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = before.split(" ").filter(Boolean).slice(-5);
  return words.join(" ").slice(0, 42) || "기사 내 수치";
}

export function extractKeyNumbers(evidence: TextEvidence[], limit = 6): KeyNumber[] {
  const numbers: KeyNumber[] = [];
  const seen = new Set<string>();

  for (const source of evidence) {
    for (const sentence of sentences(source.text)) {
      for (const match of sentence.matchAll(NUMBER_PATTERN)) {
        const value = match[0].replace(/\s+/g, " ").trim();
        const fingerprint = `${value.toLowerCase()}|${sentence.toLowerCase()}`;
        if (seen.has(fingerprint)) continue;
        seen.add(fingerprint);
        numbers.push({
          label: extractedLabel(sentence, value),
          value,
          context: sentence.slice(0, 260),
          sourceLabel: source.label,
        });
        if (numbers.length >= limit) return numbers;
      }
    }
  }

  return numbers;
}

export function extractEntities(title: string, evidence: TextEvidence[]): string[] {
  const text = `${title} ${evidence.map((source) => source.text).join(" ")}`;
  return ENTITY_PATTERNS.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
}

const TRANSMISSION_PATHS: Array<[RegExp, string]> = [
  [/통화정책|금리/i, "정책금리 → 채권금리 → 환율·주식"],
  [/물가/i, "물가 → 금리 기대 → 채권·주식"],
  [/금융시장|외환/i, "환율 → 수입물가 → 기업 마진"],
  [/경기지표|경기/i, "성장 기대 → 채권금리 → 주식"],
  [/정책·무역|무역|재정/i, "정책 비용 → 물가·성장 → 기업 이익"],
  [/원자재/i, "원자재 가격 → 물가 → 금리 기대"],
  [/지정학/i, "위험 프리미엄 → 원자재·환율 → 주식"],
  [/반도체|AI 산업/i, "반도체 수요 → 수출 → 주식"],
];

export function deriveWhyItMatters(article: {
  title: string;
  summary: string | null;
  tags: string[];
  sourceName: string;
}): string | null {
  const signal = classifyArticleSignal(article);
  if (signal.tier === "general") return null;
  const reasonText = signal.reasons.join(" ");
  const path = TRANSMISSION_PATHS.find(([pattern]) => pattern.test(reasonText))?.[1];
  if (!path) return null;
  return `${signal.reasons[0] ?? "거시"} 신호의 일반적인 전달 경로: ${path}. 실제 시장 반응은 원문과 후속 가격 데이터를 별도로 확인해야 합니다.`;
}

function metaAttributes(tag: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    attributes[match[1].toLowerCase()] = match[2] ?? match[3] ?? "";
  }
  return attributes;
}

export function extractMetaDescription(html: string): string | null {
  let fallback: string | null = null;
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attributes = metaAttributes(tag);
    const key = (attributes.property ?? attributes.name ?? "").toLowerCase();
    const content = cleanEvidenceText(attributes.content ?? "");
    if (!content) continue;
    if (key === "og:description") return content.slice(0, 1_500);
    if (key === "description") fallback = content.slice(0, 1_500);
  }
  return fallback;
}
