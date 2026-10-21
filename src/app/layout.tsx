import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";
import RegisterSW from "@/components/mafia/RegisterSW";
import SplashScreen from "@/components/mafia/SplashScreen";
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
  appleWebApp: {
    capable: true,
    title: "المافيا",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icons/icon-512.png",
    apple: "/icons/icon-192.png",
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
    <html lang="ar" dir="rtl" className={thmanyah.variable} suppressHydrationWarning>
            <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("theme");if(t==="light")document.documentElement.dataset.theme="light"}catch(e){}try{if(sessionStorage.getItem("mafia_splash_seen")==="1"&&location.search.indexOf("splash")<0)document.documentElement.dataset.splash="seen"}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-dvh font-(family-name:--font-thmanyah) antialiased">
        <SplashScreen />
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}