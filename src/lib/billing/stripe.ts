import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key && process.env.NODE_ENV === "production") {
  console.warn("[stripe] STRIPE_SECRET_KEY not set — billing endpoints will 500");
}

export const stripe = new Stripe(key ?? "sk_test_placeholder", {
  typescript: true,
});

export function siteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return vercel.startsWith("http") ? vercel : `https://${vercel}`;
  return "https://macro-wire-psi.vercel.app";
}
