import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Outfit, Space_Mono } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({ variable: "--font-heading", subsets: ["latin"] });
const outfit = Outfit({ variable: "--font-body", subsets: ["latin"] });
const spaceMono = Space_Mono({ variable: "--font-mono", weight: "400", subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0D0D0F",
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Ryzm Finance",
  description: "실시간 한국 매크로 경제 뉴스 와이어",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Ryzm Finance",
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
    <html lang="ko">
      <body className={`${spaceGrotesk.variable} ${outfit.variable} ${spaceMono.variable} antialiased`}>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(() => {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
