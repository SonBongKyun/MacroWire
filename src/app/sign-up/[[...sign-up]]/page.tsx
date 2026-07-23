import { SignUp } from "@clerk/nextjs";
import Link from "next/link";

export default function Page() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", background: "#08090B", color: "#F5F0E1" }}>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ color: "#FFB000" }}>MACROWIRE</h1>
          <p>Authentication is not configured.</p>
          <Link href="/app" style={{ color: "#FFB000" }}>OPEN APP</Link>
        </div>
      </main>
    );
  }
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        background: "#08090B",
        padding: "40px 20px",
      }}
    >
      <div>
        <div
          style={{
            textAlign: "center",
            marginBottom: 24,
            fontFamily: "var(--font-display-condensed)",
            fontSize: 32,
            letterSpacing: "0.08em",
            color: "#FFB000",
          }}
        >
          MACROWIRE
        </div>
        <SignUp
          appearance={{
            elements: {
              card: { background: "#0D0D0F", border: "1px solid rgba(245,240,225,0.10)" },
              headerTitle: { color: "#F5F0E1" },
              formButtonPrimary: { background: "#FFB000", color: "#08090B", fontWeight: 700 },
            },
          }}
        />
      </div>
    </main>
  );
}
