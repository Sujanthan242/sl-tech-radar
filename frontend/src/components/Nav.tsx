"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { mockActive } from "@/lib/api";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/discover", label: "Discover" },
  { href: "/review", label: "Review" },
  { href: "/editions", label: "Editions" },
  { href: "/settings", label: "Settings" },
];

export default function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[rgba(4,7,15,0.85)] backdrop-blur-xl border-b border-[rgba(0,229,255,0.1)]">
      <div className="max-w-[1280px] mx-auto px-5 md:px-8 h-[68px] flex items-center justify-between">
        <Link href="/" className="font-display text-[1.45rem] font-extrabold tracking-wide">
          SL Tech <span className="glow-text">Radar</span>
        </Link>

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

        <div className="flex items-center gap-3">
          {mockActive && (
            <span className="chip chip-verify hidden sm:inline-flex" title="Serving bundled mock data — no backend needed">
              ◈ mock mode
            </span>
          )}
          <button
            className="md:hidden flex flex-col gap-[5px] p-2"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
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
