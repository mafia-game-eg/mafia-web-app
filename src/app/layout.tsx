import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";
import "./globals.css";

const thmanyah = localFont({
  src: [
    { path: "../fonts/thmanyahsans-Light.otf", weight: "300", style: "normal" },
    { path: "../fonts/thmanyahsans-Regular.otf", weight: "400", style: "normal" },
    { path: "../fonts/thmanyahsans-Medium.otf", weight: "500", style: "normal" },
    { path: "../fonts/thmanyahsans-Bold.otf", weight: "700", style: "normal" },
    { path: "../fonts/thmanyahsans-Black.otf", weight: "900", style: "normal" },
  ],
  variable: "--font-thmanyah",
  display: "swap",
  fallback: ["Tahoma", "sans-serif"],
});

export const metadata: Metadata = {
  title: "المافيا | لعبة الغموض الجماعية",
  description:
    "لعبة المافيا أونلاين لعدد كبير من اللاعبين، تُلعب بالكامل من الموبايل وبصمت تام، والتطبيق هو الراوي والحكم.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-512.png",
    apple: "/icons/icon-512.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f0c1a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={thmanyah.variable}>
     <body className="min-h-dvh font-(family-name:--font-thmanyah) antialiased">{children}</body>
    </html>
  );
}