import Link from "next/link";
import { Logo } from "@/components/Logo";

/* ════════════════════════════════════════════════════════════════
   MacroWire — BULLETIN edition landing page
   Reference language: Reuters Wire / AP Bulletin / FT.com / NYT teletype
   ════════════════════════════════════════════════════════════════ */

const PALETTE = {
  obsidian: "#08090B",
  ink: "#0E0F12",
  paper: "#F5F0E1",
  paperDim: "#C9C4B6",
  amber: "#FFB000",
  rule: "rgba(245,240,225,0.10)",
  ruleStrong: "rgba(245,240,225,0.18)",
} as const;

function dispatchToday(): string {
  const d = new Date();
  const start = new Date(d.getFullYear(), 0, 0);
  return String(Math.floor((d.getTime() - start.getTime()) / 86_400_000)).padStart(3, "0");
}

function dateline(): string {
  const d = new Date();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} · KST`;
}

export default function LandingPage() {
  return (
    <main
      style={{
        background: PALETTE.obsidian,
        color: PALETTE.paper,
        height: "100vh",
        overflowY: "auto",
        overflowX: "hidden",
      }}
    >
      {/* Subtle paper-grain noise overlay — replaces the gold radial halo */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          opacity: 0.04,
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
        }}
      />

      <div style={{ position: "relative", zIndex: 1 }}>
        <Masthead />
        <HeroDispatch />
        <Bylines />
        <FilingsGrid />
        <PullQuote />
        <Schedule />
        <CallSheet />
        <Colophon />
      </div>
    </main>
  );
}

/* ──────────────────────────────────────
   MASTHEAD — newspaper-style top bar
   ────────────────────────────────────── */

function Masthead() {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        background: "rgba(8,9,11,0.85)",
        backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${PALETTE.ruleStrong}`,
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "16px 32px",
          display: "grid",
          gridTemplateColumns: "auto 1fr auto",
          alignItems: "center",
          gap: 32,
        }}
      >
        <Logo size="sm" caption />

        <nav
          style={{
            display: "flex",
            gap: 28,
            justifyContent: "center",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: PALETTE.paperDim,
          }}
        >
          <a href="#filings" className="bul-link">FILINGS</a>
          <a href="#schedule" className="bul-link">SCHEDULE</a>
          <a href="#callsheet" className="bul-link">SUBSCRIBE</a>
        </nav>

        <Link
          href="/app"
          style={{
            padding: "10px 22px",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: PALETTE.obsidian,
            background: PALETTE.amber,
            borderRadius: 0,
          }}
        >
          ENTER TERMINAL →
        </Link>
      </div>
    </header>
  );
}

/* ──────────────────────────────────────
   HERO DISPATCH — full-bleed editorial headline
   ────────────────────────────────────── */

function HeroDispatch() {
  return (
    <section
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: "80px 32px 48px",
      }}
    >
      {/* Top dateline — wire-service stamp */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          paddingBottom: 16,
          marginBottom: 48,
          borderBottom: `1px solid ${PALETTE.rule}`,
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: PALETTE.paperDim,
        }}
      >
        <span style={{ color: PALETTE.amber }}>● LIVE</span>
        <Sep />
        <span>{dateline()}</span>
        <Sep />
        <span>SEOUL</span>
        <Sep />
        <span>WIRE №{dispatchToday()}</span>
        <span style={{ marginLeft: "auto", color: PALETTE.paperDim }}>EST. 2026</span>
      </div>

      {/* Headline — Anton condensed, paper-cream, left-aligned */}
      <h1
        style={{
          fontFamily: "var(--font-display-condensed), 'Anton', 'Pretendard Variable', sans-serif",
          fontSize: "clamp(72px, 10vw, 156px)",
          fontWeight: 900, // Pretendard 900 for Korean; Anton ignores (single-weight)
          lineHeight: 0.92,
          letterSpacing: "-0.01em",
          color: PALETTE.paper,
          textTransform: "uppercase",
          margin: "0 0 32px",
          textWrap: "balance",
        }}
      >
        매크로 경제,<br />
        <span style={{ color: PALETTE.amber }}>분 단위</span> 와이어로.
      </h1>

      {/* Subhead — serif editorial deck */}
      <p
        style={{
          fontFamily: "var(--font-serif), 'Crimson Pro', serif",
          fontSize: "clamp(18px, 2vw, 22px)",
          fontWeight: 400,
          fontStyle: "italic",
          lineHeight: 1.5,
          color: PALETTE.paperDim,
          maxWidth: 720,
          marginBottom: 48,
          letterSpacing: "0",
        }}
      >
        30개 신뢰 소스를 90초마다 갱신하는 단일 디스패치. 텔레그램·X 속보 계정을 더 이상 새로고침하지 않아도 되는, 한 줄짜리 와이어 피드.
      </p>

      {/* Dual CTA — solid amber + outlined paper */}
      <div style={{ display: "flex", gap: 0, flexWrap: "wrap", alignItems: "center" }}>
        <Link
          href="/app"
          style={{
            padding: "18px 28px",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: PALETTE.obsidian,
            background: PALETTE.amber,
            borderRadius: 0,
          }}
        >
          무료로 시작 →
        </Link>
        <a
          href="#filings"
          style={{
            padding: "18px 28px",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: PALETTE.paper,
            border: `1px solid ${PALETTE.ruleStrong}`,
            borderLeft: "none",
            borderRadius: 0,
          }}
        >
          기능 둘러보기
        </a>
      </div>
    </section>
  );
}

