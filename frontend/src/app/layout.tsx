import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { ThemeProvider, LiteProvider } from "@/lib/prefs";
import { LanguageProvider } from "@/lib/i18n";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SL Tech Radar — AI Newsletter Assistant",
  description:
    "Never miss a deadline that matters. AI-powered discovery and 15-minute approval for SL Tech Students Weekly.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} h-full antialiased`}>
      <head>
        {/* pre-paint: apply the stored/OS theme before first render — no flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('slr-theme');var t=s||(window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');if(t==='dark')document.documentElement.classList.add('dark');try{if(localStorage.getItem('slr-lite')==='1')document.addEventListener('DOMContentLoaded',function(){document.body.classList.add('lite')});}catch(e){}}catch(e){document.documentElement.classList.add('dark');}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col" style={{ fontFamily: "var(--font-sans)" }}>
        <ThemeProvider>
          <LiteProvider>
            <LanguageProvider>
              <Nav />
              <main className="flex-1 w-full max-w-[1280px] mx-auto px-5 md:px-8 pt-24 pb-16">
                {children}
              </main>
              <Footer />
            </LanguageProvider>
          </LiteProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
