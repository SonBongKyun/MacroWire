import { Spline_Sans_Mono } from "next/font/google";

/**
 * Numerals only.
 *
 * Prices, yields, timestamps and counters have to line up in a column; nothing
 * else in the app uses this face.
 *
 * Spline Sans Mono rather than the usual suspects. JetBrains Mono, IBM Plex
 * Mono and Roboto Mono all carry a strong "developer tool" signature — the
 * first two by association, the last by being Google's default answer to every
 * question. Spline Sans Mono is narrow and even at the 9–13px the desk actually
 * renders figures at, has unambiguous 0/1/7, and reads as instrumentation
 * rather than as a code editor.
 */
export const dataMono = Spline_Sans_Mono({
  variable: "--font-mono",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});
