import { SignUp } from "@clerk/nextjs";
import Link from "next/link";

export default function Page() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", background: "#0B0E11", color: "#EDEAE0" }}>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ color: "#72AEF8" }}>MACROWIRE</h1>
          <p>Authentication is not configured.</p>
          <Link href="/app" style={{ color: "#72AEF8" }}>OPEN APP</Link>
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
        background: "#0B0E11",
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
            color: "#72AEF8",
          }}
        >
          MACROWIRE
        </div>
        <SignUp
          appearance={{
            elements: {
              card: { background: "#11161A", border: "1px solid rgba(245,240,225,0.10)" },
              headerTitle: { color: "#EDEAE0" },
              formButtonPrimary: { background: "#72AEF8", color: "#0B0E11", fontWeight: 700 },
            },
          }}
        />
      </div>
    </main>
  );
}
