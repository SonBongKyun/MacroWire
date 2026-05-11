import { Resend } from "resend";

const key = process.env.RESEND_API_KEY;
if (!key && process.env.NODE_ENV === "production") {
  console.warn("[resend] RESEND_API_KEY not set — email digest will fail");
}

export const resend = new Resend(key ?? "re_placeholder");

export const fromAddress = process.env.RESEND_FROM ?? "MacroWire <noreply@macro-wire-psi.vercel.app>";
