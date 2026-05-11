"use client";

import { useState } from "react";

export function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const go = async () => {
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "포털 열기 실패");
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
      <button
        onClick={go}
        disabled={loading}
        style={{
          background: "transparent",
          color: "#F5F0E1",
          border: "1px solid rgba(245,240,225,0.30)",
          padding: "8px 14px",
          fontSize: 12,
          fontFamily: "var(--font-mono)",
          letterSpacing: "0.10em",
          cursor: "pointer",
        }}
      >
        {loading ? "이동 중…" : "MANAGE SUBSCRIPTION"}
      </button>
      {err && (
        <div style={{ marginTop: 8, fontSize: 11, color: "#ff6b6b", fontFamily: "var(--font-mono)" }}>
          {err}
        </div>
      )}
    </>
  );
}
