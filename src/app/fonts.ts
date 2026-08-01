import { Roboto_Mono } from "next/font/google";

/**
 * Numerals only.
 *
 * The interface used to pair IBM Plex Sans with JetBrains Mono over Pretendard
 * — three families from three different places, which is exactly what a
 * picked-off-a-list type system looks like. Pretendard now carries Korean and
 * Latin alike (it was already loaded for Korean), and a mono is kept for one
 * job: prices, yields, timestamps and counters that have to line up in a
 * column.
 *
 * Roboto Mono over the usual developer faces on purpose. Character belongs in
 * the text face; digits at 9–13px want even colour, unambiguous 0/1/7, and a
 * weight range up to 700 for the emphasised figures the desk leans on.
 */
export const dataMono = Roboto_Mono({
  variable: "--font-mono",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});
