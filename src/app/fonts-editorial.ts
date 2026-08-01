import { Crimson_Pro } from "next/font/google";

/**
 * Editorial serif for the landing and recap pages.
 *
 * Kept in its own module so importing it never drags the face into /app's CSS
 * graph — next/font emits the @font-face and preload for every family declared
 * in a module that a route pulls in, so co-locating it with the interface
 * fonts made the desk preload ~40 KB of a serif it never renders.
 */
export const crimsonPro = Crimson_Pro({
  variable: "--font-serif",
  weight: ["400", "600"],
  subsets: ["latin"],
});
