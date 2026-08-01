"use client";

import { useState } from "react";

export function ReferralCard({ code, siteUrl }: { code: string; siteUrl: string }) {
  const url = `${siteUrl}/r/${code}`;
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const tweet = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    "매크로 뉴스를 AI가 정리해주는 와이어 — MacroWire. 내 추천코드로 가입하면 양쪽 모두 1개월 PRO 무료."
  )}&url=${encodeURIComponent(url)}`;

  return (
    <div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <code
          style={{
            flex: 1,
            padding: "8px 12px",
            background: "#15151A",
            border: "1px solid color-mix(in srgb, var(--foreground-bright) 12%, transparent)",
            fontSize: 12,
            fontFamily: "var(--font-mono)",
            color: "var(--accent)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {url}
        </code>
        <button
          onClick={copy}
          style={{
            background: copied ? "var(--success)" : "transparent",
            color: copied ? "var(--background)" : "var(--foreground-bright)",
            border: "1px solid color-mix(in srgb, var(--foreground-bright) 18%, transparent)",
            padding: "8px 12px",
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.10em",
            cursor: "pointer",
          }}
        >
          {copied ? "COPIED" : "COPY"}
        </button>
        <a
          href={tweet}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            background: "transparent",
            color: "var(--foreground-bright)",
            border: "1px solid color-mix(in srgb, var(--foreground-bright) 18%, transparent)",
            padding: "8px 12px",
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.10em",
            textDecoration: "none",
          }}
        >
          X / TWEET
        </a>
      </div>
      <div style={{ fontSize: 11, color: "var(--muted)" }}>
        링크 누른 친구가 가입하면 둘 다 1개월 PRO 자동 적용.
      </div>
    </div>
  );
}
