"use client";

import { useState } from "react";
import { Show, SignInButton } from "@clerk/nextjs";
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
    ? { ...baseStyle, background: "var(--accent)", color: "var(--background)", border: "1px solid var(--accent)" }
    : { ...baseStyle, background: "transparent", color: "var(--foreground-bright)", border: "1px solid color-mix(in srgb, var(--foreground-bright) 30%, transparent)" };

  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <button
        style={onPrimary}
        onClick={() => {
          window.location.href = "/app";
        }}
      >
        {plan === "free" ? label : "BETA"}
      </button>
    );
  }

  if (plan === "free") {
    return (
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button style={onPrimary}>{label}</button>
        </SignInButton>
      </Show>
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
      <Show when="signed-out">
        <SignInButton mode="modal" forceRedirectUrl={`/?plan=${plan}#pricing`}>
          <button style={onPrimary}>{label}</button>
        </SignInButton>
      </Show>
      <Show when="signed-in">
        <button style={onPrimary} disabled={loading} onClick={start}>
          {loading ? "이동 중…" : label}
        </button>
      </Show>
      {err && (
        <div style={{ marginTop: 8, fontSize: 11, color: "var(--danger)", fontFamily: "var(--font-mono)" }}>
          {err}
        </div>
      )}
    </>
  );
}
