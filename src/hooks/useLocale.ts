"use client";

import { useEffect, useState } from "react";
import { getMessages, type Locale } from "@/i18n";

const STORAGE_KEY = "macro-wire-locale";

export function useLocale(): { locale: Locale; t: ReturnType<typeof getMessages> } {
  const [locale, setLocale] = useState<Locale>("ko");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored === "en" || stored === "ko") setLocale(stored);

    const handler = (e: Event) => {
      const detail = (e as CustomEvent<Locale>).detail;
      if (detail === "en" || detail === "ko") setLocale(detail);
    };
    window.addEventListener("macro-wire-locale", handler);
    return () => window.removeEventListener("macro-wire-locale", handler);
  }, []);

  return { locale, t: getMessages(locale) };
}
