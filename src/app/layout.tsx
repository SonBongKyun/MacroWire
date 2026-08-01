import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { ibmPlexSans, jetbrainsMono } from "./fonts";
import "./globals.css";
import "./macro-app.css";

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
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    // iOS ignores SVG here and renders a blank tile, so the home-screen icon
    // has to be a raster.
    apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
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
        {/* Pretendard carries Korean text; the Latin interface and data faces
            are self-hosted by next/font. SUIT used to be loaded here too, but
            it only ever sat behind Pretendard in the fallback stack — a
            render-blocking third-party stylesheet for a face that never won. */}
        <link
          rel="preconnect"
          href="https://cdn.jsdelivr.net"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className={`${jetbrainsMono.variable} ${ibmPlexSans.variable} antialiased`}>
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