function Sep() {
  return <span style={{ color: PALETTE.ruleStrong }}>—</span>;
}

/* ──────────────────────────────────────
   BYLINES — three KPI numerals as wire stats
   ────────────────────────────────────── */

function Bylines() {
  const stats: [string, string, string][] = [
    ["30+", "신뢰 소스", "Reuters · 연합 · WSJ · 매경 · 한경 외"],
    ["90초", "갱신 주기", "속보 카테고리 별도 fast-poll"],
    ["₩0", "AI 비용", "기기 안에서 동작하는 로컬 모델"],
  ];
  return (
    <section
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: "0 32px 96px",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          borderTop: `1px solid ${PALETTE.ruleStrong}`,
          borderBottom: `1px solid ${PALETTE.ruleStrong}`,
        }}
      >
        {stats.map(([value, label, blurb], i) => (
          <div
            key={label}
            style={{
              padding: "32px 28px",
              borderLeft: i === 0 ? "none" : `1px solid ${PALETTE.rule}`,
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-display-condensed), sans-serif",
                fontSize: "clamp(44px, 5vw, 72px)",
                fontWeight: 400,
                lineHeight: 0.95,
                letterSpacing: "-0.02em",
                color: PALETTE.amber,
                marginBottom: 12,
              }}
            >
              {value}
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: PALETTE.paperDim,
                marginBottom: 8,
              }}
            >
              ─ {label}
            </div>
            <div
              style={{
                fontFamily: "var(--font-serif), serif",
                fontSize: 14,
                lineHeight: 1.55,
                color: PALETTE.paper,
                fontStyle: "italic",
              }}
            >
              {blurb}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ──────────────────────────────────────
   FILINGS GRID — three editorial cards in a wire-bulletin grid
   ────────────────────────────────────── */

