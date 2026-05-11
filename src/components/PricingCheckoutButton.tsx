"use client";

import { useState } from "react";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import type { PlanKey } from "@/lib/billing/plans";

export function PricingCheckoutButton({
  plan,
  label,
  highlight,
}: {
  plan: PlanKey;
  label: string;
  highlight?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const baseStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 16px",
    fontSize: 12,
    fontFamily: "var(--font-mono)",
    fontWeight: 700,
    letterSpacing: "0.10em",
    textTransform: "uppercase",
    cursor: "pointer",
    borderRadius: 2,
    transition: "background 0.15s",
  };
  const onPrimary: React.CSSProperties = highlight
    ? { ...baseStyle, background: "#FFB000", color: "#08090B", border: "1px solid #FFB000" }
    : { ...baseStyle, background: "transparent", color: "#F5F0E1", border: "1px solid rgba(245,240,225,0.30)" };

  if (plan === "free") {
    return (
      <SignedOut>
        <SignInButton mode="modal">
          <button style={onPrimary}>{label}</button>
        </SignInButton>
      </SignedOut>
    );
  }

  const start = async () => {
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "결제 시작 실패");
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch (e) {
      setErr(String(e));
      setLoading(false);
    }
  };

  return (
    <>
      <SignedOut>
        <SignInButton mode="modal" forceRedirectUrl={`/?plan=${plan}#pricing`}>
          <button style={onPrimary}>{label}</button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <button style={onPrimary} disabled={loading} onClick={start}>
          {loading ? "이동 중…" : label}
        </button>
      </SignedIn>
      {err && (
        <div style={{ marginTop: 8, fontSize: 11, color: "#ff6b6b", fontFamily: "var(--font-mono)" }}>
          {err}
        </div>
      )}
    </>
  );
}
