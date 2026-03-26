import type { Article } from "@/types";

export interface SmartSummary {
  headline: string;
  keyEntities: string[];
  sentiment: "positive" | "negative" | "neutral";
  impactLevel: "high" | "medium" | "low";
  relatedTopics: string[];
  readingTime: number;
}

// Known financial entities for extraction
const KNOWN_ENTITIES = [
  // Korean institutions
  "한국은행", "금융위원회", "금융감독원", "기획재정부", "산업통상자원부",
  "국토교통부", "과학기술정보통신부", "통계청", "관세청", "국세청",
  "한국거래소", "한국투자공사", "수출입은행", "산업은행", "국민연금",
  // Korean companies
  "삼성전자", "SK하이닉스", "LG에너지솔루션", "삼성바이오로직스",
  "현대자동차", "기아", "셀트리온", "KB금융", "신한지주", "POSCO홀딩스",
  "네이버", "카카오", "LG화학", "삼성SDI", "현대모비스", "SK이노베이션",
  "한화에어로스페이스", "두산에너빌리티", "삼성물산", "LG전자",
  "SK텔레콤", "KT", "포스코", "한화오션", "HD현대",
  // Global institutions
  "연준", "Fed", "ECB", "BOJ", "IMF", "세계은행", "OPEC",
  "SEC", "FOMC", "G7", "G20", "WTO", "NATO",
  // Global companies
  "애플", "마이크로소프트", "구글", "아마존", "메타", "테슬라",
  "엔비디아", "TSMC", "인텔", "AMD",
  "Apple", "Microsoft", "Google", "Amazon", "Meta", "Tesla",
  "Nvidia", "NVIDIA", "OpenAI",
  // People
  "트럼프", "바이든", "옐런", "파월", "라가르드", "시진핑",
  "윤석열", "이창용", "김주현",
];

// Regex patterns for Korean proper nouns (organizations ending in common suffixes)
const ENTITY_PATTERNS = [
  /[가-힣]{2,}(?:은행|증권|투자|보험|금융|그룹|전자|화학|건설|중공업|자동차|에너지|바이오|제약)/g,
  /[가-힣]{2,}(?:부|청|원|위원회|연구원|공사|공단)/g,
  /[A-Z]{2,}[A-Za-z]*/g, // Acronyms and English names starting with caps
];

const POSITIVE_KEYWORDS = [
  "상승", "급등", "호조", "성장", "회복", "개선", "증가", "확대", "호전",
  "서프라이즈", "최고", "돌파", "강세", "반등", "호재", "수혜", "긍정",
  "안정", "완화", "흑자", "활성", "기대", "낙관", "견조", "기록적",
  "선방", "개선세", "호실적", "순매수", "상향", "신고가",
];

const NEGATIVE_KEYWORDS = [
  "하락", "급락", "폭락", "위기", "침체", "악화", "감소", "축소", "부진",
  "실망", "쇼크", "최저", "약세", "리스크", "적자", "경고", "우려",
  "불안", "긴축", "압박", "충격", "갈등", "제재", "위축", "불확실",
  "매도", "둔화", "손실", "역풍", "과열", "정체", "하향", "신저가",
];

const HIGH_IMPACT_KEYWORDS = [
  "급", "사상 최고", "사상 최저", "긴급", "속보", "역대", "폭등", "폭락",
  "블랙", "패닉", "사이렌", "경보", "비상", "최초", "사상최대", "사상최소",
  "전격", "충격", "파격",
];

const MEDIUM_IMPACT_KEYWORDS = [
  "전망", "분석", "관측", "예상", "예측", "전략", "리포트", "보고서",
  "점검", "진단", "평가", "검토",
];

function extractEntities(text: string): string[] {
  const found = new Set<string>();

  // Check known entities
  for (const entity of KNOWN_ENTITIES) {
    if (text.includes(entity)) {
      found.add(entity);
    }
  }

  // Apply regex patterns
  for (const pattern of ENTITY_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      for (const m of matches) {
        // Filter out very short or common words
        if (m.length >= 2 && !["the", "and", "for", "with"].includes(m.toLowerCase())) {
          found.add(m);
        }
      }
    }
  }

  return Array.from(found).slice(0, 8);
}

function analyzeSentimentLocal(text: string): "positive" | "negative" | "neutral" {
  let pos = 0;
  let neg = 0;
  for (const kw of POSITIVE_KEYWORDS) {
    if (text.includes(kw)) pos++;
  }
  for (const kw of NEGATIVE_KEYWORDS) {
    if (text.includes(kw)) neg++;
  }
  if (pos > neg) return "positive";
  if (neg > pos) return "negative";
  return "neutral";
}

function analyzeImpact(text: string): "high" | "medium" | "low" {
  for (const kw of HIGH_IMPACT_KEYWORDS) {
    if (text.includes(kw)) return "high";
  }
  for (const kw of MEDIUM_IMPACT_KEYWORDS) {
    if (text.includes(kw)) return "medium";
  }
  return "low";
}

function extractRelatedTopics(article: Article): string[] {
  const topics = new Set<string>();

  // Add tags
  for (const tag of article.tags) {
    topics.add(tag);
  }

  // Extract additional keywords from title
  const titleTopics = [
    "금리", "환율", "유가", "인플레이션", "GDP", "고용", "실업",
    "무역", "수출", "수입", "부동산", "반도체", "AI", "배터리",
    "전기차", "바이오", "에너지", "원자재", "채권", "주식",
    "암호화폐", "비트코인", "ETF", "IPO", "M&A",
    "관세", "제재", "규제", "정책", "선거",
  ];

  const text = article.title + " " + (article.summary || "");
  for (const topic of titleTopics) {
    if (text.includes(topic) && !topics.has(topic)) {
      topics.add(topic);
    }
  }

  return Array.from(topics).slice(0, 6);
}

export function generateSmartSummary(article: Article): SmartSummary {
  const text = article.title + " " + (article.summary || "");

  // Headline: first sentence of summary, or first 50 chars of title
  let headline: string;
  if (article.summary) {
    const firstSentence = article.summary.split(/[.!?。]/)[0]?.trim();
    headline = firstSentence && firstSentence.length > 10
      ? firstSentence
      : article.title.slice(0, 50);
  } else {
    headline = article.title.slice(0, 50);
  }

  // Reading time: character count / 500
  const totalChars = text.length;
  const readingTime = Math.max(1, Math.round(totalChars / 500));

  return {
    headline,
    keyEntities: extractEntities(text),
    sentiment: analyzeSentimentLocal(text),
    impactLevel: analyzeImpact(text),
    relatedTopics: extractRelatedTopics(article),
    readingTime,
  };
}