function FilingsGrid() {
  const filings = [
    {
      no: "01",
      label: "REAL-TIME WIRE",
      title: "90초 자동 갱신",
      kicker: "속보가 도착하기 전, 새로고침은 우리가 합니다.",
      body: "연합뉴스 · 매일경제 · 한국경제 · Reuters · CNBC가 한 화면에서 동시에 흐릅니다. 속보 카테고리는 90초 fast-poll, 일반 피드는 5분 폴링. 별도 알림 설정 없이 토스트 + 브라우저 푸시.",
    },
    {
      no: "02",
      label: "ON-DEVICE A.I.",
      title: "로컬 요약 · 감성",
      kicker: "외부 API 비용 없이, 기사가 도착하는 그 순간 분류.",
      body: "TF-IDF + Jaccard 유사도로 비슷한 기사를 자동 묶음. 키워드 기반 감성 분석으로 호재 · 악재 · 중립을 즉석 라벨링. 서버 비용 0원, 데이터 외부 송출 0건.",
    },
    {
      no: "03",
      label: "ONE TERMINAL",
      title: "시장과 뉴스, 한 화면",
      kicker: "탭 사이를 오가지 않고 모든 흐름을 모니터링.",
      body: "헤더에서 KOSPI · USD/KRW · S&P · WTI · BTC 가격이 흐르고, 워치리스트 · 포트폴리오 P/L · 경제캘린더가 동일한 대시보드. 7일 · 30일 추세 분석 + 주간 리포트 자동 생성.",
    },
  ];
  return (
    <section
      id="filings"
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: "0 32px 96px",
      }}
    >
      <SectionHeader no="A" label="DAILY FILINGS" subtitle="이 와이어가 다른 와이어와 다른 세 가지" />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 0,
          borderTop: `1px solid ${PALETTE.ruleStrong}`,
        }}
      >
        {filings.map((f, i) => (
          <article
            key={f.no}
            style={{
              padding: "40px 32px",
              borderRight: i < filings.length - 1 ? `1px solid ${PALETTE.rule}` : "none",
              borderBottom: `1px solid ${PALETTE.ruleStrong}`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 12,
                marginBottom: 24,
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: PALETTE.amber,
              }}
            >
              <span style={{ fontSize: 36, fontFamily: "var(--font-display-condensed)", color: PALETTE.amber, letterSpacing: "-0.02em", lineHeight: 1 }}>
                №{f.no}
              </span>
              <span style={{ color: PALETTE.paperDim }}>{f.label}</span>
            </div>

            <h3
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: 26,
                fontWeight: 700,
                lineHeight: 1.2,
                letterSpacing: "-0.018em",
                color: PALETTE.paper,
                marginBottom: 12,
              }}
            >
              {f.title}
            </h3>

            <p
              style={{
                fontFamily: "var(--font-serif), serif",
                fontStyle: "italic",
                fontSize: 16,
                lineHeight: 1.5,
                color: PALETTE.amber,
                marginBottom: 16,
              }}
            >
              {f.kicker}
            </p>

            <p style={{ fontSize: 14, lineHeight: 1.7, color: PALETTE.paperDim }}>{f.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ──────────────────────────────────────
   PULL QUOTE — editorial italic statement
   ────────────────────────────────────── */

function PullQuote() {
  return (
    <section
      style={{
        maxWidth: 980,
        margin: "0 auto",
        padding: "96px 32px",
        textAlign: "left",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: PALETTE.amber,
          marginBottom: 24,
        }}
      >
        ─ EDITOR&apos;S NOTE
      </div>
      <blockquote
        style={{
          fontFamily: "var(--font-serif), serif",
          fontSize: "clamp(28px, 3.6vw, 44px)",
          fontWeight: 400,
          fontStyle: "italic",
          lineHeight: 1.3,
          color: PALETTE.paper,
          margin: 0,
          letterSpacing: "-0.01em",
        }}
      >
        &ldquo;블룸버그 터미널의 정보 밀도를{" "}
        <span style={{ color: PALETTE.amber, fontStyle: "normal", fontFamily: "var(--font-display-condensed)", textTransform: "uppercase" }}>
          X 속보 계정의 속도
        </span>
        로, 무료로.&rdquo;
      </blockquote>
      <div
        style={{
          marginTop: 32,
          paddingTop: 16,
          borderTop: `1px solid ${PALETTE.rule}`,
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: PALETTE.paperDim,
          letterSpacing: "0.08em",
        }}
      >
        — MACROWIRE EDITORIAL
      </div>
    </section>
  );
}

/* ──────────────────────────────────────
   SCHEDULE — pricing presented as a publishing schedule
   ────────────────────────────────────── */

function Schedule() {
  const tiers = [
    {
      name: "FREE",
      price: "₩0",
      period: "PER MONTH",
      desc: "개인 모니터링용 핵심 기능 전부",
      features: ["기본 30개 신뢰 소스", "24시간 분석 범위", "워치리스트 5종목", "기본 시장 데이터 (5분 지연)", "AI 요약 일 50건"],
      cta: "지금 시작",
      flagship: false,
    },
    {
      name: "PRO",
      price: "₩9,900",
      period: "PER MONTH",
      desc: "전문 트레이더 · 매크로 리서처용",
      features: ["전체 60+ 소스 + 속보 우선 큐", "무제한 분석 + 7일 · 30일 추세", "워치리스트 · 포트폴리오 무제한", "실시간 시장 데이터", "AI 무제한 + 주간 리포트", "푸시 · 이메일 속보 알림"],
      cta: "PRO 구독",
      flagship: true,
    },
  ];
  return (
    <section
      id="schedule"
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: "0 32px 96px",
      }}
    >
      <SectionHeader no="B" label="SUBSCRIPTION SCHEDULE" subtitle="BETA 기간 모든 기능 무료. 정식 출시 후 아래 적용." />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: 0,
          borderTop: `1px solid ${PALETTE.ruleStrong}`,
        }}
      >
        {tiers.map((t, i) => (
          <article
            key={t.name}
            style={{
              padding: "40px 32px",
              borderRight: i === 0 ? `1px solid ${PALETTE.rule}` : "none",
              borderBottom: `1px solid ${PALETTE.ruleStrong}`,
              background: t.flagship ? `linear-gradient(180deg, ${PALETTE.ink} 0%, transparent 100%)` : "transparent",
              position: "relative",
            }}
          >
            {t.flagship && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  padding: "6px 12px",
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  fontWeight: 700,
                  color: PALETTE.obsidian,
                  background: PALETTE.amber,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                }}
              >
                ★ FLAGSHIP
              </div>
            )}

            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.20em",
                textTransform: "uppercase",
                color: t.flagship ? PALETTE.amber : PALETTE.paperDim,
                marginBottom: 28,
              }}
            >
              {t.name}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 8,
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-display-condensed), sans-serif",
                  fontSize: 64,
                  fontWeight: 400,
                  letterSpacing: "-0.02em",
                  color: PALETTE.paper,
                  lineHeight: 1,
                }}
              >
                {t.price}
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: PALETTE.paperDim, letterSpacing: "0.16em" }}>
                {t.period}
              </span>
            </div>

            <p
              style={{
                fontFamily: "var(--font-serif), serif",
                fontStyle: "italic",
                fontSize: 14,
                color: PALETTE.paperDim,
                marginBottom: 32,
              }}
            >
              {t.desc}
            </p>

            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 36px" }}>
              {t.features.map((f) => (
                <li
                  key={f}
                  style={{
                    fontSize: 13,
                    lineHeight: 1.6,
                    color: PALETTE.paper,
                    padding: "8px 0",
                    borderBottom: `1px dashed ${PALETTE.rule}`,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: t.flagship ? PALETTE.amber : PALETTE.paperDim,
                      fontSize: 11,
                      flexShrink: 0,
                      paddingTop: 2,
                    }}
                  >
                    {t.flagship ? "✓" : "·"}
                  </span>
                  {f}
                </li>
              ))}
            </ul>

            <Link
              href="/app"
              style={{
                display: "block",
                padding: "14px 0",
                textAlign: "center",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: t.flagship ? PALETTE.obsidian : PALETTE.paper,
                background: t.flagship ? PALETTE.amber : "transparent",
                border: t.flagship ? "none" : `1px solid ${PALETTE.ruleStrong}`,
                borderRadius: 0,
              }}
            >
              {t.cta} →
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ──────────────────────────────────────
   CALL SHEET — final amber CTA card
   ────────────────────────────────────── */

