import type { Metadata, Viewport } from "next";
import { Crimson_Pro, IBM_Plex_Sans, JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import "./macro-app.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-interface",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const crimsonPro = Crimson_Pro({
  variable: "--font-serif",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0D1013",
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
  const document = (
    <html lang="ko" className="dark">
      <head>
        {/* Korean fallback fonts complement the self-hosted interface and data faces. */}
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
      <body className={`${jetbrainsMono.variable} ${ibmPlexSans.variable} ${crimsonPro.variable} antialiased`}>
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

  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return document;
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#72AEF8",
          colorBackground: "#0D1013",
        },
      }}
    >
      {document}
    </ClerkProvider>
  );
}
