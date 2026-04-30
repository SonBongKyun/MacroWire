import Link from "next/link";
import { Logo } from "@/components/Logo";

/* ════════════════════════════════════════════════════════════════
   MacroWire — Marketing landing page (public-facing /)
   The actual application lives at /app.
   ════════════════════════════════════════════════════════════════ */

const FEATURES = [
  {
    eyebrow: "00",
    title: "90초마다 자동 갱신",
    blurb:
      "30개 이상의 신뢰 소스에서 90초마다 속보를 가져옵니다. 연합뉴스, 매일경제, 한국경제, Reuters, CNBC가 같은 화면에서 동시에 흘러갑니다.",
    visual: "spike",
  },
  {
    eyebrow: "01",
    title: "로컬 AI 요약·감성",
    blurb:
      "외부 API 비용 없이 기기 안에서 동작합니다. 호재·악재·중립을 실시간으로 라벨링하고 비슷한 기사는 자동으로 묶어 노출합니다.",
    visual: "sentiment",
  },
  {
    eyebrow: "02",
    title: "시장과 뉴스, 한 화면",
    blurb:
      "KOSPI · USD/KRW · S&P · WTI · BTC 가격이 헤더에서 흐르고, 워치리스트와 포트폴리오 P/L을 같은 대시보드에서 추적합니다.",
    visual: "market",
  },
] as const;

const PRICING = [
  {
    name: "Free",
    price: "₩0",
    period: "영구 무료",
    desc: "개인 모니터링용 핵심 기능 전부.",
    features: [
      "기본 30개 신뢰 소스",
      "24시간 분석 범위",
      "워치리스트 5종목",
      "기본 시장 데이터 (5분 지연)",
      "AI 요약 일 50건",
    ],
    cta: "지금 시작",
    href: "/app",
    accent: false,
  },
  {
    name: "Pro",
    price: "₩9,900",
    period: "월간",
    desc: "전문 트레이더·매크로 리서처용.",
    features: [
      "전체 60+ 소스 + 속보 우선 큐",
      "무제한 분석 + 7일·30일 추세",
      "워치리스트·포트폴리오 무제한",
      "실시간 시장 데이터",
      "AI 무제한 + 주간 리포트",
      "푸시·이메일 속보 알림",
    ],
    cta: "Pro 시작",
    href: "/app",
    accent: true,
  },
] as const;

export default function LandingPage() {
  return (
    <main
      className="text-[#EBEBEB]"
      style={{
        background: "#0D0E12",
        // Body uses `overflow: hidden` for the app shell; the landing creates
        // its own vertical scroll context here.
        height: "100vh",
        overflowY: "auto",
        overflowX: "hidden",
      }}
    >
      {/* Single ambient gold light source — same language as the app */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          background:
            "radial-gradient(60% 50% at 88% 0%, rgba(201,169,110,0.10) 0%, rgba(201,169,110,0.04) 35%, transparent 65%), radial-gradient(50% 40% at 8% 100%, rgba(201,169,110,0.04) 0%, rgba(201,169,110,0.015) 40%, transparent 70%)",
        }}
      />

      <div style={{ position: "relative", zIndex: 1 }}>
        <MarketingHeader />
        <Hero />
        <FeatureGrid />
        <BigPullquote />
        <Pricing />
        <FinalCTA />
        <Footer />
      </div>
    </main>
  );
}

/* ──────────────────────────────────────
   HEADER
   ────────────────────────────────────── */

function MarketingHeader() {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        backdropFilter: "blur(20px) saturate(1.2)",
        background: "rgba(13,14,18,0.65)",
        borderBottom: "1px solid rgba(201,169,110,0.08)",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "16px 32px",
          display: "flex",
          alignItems: "center",
          gap: 32,
        }}
      >
        <Logo size="sm" />

        <nav
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 28,
            fontSize: 14,
            fontWeight: 500,
            color: "#8C8C91",
          }}
        >
          <a href="#features" className="lp-link">기능</a>
          <a href="#pricing" className="lp-link">요금제</a>
          <Link
            href="/app"
            style={{
              padding: "8px 18px",
              borderRadius: 4,
              fontSize: 13,
              fontWeight: 700,
              color: "#0D0E12",
              background:
                "linear-gradient(135deg, #E5C896 0%, #C9A96E 50%, #B8945C 100%)",
              boxShadow: "0 4px 14px rgba(201,169,110,0.25)",
              letterSpacing: "-0.01em",
            }}
          >
            앱 열기 →
          </Link>
        </nav>
      </div>
    </header>
  );
}

