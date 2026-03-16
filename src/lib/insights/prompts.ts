import type { Article } from "@/types";

export function buildArticlePrompt(article: {
  title: string;
  summary: string | null;
  tags: string[];
  sourceName: string;
  publishedAt: string;
}): string {
  return `당신은 매크로 경제 분석 전문가입니다. 아래 뉴스 기사를 분석해주세요.

제목: ${article.title}
출처: ${article.sourceName}
발행: ${article.publishedAt}
태그: ${article.tags.join(", ")}
요약: ${article.summary || "(없음)"}

다음 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "keyPoints": ["핵심 포인트 1", "핵심 포인트 2", "핵심 포인트 3"],
  "marketImpact": "시장에 미치는 영향 분석 (2-3문장)",
  "context": "이 기사의 거시경제적 맥락과 배경 (2-3문장)"
}`;
}

export function buildClusterPrompt(
  articles: Article[],
  clusterLabel: string
): string {
  const articleList = articles
    .map(
      (a, i) =>
        `[${i + 1}] ${a.title} (${a.sourceName})\n    요약: ${a.summary || "(없음)"}`
    )
    .join("\n");

  return `당신은 매크로 경제 분석 전문가입니다. 아래는 "${clusterLabel}" 주제로 묶인 관련 기사들입니다.

${articleList}

다음을 분석해주세요:
1. 전체 기사를 종합한 핵심 분석
2. 매체별 논조 차이 (있다면)
3. 합의점과 분기점

다음 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "synthesis": "종합 분석 (3-4문장)",
  "mediaTones": [{"source": "매체명", "tone": "논조 요약"}],
  "consensus": "매체 간 합의 사항 (1-2문장)",
  "divergence": "매체 간 시각 차이 (1-2문장)",
  "outlook": "향후 전망 (1-2문장)"
}`;
}

export function buildConnectionsPrompt(articles: Article[]): string {
  const grouped: Record<string, string[]> = {};
  for (const a of articles) {
    for (const tag of a.tags) {
      if (!grouped[tag]) grouped[tag] = [];
      grouped[tag].push(a.title);
    }
  }

  const tagSummary = Object.entries(grouped)
    .filter(([, titles]) => titles.length >= 2)
    .map(([tag, titles]) => `[${tag}] ${titles.slice(0, 3).join(" / ")}`)
    .join("\n");

  return `당신은 매크로 경제 분석 전문가입니다. 아래는 최근 뉴스 기사의 태그별 분류입니다.

${tagSummary}

이 기사들 사이의 인과관계 체인을 분석해주세요.
예: 금리 인상 → 환율 상승 → 수출 기업 영향

다음 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "chains": [
    {
      "nodes": ["주제1", "주제2", "주제3"],
      "relations": ["인과관계1", "인과관계2"],
      "narrative": "이 체인에 대한 설명 (1문장)"
    }
  ],
  "summary": "전체 인과관계 요약 (2-3문장)"
}`;
}