function CallSheet() {
  return (
    <section
      id="callsheet"
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: "0 32px 96px",
      }}
    >
      <div
        style={{
          padding: "80px 48px",
          background: PALETTE.ink,
          borderTop: `2px solid ${PALETTE.amber}`,
          borderBottom: `1px solid ${PALETTE.ruleStrong}`,
          display: "grid",
          gridTemplateColumns: "1fr auto",
          alignItems: "end",
          gap: 48,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: PALETTE.amber,
              marginBottom: 20,
            }}
          >
            ─ CALL SHEET № {dispatchToday()}
          </div>
          <h2
            style={{
              fontFamily: "var(--font-display-condensed), 'Anton', 'Pretendard Variable', sans-serif",
              fontSize: "clamp(40px, 5vw, 72px)",
              fontWeight: 900,
              lineHeight: 0.95,
              letterSpacing: "-0.01em",
              color: PALETTE.paper,
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            가입 없이<br />
            바로 시작.
          </h2>
        </div>
        <Link
          href="/app"
          style={{
            display: "inline-block",
            padding: "20px 36px",
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: PALETTE.obsidian,
            background: PALETTE.amber,
            borderRadius: 0,
            whiteSpace: "nowrap",
          }}
        >
          ENTER TERMINAL →
        </Link>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────
   COLOPHON — newspaper-style footer
   ────────────────────────────────────── */

function Colophon() {
  return (
    <footer
      style={{
        borderTop: `1px solid ${PALETTE.ruleStrong}`,
        padding: "32px 32px 48px",
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "auto 1fr auto",
          alignItems: "center",
          gap: 24,
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          color: PALETTE.paperDim,
        }}
      >
        <Logo size="xs" />
        <span style={{ textAlign: "center", fontSize: 9, letterSpacing: "0.06em", textTransform: "none", fontFamily: "var(--font-serif), serif", fontStyle: "italic" }}>
          본 서비스의 정보는 투자 권유가 아니며, 모든 투자 판단의 책임은 사용자에게 있습니다.
        </span>
        <span>© {new Date().getFullYear()} MACROWIRE</span>
      </div>
    </footer>
  );
}

/* ──────────────────────────────────────
   SHARED PRIMITIVES
   ────────────────────────────────────── */

function SectionHeader({ no, label, subtitle }: { no: string; label: string; subtitle?: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 24,
        paddingBottom: 28,
        marginBottom: 0,
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-display-condensed), sans-serif",
          fontSize: 56,
          color: PALETTE.amber,
          letterSpacing: "-0.02em",
          lineHeight: 1,
        }}
      >
        {no}.
      </span>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: PALETTE.paper,
            marginBottom: 8,
          }}
        >
          {label}
        </div>
        {subtitle && (
          <div
            style={{
              fontFamily: "var(--font-serif), serif",
              fontStyle: "italic",
              fontSize: 16,
              color: PALETTE.paperDim,
              maxWidth: 540,
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}