/* ──────────────────────────────────────
   HERO
   ────────────────────────────────────── */

function Hero() {
  return (
    <section
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "96px 32px 80px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "#C9A96E",
          padding: "8px 14px",
          borderRadius: 99,
          background: "rgba(201,169,110,0.08)",
          border: "1px solid rgba(201,169,110,0.20)",
          marginBottom: 32,
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: 6,
            height: 6,
            borderRadius: "50%",
            backgroundColor: "#C9A96E",
            boxShadow: "0 0 8px rgba(201,169,110,0.6)",
            animation: "pulse-dot 1.6s ease-in-out infinite",
          }}
        />
        실시간 매크로 와이어 · BETA
      </div>

      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(40px, 7vw, 88px)",
          fontWeight: 800,
          lineHeight: 1.05,
          letterSpacing: "-0.028em",
          color: "#EBEBEB",
          marginBottom: 24,
        }}
      >
        분 단위로 도착하는<br />
        <span
          style={{
            background:
              "linear-gradient(135deg, #E5C896 0%, #C9A96E 50%, #B8945C 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          매크로 경제 와이어
        </span>
        .
      </h1>

      <p
        style={{
          fontSize: 18,
          lineHeight: 1.6,
          color: "#A1A1A6",
          maxWidth: 640,
          margin: "0 auto 44px",
          letterSpacing: "-0.008em",
        }}
      >
        30개 이상의 신뢰 소스에서 90초마다 속보를 가져옵니다.
        AI가 정리하는 진짜 실시간 피드 — X/Twitter 속보 계정을 더 이상 새로고침할 필요가 없습니다.
      </p>

      <div
        style={{
          display: "flex",
          gap: 12,
          justifyContent: "center",
          flexWrap: "wrap",
          marginBottom: 80,
        }}
      >
        <Link
          href="/app"
          style={{
            padding: "16px 28px",
            borderRadius: 4,
            fontSize: 15,
            fontWeight: 700,
            color: "#0D0E12",
            background:
              "linear-gradient(135deg, #E5C896 0%, #C9A96E 50%, #B8945C 100%)",
            boxShadow: "0 8px 28px rgba(201,169,110,0.25)",
            letterSpacing: "-0.01em",
          }}
        >
          무료로 시작하기 →
        </Link>
        <a
          href="#features"
          style={{
            padding: "16px 28px",
            borderRadius: 4,
            fontSize: 15,
            fontWeight: 600,
            color: "#EBEBEB",
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.10)",
            letterSpacing: "-0.01em",
          }}
        >
          기능 둘러보기
        </a>
      </div>

      {/* Hero visual — Spike mark XL with surrounding gold halo */}
      <div
        style={{
          position: "relative",
          margin: "0 auto",
          maxWidth: 760,
          padding: "60px 32px",
          borderRadius: 12,
          border: "1px solid rgba(201,169,110,0.14)",
          background:
            "linear-gradient(180deg, rgba(21,22,28,0.5) 0%, rgba(13,14,18,0.3) 100%)",
          boxShadow:
            "0 20px 60px -20px rgba(0,0,0,0.6), 0 0 100px -20px rgba(201,169,110,0.08)",
        }}
      >
        <Logo size="xl" />
        <div
          style={{
            marginTop: 28,
            display: "flex",
            justifyContent: "center",
            gap: 32,
            fontSize: 13,
            color: "#8C8C91",
            fontFamily: "var(--font-mono)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <Stat label="소스" value="30+" />
          <Divider />
          <Stat label="갱신 주기" value="90s" />
          <Divider />
          <Stat label="AI 비용" value="₩0" />
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <span style={{ fontSize: 22, fontWeight: 700, color: "#C9A96E", letterSpacing: "-0.02em" }}>
        {value}
      </span>
      <span style={{ fontSize: 10, color: "#8C8C91", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {label}
      </span>
    </div>
  );
}

function Divider() {
  return <span style={{ width: 1, background: "rgba(255,255,255,0.08)" }} />;
}

/* ──────────────────────────────────────
   FEATURE GRID
   ────────────────────────────────────── */

function FeatureGrid() {
  return (
    <section
      id="features"
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "100px 32px",
      }}
    >
      <SectionEyebrow>핵심 기능</SectionEyebrow>
      <SectionHeadline>매크로 경제, 가장 빠르게.</SectionHeadline>
      <p
        style={{
          fontSize: 16,
          color: "#8C8C91",
          maxWidth: 540,
          marginBottom: 64,
          lineHeight: 1.6,
        }}
      >
        하나의 단순한 화면에서 속보·시장·포트폴리오를 한 번에 모니터링합니다.
        외부 의존 없이 로컬에서 동작하는 AI가 모든 흐름을 정리합니다.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 20,
        }}
      >
        {FEATURES.map((f) => (
          <FeatureCard key={f.eyebrow} {...f} />
        ))}
      </div>
    </section>
  );
}

