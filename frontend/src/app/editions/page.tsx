"use client";

import { useEffect, useState } from "react";
import { PageHeader, Empty, SectionLabel, DeadlineChip } from "@/components/ui";
import { getEditionsWithLedger } from "@/lib/api";
import type { Edition, LedgerEvent } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";
import { compactNum, prettyDateTime, usd } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { mockCandidates } from "@/lib/mock";
import { countdownLabel, prettyDate } from "@/lib/format";

const EDITION_CHIP: Record<Edition["status"], string> = {
  draft: "chip-seen",
  in_review: "chip-verify",
  published: "chip-new",
};

/** Best-effort deadline lookup: shipped titles are editorialized, so match on the first keyword. */
function findDeadline(title: string): string | null {
  const key = title.split(/[\s—–-]+/)[0]?.toLowerCase();
  if (!key) return null;
  return mockCandidates.find((c) => c.title.toLowerCase().includes(key))?.deadline ?? null;
}

/** wa.me share link: edition week + top items with deadlines + site URL. Plain <a> — works everywhere. */
function shareHref(ed: Edition): string {
  const site =
    typeof window !== "undefined"
      ? `${window.location.origin}${window.location.pathname.replace(/\/editions\/?$/, "")}`
      : "https://sujanthan242.github.io/sl-tech-radar";
  const lines = ed.shipped.slice(0, 5).map((s) => {
    const dl = findDeadline(s.title);
    return `• ${s.title}${dl ? ` — ⏳ ${prettyDate(dl)} (${countdownLabel(dl)})` : ""}`;
  });
  const text = [`📡 SL Tech Radar — ${ed.week} is live!`, "", ...lines, "", `Read it: ${site}`].join("\n");
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

function EditionCard({ ed, index }: { ed: Edition; index: number }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(index === 0);
  const catLabel = (c: string) => t.categories[c] ?? CATEGORIES.find((x) => x.id === c)?.label ?? c;
  const statusLabel =
    ed.status === "published" ? t.editions.statusPublished : ed.status === "in_review" ? t.editions.statusInReview : t.editions.statusDraft;

  return (
    <div className="card overflow-hidden rise-in" style={{ animationDelay: `${index * 0.06}s` }}>
      <button
        className="w-full flex flex-wrap items-center gap-3 md:gap-5 p-6 text-left"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span
          className="text-[var(--color-muted)] transition-transform text-sm shrink-0"
          style={{ transform: open ? "rotate(90deg)" : "none" }}
        >
          ▶
        </span>
        <div className="min-w-[120px]">
          <p className="eyebrow !text-[0.62rem] !tracking-[3px]">{t.editions.week}</p>
          <p className="font-display text-2xl font-bold break-words">{ed.week}</p>
        </div>
        <span className={`chip ${EDITION_CHIP[ed.status]}`}>
          {statusLabel}
        </span>
        <div className="flex gap-4 sm:gap-6 ml-auto text-center">
          <div>
            <p className="font-display text-xl font-bold">{ed.stats.found}</p>
            <p className="text-[0.66rem] text-[var(--color-faint)] uppercase tracking-widest">{t.editions.found}</p>
          </div>
          <div>
            <p className="font-display text-xl font-bold text-[var(--color-mint)]">{ed.stats.approved}</p>
            <p className="text-[0.66rem] text-[var(--color-faint)] uppercase tracking-widest">{t.editions.shippedLabel}</p>
          </div>
          <div>
            <p className="font-display text-xl font-bold text-[var(--color-rose)]">{ed.stats.rejected}</p>
            <p className="text-[0.66rem] text-[var(--color-faint)] uppercase tracking-widest">{t.editions.cutLabel}</p>
          </div>
          <div className="hidden sm:block">
            <p className="font-display text-xl font-bold glow-text">{usd(ed.stats.costUsd)}</p>
            <p className="text-[0.66rem] text-[var(--color-faint)] uppercase tracking-widest">{t.editions.cost}</p>
          </div>
        </div>
      </button>

      {open && (
        <div className="border-t border-[rgba(0,229,255,0.12)] p-6 grid md:grid-cols-3 gap-6 rise-in">
          <div>
            <SectionLabel>{t.editions.whatShipped}</SectionLabel>
            {ed.shipped.length === 0 ? (
              <p className="text-sm text-[var(--color-faint)]">{t.editions.nothingApproved}</p>
            ) : (
              <ul className="grid gap-2.5">
                {ed.shipped.map((s, i) => (
                  <li key={i} className="text-sm flex gap-2">
                    <span className="text-[var(--color-mint)] shrink-0">✓</span>
                    <span className="min-w-0 break-words">
                      <span className="text-[var(--color-faint)] text-xs font-mono mr-2">{catLabel(s.category)}</span>
                      {s.title}
                      <span className="block mt-1.5">
                        <DeadlineChip deadline={findDeadline(s.title)} />
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <SectionLabel>{t.editions.whatCut}</SectionLabel>
            {ed.cut.length === 0 ? (
              <p className="text-sm text-[var(--color-faint)]">{t.editions.cleanRun}</p>
            ) : (
              <ul className="grid gap-2.5">
                {ed.cut.map((c, i) => (
                  <li key={i} className="text-sm flex gap-2">
                    <span className="text-[var(--color-rose)] shrink-0">✕</span>
                    <span className="min-w-0 break-words">
                      {c.title}
                      <span className="block text-xs text-[var(--color-faint)] mt-0.5">{t.editions.reasonLabel} {c.reason}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <SectionLabel>{t.editions.exportHistory}</SectionLabel>
            {ed.exports.length === 0 ? (
              <p className="text-sm text-[var(--color-faint)]">{t.editions.notExported}</p>
            ) : (
              <ul className="grid gap-2.5">
                {ed.exports.map((x, i) => (
                  <li key={i} className="text-sm text-[var(--color-muted)]">
                    ⬆ {prettyDateTime(x.at)}
                    <span className="block text-xs text-[var(--color-faint)] font-mono">
                      {x.chars.toLocaleString()} {t.editions.toSubstack}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 pt-4 border-t border-[rgba(0,229,255,0.1)] text-xs font-mono text-[var(--color-faint)]">
              {compactNum(ed.stats.tokensUsed)} {t.editions.tokensLabel} · {usd(ed.stats.costUsd)}
              <br />
              {t.editions.createdLabel} {prettyDateTime(ed.createdAt)}
            </div>
          </div>
        </div>
      )}

      {open && (
        <div className="border-t border-[rgba(0,229,255,0.12)] px-6 py-4 flex flex-wrap items-center gap-3">
          <a
            href={shareHref(ed)}
            target="_blank"
            rel="noreferrer"
            className="btn-ghost !py-2 !px-4 !text-[0.78rem] !border-[rgba(61,220,151,0.5)] !text-[var(--color-mint)]"
            aria-label={t.editions.shareWhatsapp}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M7 17L17 7" />
              <path d="M9 7h8v8" />
            </svg>
            {t.editions.shareWhatsapp}
          </a>
        </div>
      )}
    </div>
  );
}

export default function Editions() {
  const { t } = useI18n();
  const [editions, setEditions] = useState<Edition[] | null>(null);
  const [ledger, setLedger] = useState<LedgerEvent[]>([]);
  const [ledgerOpen, setLedgerOpen] = useState(false);

  useEffect(() => {
    getEditionsWithLedger().then(({ editions, ledger }) => {
      setEditions(editions);
      setLedger(ledger);
    });
  }, []);

  return (
    <>
      <PageHeader
        eyebrow={t.editions.eyebrow}
        title={<>{t.editions.titleA} <span className="glow-text">{t.editions.titleB}</span></>}
        sub={t.editions.sub}
      />

      {!editions ? (
        <div className="grid gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card p-6">
              <div className="shimmer h-6 w-1/4 rounded mb-3" />
              <div className="shimmer h-4 w-2/3 rounded" />
            </div>
          ))}
        </div>
      ) : editions.length === 0 ? (
        <Empty icon="🗞️" title={t.editions.emptyTitle} hint={t.editions.emptyHint} />
      ) : (
        <div className="grid gap-4 mb-10">
          {editions.map((ed, i) => (
            <EditionCard key={ed.id} ed={ed} index={i} />
          ))}
        </div>
      )}

      {/* ledger */}
      <div className="card overflow-hidden">
        <button
          className="w-full flex flex-wrap items-center gap-3 p-6 text-left"
          onClick={() => setLedgerOpen((o) => !o)}
          aria-expanded={ledgerOpen}
        >
          <span className="text-[var(--color-muted)] text-sm transition-transform shrink-0" style={{ transform: ledgerOpen ? "rotate(90deg)" : "none" }}>
            ▶
          </span>
          <div className="min-w-0">
            <p className="eyebrow !text-[0.66rem] !tracking-[3px] mb-1">{t.editions.ledgerTitle}</p>
            <p className="font-display text-lg font-bold">{t.editions.tracked(ledger.length)}</p>
          </div>
          <span className="chip chip-seen ml-auto">{t.editions.deterministic}</span>
        </button>
        {ledgerOpen && (
          <div className="border-t border-[rgba(0,229,255,0.12)] overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="text-left text-[0.68rem] uppercase tracking-widest text-[var(--color-faint)] border-b border-[rgba(0,229,255,0.1)]">
                  <th className="px-6 py-3 font-semibold">{t.editions.thEvent}</th>
                  <th className="px-4 py-3 font-semibold">{t.editions.thKind}</th>
                  <th className="px-4 py-3 font-semibold">{t.editions.thStatus}</th>
                  <th className="px-4 py-3 font-semibold">{t.editions.thEdition}</th>
                  <th className="px-6 py-3 font-semibold">{t.editions.thFirstSeen}</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((e) => (
                  <tr key={e.id} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(0,229,255,0.03)]">
                    <td className="px-6 py-3.5">
                      <a href={e.url} target="_blank" rel="noreferrer" className="font-semibold hover:text-[var(--color-neon)] transition-colors">
                        {e.name} ↗
                      </a>
                      <p className="text-xs text-[var(--color-faint)] mt-0.5">{e.notes}</p>
                    </td>
                    <td className="px-4 py-3.5 text-[var(--color-muted)] capitalize">{e.kind}</td>
                    <td className="px-4 py-3.5">
                      <span className="chip chip-seen !text-[0.64rem]">{e.status}</span>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-[var(--color-muted)]">{e.edition}</td>
                    <td className="px-6 py-3.5 text-xs text-[var(--color-faint)]">{prettyDateTime(e.firstSeen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
