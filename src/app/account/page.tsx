import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { planFromTier } from "@/lib/billing/plans";
import { ManageSubscriptionButton } from "./ManageSubscriptionButton";
import { ReferralCard } from "@/components/ReferralCard";
import { siteUrl } from "@/lib/billing/stripe";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/account");

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { subscription: true },
  });
  if (!user) redirect("/sign-in");

  const plan = planFromTier(user.tier);
  const usageStart = new Date();
  usageStart.setHours(0, 0, 0, 0);
  const usageToday = await prisma.insightUsage.count({
    where: { userId: user.id, createdAt: { gte: usageStart } },
  });

  const fmtDate = (d: Date | null | undefined) =>
    d ? d.toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" }) : "—";

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "#0B0E11",
        color: "#EDEAE0",
        padding: "60px 24px",
        fontFamily: "var(--font-mono)",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <a
          href="/app"
          style={{ fontSize: 11, color: "#72AEF8", letterSpacing: "0.10em", textDecoration: "none" }}
        >
          ← BACK TO WIRE
        </a>
        <h1
          style={{
            fontFamily: "var(--font-display-condensed)",
            fontSize: 48,
            letterSpacing: "0.04em",
            margin: "20px 0 32px",
          }}
        >
          ACCOUNT
        </h1>

        <section style={card}>
          <div style={label}>EMAIL</div>
          <div style={value}>{user.email}</div>
          {user.name && <div style={subValue}>{user.name}</div>}
        </section>

        <section style={card}>
          <div style={label}>PLAN</div>
          <div style={{ ...value, color: user.tier === "FREE" ? "#EDEAE0" : "#72AEF8" }}>
            {plan.name}
            {plan.priceKRW > 0 && (
              <span style={{ marginLeft: 12, fontSize: 12, color: "#8C8C91" }}>
                ₩{plan.priceKRW.toLocaleString()} / 월
              </span>
            )}
          </div>
          {user.subscription && (
            <>
              <div style={{ ...subValue, marginTop: 6 }}>
                상태: <strong>{user.subscription.status}</strong> · 다음 결제일{" "}
                {fmtDate(user.subscription.currentPeriodEnd)}
                {user.subscription.cancelAtPeriodEnd && (
                  <span style={{ color: "#ff6b6b" }}> · 주기 종료 시 해지 예정</span>
                )}
              </div>
              <div style={{ marginTop: 14 }}>
                <ManageSubscriptionButton />
              </div>
            </>
          )}
          {!user.subscription && user.tier === "FREE" && (
            <a
              href="/#pricing"
              style={{
                display: "inline-block",
                marginTop: 14,
                padding: "8px 14px",
                background: "#72AEF8",
                color: "#0B0E11",
                fontWeight: 700,
                fontSize: 12,
                textDecoration: "none",
                letterSpacing: "0.10em",
              }}
            >
              UPGRADE TO PRO
            </a>
          )}
        </section>

        <section style={card}>
          <div style={label}>USAGE — TODAY</div>
          <div style={value}>
            AI insights:{" "}
            <strong>
              {usageToday}
              {plan.limits.aiInsightsPerDay === -1 ? " (unlimited)" : ` / ${plan.limits.aiInsightsPerDay}`}
            </strong>
          </div>
        </section>

        <section style={card}>
          <div style={label}>REFERRAL</div>
          {user.referralBonusUntil && user.referralBonusUntil.getTime() > Date.now() && (
            <div style={{ ...subValue, color: "#22c55e", marginBottom: 10 }}>
              ✓ 추천 보너스 활성 — {fmtDate(user.referralBonusUntil)}까지 PRO 자동 적용
            </div>
          )}
          <ReferralCard code={user.referralCode} siteUrl={siteUrl()} />
        </section>
      </div>
    </main>
  );
}

const card: React.CSSProperties = {
  border: "1px solid rgba(245,240,225,0.12)",
  background: "#11161A",
  padding: "20px 24px",
  marginBottom: 16,
};
const label: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: "0.16em",
  color: "#8C8C91",
  marginBottom: 6,
};
const value: React.CSSProperties = { fontSize: 16 };
const subValue: React.CSSProperties = { fontSize: 12, color: "#8C8C91", marginTop: 4 };
