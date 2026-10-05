"use client";

import { useI18n } from "@/lib/i18n";

export default function Footer() {
  const { t } = useI18n();
  return (
    <footer className="border-t border-[rgba(0,229,255,0.12)] bg-[var(--color-abyss)]">
      <div className="max-w-[1280px] mx-auto px-5 md:px-8 py-6 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[var(--color-muted)] min-w-0">
          <span className="font-display font-bold text-[var(--color-ink)]">
            SL Tech <span className="glow-text">Radar</span>
          </span>
          <span className="mx-2 text-[var(--color-faint)]">·</span>
          {t.footer.tagline}
        </p>
        <p className="text-xs text-[var(--color-faint)]">{t.footer.version}</p>
      </div>
    </footer>
  );
}
