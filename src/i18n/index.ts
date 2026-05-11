import { ko } from "./messages/ko";
import { en } from "./messages/en";

export type Locale = "ko" | "en";

export const LOCALES: Locale[] = ["ko", "en"];

export function getMessages(locale: Locale) {
  return locale === "en" ? en : ko;
}

export function detectLocale(acceptLanguage?: string | null): Locale {
  if (!acceptLanguage) return "ko";
  const first = acceptLanguage.split(",")[0]?.split("-")[0]?.toLowerCase();
  if (first === "en") return "en";
  return "ko";
}
