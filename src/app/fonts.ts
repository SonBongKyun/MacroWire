import { IBM_Plex_Sans, JetBrains_Mono } from "next/font/google";

/** Data and timestamps — needed on every route. */
export const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});

/** Interface face — needed on every route. */
export const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-interface",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});
