import { Newsreader } from "next/font/google";

/**
 * Editorial serif for the landing and recap pages.
 *
 * Newsreader was drawn by Production Type for news text — the same lineage the
 * bulletin layout is imitating, rather than a general-purpose book serif
 * borrowed for the occasion. The italic is a real cut, which the landing deck
 * and pull quotes lean on.
 *
 * Kept in its own module so importing it never drags the face into /app's CSS
 * graph — next/font emits the @font-face and preload for every family declared
 * in a module that a route pulls in, so co-locating it with the interface font
 * made the desk preload a serif it never renders.
 */
export const editorialSerif = Newsreader({
  variable: "--font-serif",
  weight: ["400", "600"],
  style: ["normal", "italic"],
  subsets: ["latin"],
});
