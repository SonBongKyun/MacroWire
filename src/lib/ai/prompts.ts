import type { Tier } from "@prisma/client";

export type Locale = "ko" | "en";

export interface ArticleLike {
  id: string;
  title: string;
  summary?: string | null;
  sourceName: string;
  publishedAt: Date | string;
  url: string;
  tags?: string[];
}

const SYSTEM_BASE = {
  ko: `당신은 신뢰받는 매크로 경제 리서치 데스크입니다. 매크로 트레이더가 단 1분만 보고도 핵심을 파악할 수 있게 정확하고 간결하게 씁니다. 추측은 명시적으로 "추측"이라 밝히고, 데이터에 없는 내용은 만들어내지 않습니다. 모든 결론은 출처 기사 번호 [n] 으로 인용합니다.`,
  en: `You are a trusted macro-economic research desk. Macro traders should be able to absorb the gist in under a minute. Be precise and terse, never invent details not in the source articles, and flag speculation as such. Every claim cites its source article number [n].`,
};

export function systemPrompt(locale: Locale, tier: Tier): string {
  const depth =
    tier === "ELITE"
      ? locale === "ko"
        ? "\n\n분석은 다층적으로: 단기 시장 영향 + 중기 매크로 함의 + 과거 유사 사건 비교. 트레이드 함의는 구체적 자산/섹터로."
        : "\n\nLayer the analysis: near-term market impact, medium-term macro implications, and historical analogues. Trade implications must name concrete assets / sectors."
      : tier === "PRO"
      ? locale === "ko"
        ? "\n\n시장 함의를 한 문장으로 짧게 덧붙이세요."
        : "\n\nAppend a one-sentence market implication."
      : "";
  return SYSTEM_BASE[locale] + depth;
}

export function articlesAsContext(articles: ArticleLike[]): string {
  return articles
    .map((a, i) => {
      const date = new Date(a.publishedAt).toISOString();
      return `[${i + 1}] (${a.sourceName} — ${date})\nTitle: ${a.title}\n${
        a.summary ? `Summary: ${a.summary}\n` : ""
      }URL: ${a.url}`;
    })
    .join("\n\n");
}

// ------------------------------------------------------------
// Single article — "Why does this matter?"
// ------------------------------------------------------------
export const articleInsightPrompt = {
  ko: (a: ArticleLike) =>
    `다음 기사에 대해:
1. 한 문장 요약 (40자 이내)
2. "왜 중요한가" (2~3문장, 매크로 트레이더 관점)
3. 영향받는 자산 / 섹터 (구체적으로, 추측이면 "추측:" 접두사)
4. 신뢰도 (LOW / MEDIUM / HIGH) — 출처와 시점 기반

기사:
${articlesAsContext([a])}

JSON으로만 응답하세요: {"tldr":"...","why":"...","assets":["..."],"confidence":"..."}`,
  en: (a: ArticleLike) =>
    `For this article:
1. One-sentence TLDR (max 20 words)
2. "Why it matters" (2-3 sentences, macro-trader perspective)
3. Affected assets / sectors (specific; prefix speculation with "speculative:")
4. Confidence (LOW / MEDIUM / HIGH) based on source + recency

Article:
${articlesAsContext([a])}

Respond with JSON only: {"tldr":"...","why":"...","assets":["..."],"confidence":"..."}`,
};

// ------------------------------------------------------------
// Cluster (multiple related articles) — "What's the story?"
// ------------------------------------------------------------
export const clusterInsightPrompt = {
  ko: (articles: ArticleLike[]) =>
    `다음은 관련된 ${articles.length}개의 기사입니다. 단일한 스토리로 종합하세요:

${articlesAsContext(articles)}

JSON: {"narrative":"3~5문장 종합 서술","keyFacts":["사실1","사실2","사실3"],"openQuestions":["미해결 질문1","질문2"]}`,
  en: (articles: ArticleLike[]) =>
    `These ${articles.length} articles are related. Synthesize into a single story:

${articlesAsContext(articles)}

JSON: {"narrative":"3-5 sentence synthesis","keyFacts":["fact1","fact2","fact3"],"openQuestions":["q1","q2"]}`,
};

// ------------------------------------------------------------
// Daily Macro Recap — top 3 of last 24h
// ------------------------------------------------------------
export const dailyRecapPrompt = {
  ko: (articles: ArticleLike[]) =>
    `최근 24시간 매크로 뉴스 ${articles.length}건입니다. 매크로 트레이더가 반드시 알아야 할 TOP 3를 골라, 왜 중요한지를 한국어로 정리하세요.

${articlesAsContext(articles)}

JSON: {
  "headline": "오늘의 한 줄 요약 (30자 이내)",
  "topStories": [
    {"articleIndex": <number>, "title": "...", "why": "왜 중요한지 2~3문장", "tradeImplication": "한 줄 트레이드 함의"}
  ],
  "themes": ["오늘의 매크로 테마 키워드", ...]
}`,
  en: (articles: ArticleLike[]) =>
    `These are ${articles.length} macro stories from the last 24 hours. Pick the TOP 3 a macro trader must know, and explain why.

${articlesAsContext(articles)}

JSON: {
  "headline": "one-line summary",
  "topStories": [
    {"articleIndex": <number>, "title": "...", "why": "2-3 sentences why", "tradeImplication": "one-line trade implication"}
  ],
  "themes": ["theme keyword", ...]
}`,
};

// ------------------------------------------------------------
// Personal briefing — tailored to user's watchlist/portfolio
// ------------------------------------------------------------
export const personalBriefingPrompt = {
  ko: (articles: ArticleLike[], watchlist: string[], portfolio: string[]) =>
    `사용자 관심사:
- 워치리스트: ${watchlist.join(", ") || "(없음)"}
- 포트폴리오: ${portfolio.join(", ") || "(없음)"}

최근 매크로 뉴스 ${articles.length}건 중, 위 관심사와 직접/간접 관련된 항목을 골라 사용자 맞춤 브리핑을 작성하세요.

${articlesAsContext(articles)}

JSON: {
  "intro": "사용자에게 바로 던지는 1~2문장 (관심 종목/키워드와 연결)",
  "items": [
    {"articleIndex": <number>, "relevance": "왜 이 사용자에게 중요한지", "action": "체크할 것 한 줄"}
  ],
  "noNews": "관심사에 직접 관련된 뉴스가 없으면 그 사실을 명시"
}`,
  en: (articles: ArticleLike[], watchlist: string[], portfolio: string[]) =>
    `User interests:
- Watchlist: ${watchlist.join(", ") || "(none)"}
- Portfolio: ${portfolio.join(", ") || "(none)"}

From these ${articles.length} recent macro stories, surface the ones directly or indirectly relevant to the user.

${articlesAsContext(articles)}

JSON: {
  "intro": "1-2 sentences directly addressing the user",
  "items": [
    {"articleIndex": <number>, "relevance": "why this matters for THIS user", "action": "one-line action item"}
  ],
  "noNews": "if nothing relevant, say so explicitly"
}`,
};
