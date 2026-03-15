const POSITIVE = [
  "상승", "급등", "호조", "성장", "회복", "개선", "증가", "확대", "호전",
  "서프라이즈", "최고", "돌파", "강세", "반등", "호재", "수혜", "긍정",
  "안정", "완화", "흑자", "활성", "기대", "낙관", "견조",
  "선방", "개선세", "호실적", "순매수",
];

const NEGATIVE = [
  "하락", "급락", "폭락", "위기", "침체", "악화", "감소", "축소", "부진",
  "실망", "쇼크", "최저", "약세", "리스크", "적자", "경고", "우려",
  "불안", "긴축", "압박", "충격", "갈등", "제재", "위축", "불확실",
  "매도", "둔화", "손실", "역풍", "과열", "정체",
];

export type Sentiment = "positive" | "negative" | "neutral";

export interface SentimentResult {
  sentiment: Sentiment;
  label: string;
  color: string;
}

export function analyzeSentiment(
  title: string,
  summary?: string | null
): SentimentResult {
  const text = `${title} ${summary ?? ""}`;

  let pos = 0;
  let neg = 0;

  for (const kw of POSITIVE) {
    if (text.includes(kw)) pos++;
  }
  for (const kw of NEGATIVE) {
    if (text.includes(kw)) neg++;
  }

  if (pos > neg)
    return { sentiment: "positive", label: "긍정", color: "#22c55e" };
  if (neg > pos)
    return { sentiment: "negative", label: "부정", color: "#ef4444" };
  return { sentiment: "neutral", label: "중립", color: "#94a3b8" };
}
