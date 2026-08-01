import Image from "next/image";
import Link from "next/link";
import { editorialSerif } from "./fonts-editorial";
import { Logo } from "@/components/Logo";
import { PLANS, type PlanKey } from "@/lib/billing/plans";

/* ════════════════════════════════════════════════════════════════
   MacroWire — BULLETIN edition landing page
   Reference language: Reuters Wire / AP Bulletin / FT.com / NYT teletype
   ════════════════════════════════════════════════════════════════ */

/**
 * The bulletin palette. Cream on obsidian is the landing page's own voice and
 * stays; the accent is the one the workbench uses, so the marketing page and
 * the product are recognisably the same thing.
 */
const PALETTE = {
  obsidian: "#0B0E11",
  ink: "#11161A",
  paper: "#EDEAE0",
  paperDim: "#A9A79E",
  accent: "#72AEF8",
  rule: "rgba(237,234,224,0.10)",
  ruleStrong: "rgba(237,234,224,0.18)",
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
      className={editorialSerif.variable}
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
    <header className="mw-landing-masthead">
      <div className="mw-landing-masthead-inner">
        <Logo size="sm" caption />

        <nav className="mw-landing-masthead-nav">
          <a href="#filings" className="bul-link">FILINGS</a>
          <a href="#schedule" className="bul-link">SCHEDULE</a>
          <a href="#callsheet" className="bul-link">SUBSCRIBE</a>
        </nav>

        <Link href="/app" className="mw-landing-masthead-cta">
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
    <section className="mw-landing-hero">
      <Image
        src="/images/macrowire-wire-desk.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="mw-landing-hero-image"
      />
      <div className="mw-landing-hero-shade" aria-hidden="true" />

      <div className="mw-landing-hero-inner">
        <div className="mw-landing-hero-dateline">
          <span style={{ color: PALETTE.accent }}>● LIVE</span>
          <Sep />
          <span>{dateline()}</span>
          <Sep />
          <span>SEOUL</span>
          <Sep />
          <span>WIRE №{dispatchToday()}</span>
          <span style={{ marginLeft: "auto" }}>EST. 2026</span>
        </div>

        <div className="mw-landing-hero-copy">
          <h1 className="mw-landing-hero-title">
            매크로 경제,<br />
            <span style={{ color: PALETTE.accent }}>분 단위</span> 와이어로.
          </h1>
          <p className="mw-landing-hero-deck">
            30개 이상의 공개 RSS 소스를 한 화면에 모으는 매크로 디스패치. 정책·시장·기업 뉴스를 빠르게 훑고 중요한 흐름에 집중하는 와이어 피드.
          </p>
          <div className="mw-landing-hero-actions">
            <Link href="/app" className="mw-landing-hero-primary">
              무료로 시작 →
            </Link>
            <a href="#filings" className="mw-landing-hero-secondary">
              기능 둘러보기
            </a>
          </div>
        </div>
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
    ["36", "공개 소스", "연합 · WSJ · CNBC · 매경 · 한경 외"],
    ["KST", "기준 시각", "국내·해외 지표를 한국 시간으로 정렬"],
    ["5분", "속보 큐 주기", "전체 피드는 매시 갱신 · 목표 주기"],
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
                fontFamily: "var(--font-interface)",
                fontSize: "clamp(44px, 5vw, 72px)",
                fontWeight: 400,
                lineHeight: 0.95,
                letterSpacing: "-0.02em",
                color: PALETTE.accent,
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
      title: "상시 자동 수집",
      kicker: "속보가 도착하기 전, 새로고침은 우리가 합니다.",
      body: "연합뉴스 · 매일경제 · 한국경제 · CNBC 등 공개 피드가 한 화면에서 흐릅니다. 고신호 속보는 우선 수집하고 일반 피드는 정기 갱신합니다. 별도 새로고침 없이 새로운 기사를 확인할 수 있습니다.",
    },
    {
      no: "02",
      label: "SIGNAL FIRST",
      title: "분류는 즉시, 해설은 AI로",
      kicker: "무엇이 중요한지는 규칙으로, 왜 중요한지는 모델로.",
      body: "클러스터링(TF-IDF · Jaccard)과 감성 라벨링은 서버에서 규칙 기반으로 즉시 처리합니다. \"왜 중요한가\"를 정리하는 인사이트와 일일 리캡은 Claude가 담당하며, 이때 기사 제목과 요약이 Anthropic API로 전송됩니다.",
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
                color: PALETTE.accent,
              }}
            >
              <span style={{ fontSize: 36, fontFamily: "var(--font-interface)", color: PALETTE.accent, letterSpacing: "-0.02em", lineHeight: 1 }}>
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
                color: PALETTE.accent,
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
          color: PALETTE.accent,
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
        <span style={{ color: PALETTE.accent, fontStyle: "normal", fontFamily: "var(--font-interface)", textTransform: "uppercase" }}>
          공개 뉴스 와이어의 흐름
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

const PLAN_BLURBS: Record<PlanKey, string> = {
  free: "개인 모니터링용 핵심 기능",
  pro: "전문 트레이더 · 매크로 리서처용",
  elite: "데스크 단위 리서치 · API 연동",
};

function Schedule() {
  // Copied plan tables drift from the gate that actually enforces them: this
  // page promised 50 AI summaries a day against a limit of 3, and "60+ 소스"
  // against a catalogue of 36. The table is now rendered from the same PLANS
  // object the billing gate reads, so the two cannot disagree again.
  const tiers = (Object.keys(PLANS) as PlanKey[]).map((key) => {
    const plan = PLANS[key];
    return {
      name: plan.name,
      price: `₩${plan.priceKRW.toLocaleString("ko-KR")}`,
      period: "PER MONTH",
      desc: PLAN_BLURBS[key],
      features: plan.bullets.map((b) => b.ko),
      cta: plan.priceKRW === 0 ? "지금 시작" : `${plan.name} 구독`,
      flagship: Boolean(plan.highlight),
    };
  });
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
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 0,
          borderTop: `1px solid ${PALETTE.ruleStrong}`,
        }}
      >
        {tiers.map((t, i) => (
          <article
            key={t.name}
            style={{
              padding: "40px 32px",
              borderRight: i < tiers.length - 1 ? `1px solid ${PALETTE.rule}` : "none",
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
                  background: PALETTE.accent,
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
                color: t.flagship ? PALETTE.accent : PALETTE.paperDim,
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
                  fontFamily: "var(--font-interface)",
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
                      color: t.flagship ? PALETTE.accent : PALETTE.paperDim,
                      fontSize: 11,
                      flexShrink: 0,
                      paddingTop: 2,
                    }}
                  >
                    ✓
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
                background: t.flagship ? PALETTE.accent : "transparent",
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
   CALL SHEET — final accent CTA card
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
          borderTop: `2px solid ${PALETTE.accent}`,
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
              color: PALETTE.accent,
              marginBottom: 20,
            }}
          >
            ─ CALL SHEET № {dispatchToday()}
          </div>
          <h2
            style={{
              fontFamily: "var(--font-interface)",
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
            background: PALETTE.accent,
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
          fontFamily: "var(--font-interface)",
          fontSize: 56,
          color: PALETTE.accent,
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
