"use client";

import { Show, UserButton, SignInButton } from "@clerk/nextjs";
import Link from "next/link";

/**
 * Top-bar identity slot.
 * - Anonymous: "SIGN IN" link
 * - Authenticated: Clerk avatar dropdown + plan badge slot
 */
export function UserMenu({ tier }: { tier?: "FREE" | "PRO" | "ELITE" }) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button
            style={{
              background: "transparent",
              border: "1px solid color-mix(in srgb, var(--foreground-bright) 18%, transparent)",
              color: "var(--foreground-bright)",
              padding: "5px 10px",
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.10em",
              cursor: "pointer",
              borderRadius: 2,
            }}
          >
            SIGN IN
          </button>
        </SignInButton>
        <Link
          href="/#pricing"
          style={{
            background: "var(--accent)",
            color: "var(--background)",
            padding: "5px 10px",
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            letterSpacing: "0.10em",
            borderRadius: 2,
            textDecoration: "none",
          }}
        >
          GO PRO
        </Link>
      </Show>
      <Show when="signed-in">
        {tier && tier !== "FREE" && (
          <span
            style={{
              fontSize: 10,
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              letterSpacing: "0.12em",
              padding: "2px 6px",
              background: tier === "ELITE" ? "var(--accent)" : "color-mix(in srgb, var(--accent) 15%, transparent)",
              color: tier === "ELITE" ? "var(--background)" : "var(--accent)",
              border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
              borderRadius: 2,
            }}
          >
            {tier}
          </span>
        )}
        <UserButton appearance={{ elements: { avatarBox: { width: 28, height: 28 } } }} />
      </Show>
    </div>
  );
}
