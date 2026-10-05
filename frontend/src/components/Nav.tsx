"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { mockActive } from "@/lib/api";
import { useTheme, useLite } from "@/lib/prefs";
import { useI18n, LANGS, nextLang } from "@/lib/i18n";

/** Compact header icon button — shared by the theme/lang/lite toggles. */
export const HEADER_ICON_BTN =
  "w-9 h-9 grid place-items-center rounded-full border border-[rgba(0,229,255,0.25)] text-[var(--color-muted)] hover:text-[var(--color-neon)] hover:border-[var(--color-neon)] transition-colors shrink-0 text-[1.05rem]";

export default function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { lite, toggleLite } = useLite();
  const { lang, setLang, t } = useI18n();
  // Public assets need the basePath prefix on the GitHub Pages static export.
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

  const LINKS = [
    { href: "/", label: t.nav.dashboard },
    { href: "/discover", label: t.nav.discover },
    { href: "/review", label: t.nav.review },
    { href: "/editions", label: t.nav.editions },
    { href: "/settings", label: t.nav.settings },
  ];

  const langShort = LANGS.find((l) => l.id === lang)?.short ?? "EN";
  const nextShort = LANGS.find((l) => l.id === nextLang(lang))?.short ?? "த";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--color-nav)] backdrop-blur-xl border-b border-[rgba(0,229,255,0.1)]">
      <div className="max-w-[1280px] mx-auto px-5 md:px-8 h-[68px] flex items-center justify-between gap-2">
        <div className="flex items-center shrink-0">
          <Link href="/" className="font-display text-[1.15rem] sm:text-[1.45rem] font-extrabold tracking-wide shrink-0">
            SL Tech <span className="glow-text">Radar</span>
          </Link>
          <span
            className="hidden sm:flex items-center ml-3 pl-3 border-l border-[rgba(0,229,255,0.15)]"
            title="by Matroxx"
            aria-label="by Matroxx"
          >
            <Image
              src={`${basePath}/matroxx-logo.png`}
              alt="by Matroxx"
              width={480}
              height={279}
              className="h-7 w-auto dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.18)]"
            />
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          {LINKS.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`relative text-[0.92rem] py-1 transition-colors ${
                  active ? "text-[var(--color-ink)]" : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                }`}
              >
                {l.label}
                {active && (
                  <span className="absolute left-0 right-0 -bottom-[3px] h-[2px] rounded bg-[var(--color-neon)] shadow-[0_0_12px_rgba(0,229,255,0.8)]" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {mockActive && (
            <span className="chip chip-verify hidden sm:inline-flex" title={t.nav.mockModeTitle}>
              {t.nav.mockMode}
            </span>
          )}
          <button
            className={HEADER_ICON_BTN}
            onClick={() => setLang(nextLang(lang))}
            aria-label={`${t.nav.cycleLang} (${nextShort})`}
            title={`${t.nav.cycleLang} — ${nextShort}`}
          >
            <span aria-hidden="true" className="text-[0.95rem] font-bold">{langShort}</span>
          </button>
          <button
            className={HEADER_ICON_BTN}
            onClick={toggleTheme}
            aria-label={theme === "dark" ? t.nav.toLight : t.nav.toDark}
            title={theme === "dark" ? t.nav.lightMode : t.nav.darkMode}
          >
            <span aria-hidden="true">{theme === "dark" ? "☀️" : "🌙"}</span>
          </button>
          <button
            className={`${HEADER_ICON_BTN} ${lite ? "!text-[var(--color-neon)] !border-[var(--color-neon)]" : ""}`}
            onClick={toggleLite}
            aria-pressed={lite}
            aria-label={lite ? t.nav.liteDisable : t.nav.liteEnable}
            title={t.nav.liteMode}
          >
            <span aria-hidden="true">🪶</span>
          </button>
          <button
            className="md:hidden flex flex-col gap-[5px] p-2"
            onClick={() => setOpen((o) => !o)}
            aria-label={t.nav.toggleMenu}
            aria-expanded={open}
          >
            <span className="w-[24px] h-[2px] bg-[var(--color-ink)] rounded" />
            <span className="w-[24px] h-[2px] bg-[var(--color-ink)] rounded" />
            <span className="w-[24px] h-[2px] bg-[var(--color-ink)] rounded" />
          </button>
        </div>
      </div>

      {open && (
        <nav className="md:hidden border-t border-[rgba(0,229,255,0.1)] px-6 py-3 flex flex-col">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`py-3 border-b border-[rgba(255,255,255,0.05)] last:border-0 ${
                pathname === l.href ? "text-[var(--color-neon)]" : "text-[var(--color-muted)]"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
