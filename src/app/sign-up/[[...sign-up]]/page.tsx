import { SignUp } from "@clerk/nextjs";

export default function Page() {
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
