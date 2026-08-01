"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "macro-wire-locale";
type Locale = "ko" | "en";

/**
 * Locale toggle. Persists in localStorage and (when signed in) syncs to the
 * server-side User.locale via /api/account/locale.
 *
 * Components that need translated copy can read from this localStorage key
 * via the useLocale() hook in src/hooks/useLocale.ts.
 */
export function LocaleSwitch() {
  const [locale, setLocale] = useState<Locale>("ko");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored === "en" || stored === "ko") setLocale(stored);
  }, []);

  const change = (next: Locale) => {
    setLocale(next);
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next;
    // Best-effort server sync; ignore failure for signed-out users.
    fetch("/api/account/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: next }),
    }).catch(() => {});
    // Hot-broadcast for components subscribed to the change.
    window.dispatchEvent(new CustomEvent("macro-wire-locale", { detail: next }));
  };

  if (!mounted) return <div style={{ width: 56 }} />; // SSR-safe placeholder

  const btn = (k: Locale, label: string) => (
    <button
      onClick={() => change(k)}
      style={{
        background: locale === k ? "color-mix(in srgb, var(--accent) 18%, transparent)" : "transparent",
        color: locale === k ? "var(--accent)" : "var(--muted)",
        border: "none",
        padding: "3px 8px",
        fontSize: 10,
        fontFamily: "var(--font-mono)",
        fontWeight: 700,
        letterSpacing: "0.10em",
        cursor: "pointer",
        borderRadius: 2,
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        border: "1px solid color-mix(in srgb, var(--foreground-bright) 18%, transparent)",
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      {btn("ko", "KO")}
      {btn("en", "EN")}
    </div>
  );
}
