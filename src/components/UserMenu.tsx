"use client";

import { SignedIn, SignedOut, UserButton, SignInButton } from "@clerk/nextjs";
import Link from "next/link";

/**
 * Top-bar identity slot.
 * - Anonymous: "SIGN IN" link
 * - Authenticated: Clerk avatar dropdown + plan badge slot
 */
export function UserMenu({ tier }: { tier?: "FREE" | "PRO" | "ELITE" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <SignedOut>
        <SignInButton mode="modal">
          <button
            style={{
              background: "transparent",
              border: "1px solid rgba(245,240,225,0.18)",
              color: "#F5F0E1",
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
            background: "#FFB000",
            color: "#08090B",
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
      </SignedOut>
      <SignedIn>
        {tier && tier !== "FREE" && (
          <span
            style={{
              fontSize: 10,
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              letterSpacing: "0.12em",
              padding: "2px 6px",
              background: tier === "ELITE" ? "#FFB000" : "rgba(255,176,0,0.15)",
              color: tier === "ELITE" ? "#08090B" : "#FFB000",
              border: "1px solid rgba(255,176,0,0.30)",
              borderRadius: 2,
            }}
          >
            {tier}
          </span>
        )}
        <UserButton
          afterSignOutUrl="/"
          appearance={{ elements: { avatarBox: { width: 28, height: 28 } } }}
        />
      </SignedIn>
    </div>
  );
}