function FeatureCard({
  eyebrow,
  title,
  blurb,
  visual,
}: {
  eyebrow: string;
  title: string;
  blurb: string;
  visual: "spike" | "sentiment" | "market";
}) {
  return (
    <article
      style={{
        padding: 28,
        borderRadius: 8,
        background: "linear-gradient(180deg, rgba(21,22,28,0.6) 0%, rgba(15,16,22,0.4) 100%)",
        border: "1px solid rgba(255,255,255,0.06)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ height: 96, marginBottom: 24, display: "flex", alignItems: "center" }}>
        <FeatureVisual variant={visual} />
      </div>
      <div
        style={{
          fontSize: 10,
          color: "#C9A96E",
          letterSpacing: "0.16em",
          fontFamily: "var(--font-mono)",
          marginBottom: 8,
        }}
      >
        {eyebrow}
      </div>
      <h3
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: 20,
          fontWeight: 700,
          color: "#EBEBEB",
          letterSpacing: "-0.018em",
          marginBottom: 10,
          lineHeight: 1.3,
        }}
      >
        {title}
      </h3>
      <p style={{ fontSize: 14, lineHeight: 1.65, color: "#A1A1A6" }}>{blurb}</p>
    </article>
  );
}

function FeatureVisual({ variant }: { variant: "spike" | "sentiment" | "market" }) {
  if (variant === "spike") {
    return (
      <svg width="100%" height="80" viewBox="0 0 280 80" fill="none">
        <defs>
          <linearGradient id="lp-spike" x1="0" y1="0" x2="280" y2="0">
            <stop offset="0%" stopColor="#C9A96E" stopOpacity="0" />
            <stop offset="50%" stopColor="#C9A96E" stopOpacity="1" />
            <stop offset="100%" stopColor="#C9A96E" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M0 50 L80 50 L100 18 L120 62 L140 50 L280 50"
          stroke="url(#lp-spike)"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="100" cy="18" r="3.5" fill="#C9A96E" />
      </svg>
    );
  }
  if (variant === "sentiment") {
    return (
      <div style={{ display: "flex", gap: 10, alignItems: "flex-end", width: "100%" }}>
        {[0.6, 0.85, 0.4, 0.95, 0.55, 0.7, 0.3].map((h, i) => {
          const colors = ["#22c55e", "#22c55e", "#ef4444", "#22c55e", "#8C8C91", "#22c55e", "#ef4444"];
          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${h * 80}px`,
                background: colors[i],
                borderRadius: 2,
                opacity: 0.7,
              }}
            />
          );
        })}
      </div>
    );
  }
  // market
  return (
    <svg width="100%" height="80" viewBox="0 0 280 80" fill="none">
      <path
        d="M0 60 L40 50 L80 55 L120 30 L160 35 L200 20 L240 25 L280 12"
        stroke="#22c55e"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M0 60 L40 50 L80 55 L120 30 L160 35 L200 20 L240 25 L280 12 L280 80 L0 80 Z"
        fill="url(#lp-market-fill)"
        opacity="0.15"
      />
      <defs>
        <linearGradient id="lp-market-fill" x1="0" y1="0" x2="0" y2="80">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ──────────────────────────────────────
   PULL-QUOTE / DIFFERENTIATOR
   ────────────────────────────────────── */

function BigPullquote() {
  return (
    <section
      style={{
        maxWidth: 1000,
        margin: "0 auto",
        padding: "80px 32px",
        textAlign: "center",
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(26px, 4vw, 42px)",
          fontWeight: 700,
          lineHeight: 1.35,
          letterSpacing: "-0.02em",
          color: "#EBEBEB",
          maxWidth: 880,
          margin: "0 auto",
        }}
      >
        블룸버그 터미널의 정보 밀도를 <br />
        <span style={{ color: "#C9A96E" }}>X 속보 계정의 속도</span>로,{" "}
        <span style={{ color: "#8C8C91" }}>무료로</span>.
      </p>
    </section>
  );
}

/* ──────────────────────────────────────
   PRICING
   ────────────────────────────────────── */

function Pricing() {
  return (
    <section
      id="pricing"
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "100px 32px",
      }}
    >
      <SectionEyebrow>요금제</SectionEyebrow>
      <SectionHeadline>지금은 모든 기능 무료.</SectionHeadline>
      <p
        style={{
          fontSize: 16,
          color: "#8C8C91",
          maxWidth: 540,
          marginBottom: 56,
          lineHeight: 1.6,
        }}
      >
        BETA 기간 동안 모든 기능을 제한 없이 사용할 수 있습니다.
        정식 출시 후엔 아래 요금제가 적용됩니다.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 20,
        }}
      >
        {PRICING.map((p) => (
          <PricingCard key={p.name} {...p} />
        ))}
      </div>
    </section>
  );
}

function PricingCard({
  name,
  price,
  period,
  desc,
  features,
  cta,
  href,
  accent,
}: {
  name: string;
  price: string;
  period: string;
  desc: string;
  features: readonly string[];
  cta: string;
  href: string;
  accent: boolean;
}) {
  return (
    <article
      style={{
        padding: 32,
        borderRadius: 8,
        background: accent
          ? "linear-gradient(180deg, rgba(201,169,110,0.06) 0%, rgba(21,22,28,0.6) 100%)"
          : "linear-gradient(180deg, rgba(21,22,28,0.6) 0%, rgba(15,16,22,0.4) 100%)",
        border: accent
          ? "1px solid rgba(201,169,110,0.30)"
          : "1px solid rgba(255,255,255,0.06)",
        boxShadow: accent ? "0 12px 48px -12px rgba(201,169,110,0.20)" : "none",
        position: "relative",
      }}
    >
      {accent && (
        <span
          style={{
            position: "absolute",
            top: 16,
            right: 20,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.12em",
            color: "#0D0E12",
            background: "linear-gradient(135deg, #E5C896, #C9A96E)",
            padding: "4px 10px",
            borderRadius: 99,
          }}
        >
          POPULAR
        </span>
      )}
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: accent ? "#C9A96E" : "#8C8C91",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          marginBottom: 12,
        }}
      >
        {name}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 40,
            fontWeight: 800,
            color: "#EBEBEB",
            letterSpacing: "-0.022em",
          }}
        >
          {price}
        </span>
        <span style={{ fontSize: 13, color: "#8C8C91" }}>/ {period}</span>
      </div>
      <p style={{ fontSize: 13, color: "#A1A1A6", marginBottom: 20, lineHeight: 1.5 }}>{desc}</p>

      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: "0 0 28px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {features.map((feat) => (
          <li
            key={feat}
            style={{
              fontSize: 13,
              color: "#EBEBEB",
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              lineHeight: 1.5,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 4 }}>
              <path
                d="M3 7.5L5.5 10L11 4"
                stroke={accent ? "#C9A96E" : "#22c55e"}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>{feat}</span>
          </li>
        ))}
      </ul>

      <Link
        href={href}
        style={{
          display: "block",
          padding: "13px",
          borderRadius: 4,
          textAlign: "center",
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: "-0.01em",
          color: accent ? "#0D0E12" : "#EBEBEB",
          background: accent
            ? "linear-gradient(135deg, #E5C896 0%, #C9A96E 50%, #B8945C 100%)"
            : "rgba(255,255,255,0.04)",
          border: accent ? "none" : "1px solid rgba(255,255,255,0.10)",
          boxShadow: accent ? "0 6px 20px rgba(201,169,110,0.22)" : "none",
        }}
      >
        {cta} →
      </Link>
    </article>
  );
}

/* ──────────────────────────────────────
   FINAL CTA
   ────────────────────────────────────── */

function FinalCTA() {
  return (
    <section
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "100px 32px 80px",
      }}
    >
      <div
        style={{
          padding: "80px 48px",
          borderRadius: 16,
          textAlign: "center",
          background:
            "radial-gradient(80% 100% at 50% 0%, rgba(201,169,110,0.12) 0%, rgba(13,14,18,0.6) 60%)",
          border: "1px solid rgba(201,169,110,0.20)",
          boxShadow: "0 24px 80px -24px rgba(201,169,110,0.18)",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(28px, 4.5vw, 48px)",
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: "-0.022em",
            color: "#EBEBEB",
            marginBottom: 16,
          }}
        >
          매크로 모니터링이 이렇게 단순할 수 있습니다.
        </h2>
        <p
          style={{
            fontSize: 16,
            color: "#A1A1A6",
            maxWidth: 500,
            margin: "0 auto 36px",
            lineHeight: 1.6,
          }}
        >
          가입 없이 바로 시작 — 수집·분석·시장 데이터까지 모두 무료.
        </p>
        <Link
          href="/app"
          style={{
            display: "inline-block",
            padding: "18px 36px",
            borderRadius: 4,
            fontSize: 16,
            fontWeight: 700,
            color: "#0D0E12",
            background:
              "linear-gradient(135deg, #E5C896 0%, #C9A96E 50%, #B8945C 100%)",
            boxShadow: "0 12px 36px rgba(201,169,110,0.30)",
            letterSpacing: "-0.012em",
          }}
        >
          MacroWire 시작 →
        </Link>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────
   FOOTER
   ────────────────────────────────────── */

function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid rgba(255,255,255,0.06)",
        padding: "48px 32px 32px",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "flex",
          gap: 24,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <Logo size="xs" />
        <span style={{ fontSize: 12, color: "#8C8C91" }}>
          © {new Date().getFullYear()} MacroWire. 모든 권리 보유.
        </span>
        <span style={{ fontSize: 11, color: "#8C8C91", marginLeft: "auto" }}>
          본 서비스의 정보는 투자 권유가 아니며, 모든 투자 판단의 책임은 사용자에게 있습니다.
        </span>
      </div>
    </footer>
  );
}

/* ──────────────────────────────────────
   SHARED PRIMITIVES
   ────────────────────────────────────── */

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: "#C9A96E",
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        marginBottom: 16,
        fontFamily: "var(--font-mono)",
      }}
    >
      — {children}
    </div>
  );
}

function SectionHeadline({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontFamily: "var(--font-display)",
        fontSize: "clamp(28px, 4vw, 44px)",
        fontWeight: 800,
        lineHeight: 1.15,
        letterSpacing: "-0.024em",
        color: "#EBEBEB",
        marginBottom: 12,
        maxWidth: 720,
      }}
    >
      {children}
    </h2>
  );
}
