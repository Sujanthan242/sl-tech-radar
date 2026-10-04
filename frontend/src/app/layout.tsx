import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import Nav from "@/components/Nav";
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
      <body className="min-h-full flex flex-col" style={{ fontFamily: "var(--font-sans)" }}>
        <Nav />
        <main className="flex-1 w-full max-w-[1280px] mx-auto px-5 md:px-8 pt-24 pb-16">
          {children}
        </main>
        <footer className="border-t border-[rgba(0,229,255,0.12)] bg-[var(--color-abyss)]">
          <div className="max-w-[1280px] mx-auto px-5 md:px-8 py-6 flex items-center justify-between">
            <p className="text-sm text-[var(--color-muted)]">
              <span className="font-display font-bold text-[var(--color-ink)]">
                SL Tech <span className="glow-text">Radar</span>
              </span>
              <span className="mx-2 text-[var(--color-faint)]">·</span>
              Never miss a deadline that matters.
            </p>
            <p className="text-xs text-[var(--color-faint)]">v1 · ops console</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
