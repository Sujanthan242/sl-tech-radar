"use client";

import { useEffect, useState } from "react";
import { PageHeader, Empty, SectionLabel } from "@/components/ui";
import { getEditionsWithLedger } from "@/lib/api";
import type { Edition, LedgerEvent } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";
import { compactNum, prettyDateTime, usd } from "@/lib/format";

const EDITION_CHIP: Record<Edition["status"], string> = {
  draft: "chip-seen",
  in_review: "chip-verify",
  published: "chip-new",
};

function EditionCard({ ed, index }: { ed: Edition; index: number }) {
  const [open, setOpen] = useState(index === 0);
  const catLabel = (c: string) => CATEGORIES.find((x) => x.id === c)?.label ?? c;

  return (
    <div className="card overflow-hidden rise-in" style={{ animationDelay: `${index * 0.06}s` }}>
      <button
        className="w-full flex flex-wrap items-center gap-3 md:gap-5 p-6 text-left"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span
          className="text-[var(--color-muted)] transition-transform text-sm"
          style={{ transform: open ? "rotate(90deg)" : "none" }}
        >
          ▶
        </span>
        <div className="min-w-[120px]">
          <p className="eyebrow !text-[0.62rem] !tracking-[3px]">week</p>
          <p className="font-display text-2xl font-bold">{ed.week}</p>
        </div>
        <span className={`chip ${EDITION_CHIP[ed.status]}`}>
          {ed.status === "published" ? "✓ published" : ed.status === "in_review" ? "◐ in review" : "◌ draft"}
        </span>
        <div className="flex gap-6 ml-auto text-center">
          <div>
            <p className="font-display text-xl font-bold">{ed.stats.found}</p>
            <p className="text-[0.66rem] text-[var(--color-faint)] uppercase tracking-widest">found</p>
          </div>
          <div>
            <p className="font-display text-xl font-bold text-[var(--color-mint)]">{ed.stats.approved}</p>
            <p className="text-[0.66rem] text-[var(--color-faint)] uppercase tracking-widest">shipped</p>
          </div>
          <div>
            <p className="font-display text-xl font-bold text-[var(--color-rose)]">{ed.stats.rejected}</p>
            <p className="text-[0.66rem] text-[var(--color-faint)] uppercase tracking-widest">cut</p>
          </div>
          <div className="hidden sm:block">
            <p className="font-display text-xl font-bold glow-text">{usd(ed.stats.costUsd)}</p>
            <p className="text-[0.66rem] text-[var(--color-faint)] uppercase tracking-widest">cost</p>
          </div>
        </div>
      </button>

      {open && (
        <div className="border-t border-[rgba(0,229,255,0.12)] p-6 grid md:grid-cols-3 gap-6 rise-in">
          <div>
            <SectionLabel>What shipped</SectionLabel>
            {ed.shipped.length === 0 ? (
              <p className="text-sm text-[var(--color-faint)]">Nothing approved yet.</p>
            ) : (
              <ul className="grid gap-2.5">
                {ed.shipped.map((s, i) => (
                  <li key={i} className="text-sm flex gap-2">
                    <span className="text-[var(--color-mint)]">✓</span>
                    <span>
                      <span className="text-[var(--color-faint)] text-xs font-mono mr-2">{catLabel(s.category)}</span>
                      {s.title}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <SectionLabel>What was cut · why</SectionLabel>
            {ed.cut.length === 0 ? (
              <p className="text-sm text-[var(--color-faint)]">Clean run — nothing cut.</p>
            ) : (
              <ul className="grid gap-2.5">
                {ed.cut.map((c, i) => (
                  <li key={i} className="text-sm flex gap-2">
                    <span className="text-[var(--color-rose)]">✕</span>
                    <span>
                      {c.title}
                      <span className="block text-xs text-[var(--color-faint)] mt-0.5">reason: {c.reason}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <SectionLabel>Export history</SectionLabel>
            {ed.exports.length === 0 ? (
              <p className="text-sm text-[var(--color-faint)]">Not exported yet.</p>
            ) : (
              <ul className="grid gap-2.5">
                {ed.exports.map((x, i) => (
                  <li key={i} className="text-sm text-[var(--color-muted)]">
                    ⬆ {prettyDateTime(x.at)}
                    <span className="block text-xs text-[var(--color-faint)] font-mono">
                      {x.chars.toLocaleString()} chars → Substack
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 pt-4 border-t border-[rgba(0,229,255,0.1)] text-xs font-mono text-[var(--color-faint)]">
              {compactNum(ed.stats.tokensUsed)} tokens · {usd(ed.stats.costUsd)}
              <br />
              created {prettyDateTime(ed.createdAt)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Editions() {
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
        eyebrow="Archive · audit trail"
        title={<>Past <span className="glow-text">editions</span></>}
        sub="What shipped, what was cut and why, export history, and the honest per-edition token cost."
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
        <Empty icon="🗞️" title="No editions yet" hint="Run the Saturday pipeline from the dashboard." />
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
          className="w-full flex items-center gap-3 p-6 text-left"
          onClick={() => setLedgerOpen((o) => !o)}
          aria-expanded={ledgerOpen}
        >
          <span className="text-[var(--color-muted)] text-sm transition-transform" style={{ transform: ledgerOpen ? "rotate(90deg)" : "none" }}>
            ▶
          </span>
          <div>
            <p className="eyebrow !text-[0.66rem] !tracking-[3px] mb-1">Dedup ledger · seen_events</p>
            <p className="font-display text-lg font-bold">{ledger.length} tracked events</p>
          </div>
          <span className="chip chip-seen ml-auto">deterministic · URL + fuzzy-title</span>
        </button>
        {ledgerOpen && (
          <div className="border-t border-[rgba(0,229,255,0.12)] overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="text-left text-[0.68rem] uppercase tracking-widest text-[var(--color-faint)] border-b border-[rgba(0,229,255,0.1)]">
                  <th className="px-6 py-3 font-semibold">Event</th>
                  <th className="px-4 py-3 font-semibold">Kind</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Edition</th>
                  <th className="px-6 py-3 font-semibold">First seen</th>
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
