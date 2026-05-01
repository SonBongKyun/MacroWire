import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Anton, Crimson_Pro } from "next/font/google";
import "./globals.css";

// Wire-bulletin type system —
// JetBrains Mono for tickers/timestamps/data (sharper than Space Mono)
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});
// Anton — single 400 weight, extreme condensed black, for editorial headlines
const anton = Anton({
  variable: "--font-display-condensed",
  weight: "400",
  subsets: ["latin"],
});
// Crimson Pro — high-contrast serif for editorial pull-quotes / datelines
const crimsonPro = Crimson_Pro({
  variable: "--font-serif",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#08090B",
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "MacroWire",
  description: "실시간 한국 매크로 경제 뉴스 와이어",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MacroWire",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark">
      <head>
        {/* Korean-optimised type system —
            Pretendard Variable for body/UI, SUIT Variable for display headlines.
            Both are open-source variable fonts; jsDelivr serves the dynamic-subset
            (KO + Latin glyphs only) which keeps payload small. */}
        <link
          rel="preconnect"
          href="https://cdn.jsdelivr.net"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/sunn-us/SUIT/fonts/variable/woff2/SUIT-Variable.css"
        />
      </head>
      <body className={`${jetbrainsMono.variable} ${anton.variable} ${crimsonPro.variable} antialiased`}>
        {children}
        {/* Service worker — disabled. Unregister any leftover SW from a prior
            version so cached "/" shells from before the landing/app split
            stop ghosting the new landing page. Once the site has stable
            offline support, this can be re-enabled. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(regs => {
                  regs.forEach(r => r.unregister());
                });
                if (window.caches) {
                  caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
                }
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
