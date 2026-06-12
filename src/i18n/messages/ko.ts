/**
 * Korean copy. Kept as a flat TS object so refactors get type-checked
 * (no missing-key surprises in production).
 */
export const ko = {
  nav: {
    desk: "데스크",
    wire: "와이어",
    markets: "마켓",
    analytics: "분석",
    ai: "AI",
    research: "리서치",
    portfolio: "포트폴리오",
    signIn: "로그인",
    signUp: "가입",
    goPro: "PRO",
    account: "계정",
    pricing: "요금제",
  },
  landing: {
    hero: {
      eyebrow: "MACRO INTELLIGENCE WIRE",
      headline: "매크로 트레이더를 위한 단 하나의 데스크",
      sub: "전 세계 매크로 뉴스를 지속적으로 수집·요약·연결합니다. AI가 \"왜 중요한지\"까지 알려주는 와이어.",
      ctaPrimary: "무료로 시작",
      ctaSecondary: "요금제 보기",
    },
    why: {
      title: "왜 MacroWire인가",
      a: { t: "Claude AI 인사이트", d: "기사 모음이 아닌 \"왜 중요한가\"를 정리합니다. 종목·섹터 영향까지." },
      b: { t: "상시 속보 파이프라인", d: "RSS 30+ 소스를 지속 감시하고, 고신호 속보 피드를 우선 처리합니다." },
      c: { t: "개인화 브리핑", d: "워치리스트·포트폴리오에 맞춰 12시간 단위 매크로 브리핑." },
    },
    pricing: {
      title: "요금제",
      note: "베타 기간 모든 기능 무료. 정식 출시 후 아래 적용.",
      perMonth: "월",
    },
    footer: {
      built: "Made with care for macro traders",
    },
  },
  recap: {
    title: "오늘의 매크로 리캡",
    headline: "오늘의 한 줄",
    topStories: "TOP 3 스토리",
    themes: "오늘의 테마",
    why: "왜 중요한가",
    tradeImplication: "트레이드 함의",
    refresh: "다시 생성",
    generating: "AI가 분석 중...",
    empty: "아직 오늘의 리캡이 생성되지 않았습니다.",
  },
  briefing: {
    title: "내 브리핑",
    intro: "관심 종목·키워드 기반",
    relevance: "왜 나에게 중요한가",
    action: "체크할 것",
    empty: "워치리스트나 포트폴리오를 추가해주세요.",
    upgrade: "PRO에서 이용 가능합니다.",
  },
  account: {
    title: "계정",
    plan: "요금제",
    usage: "오늘 사용량",
    upgrade: "PRO로 업그레이드",
    manage: "구독 관리",
    referral: "추천 코드",
    referralHint: "친구가 가입하면 양쪽 모두 1개월 무료.",
  },
  common: {
    save: "저장",
    cancel: "취소",
    confirm: "확인",
    loading: "불러오는 중…",
    error: "오류가 발생했습니다",
    upgradeRequired: "업그레이드가 필요합니다",
    quotaExceeded: "오늘 한도를 초과했습니다",
  },
} as const;

type WidenMessages<T> = {
  [K in keyof T]: T[K] extends string ? string : WidenMessages<T[K]>;
};

export type Messages = WidenMessages<typeof ko>;
