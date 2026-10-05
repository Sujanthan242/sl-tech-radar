"use client";

import { useMemo, useState } from "react";
import { PageHeader, DedupBadge, DeadlineChip, Empty, SectionLabel, Toast } from "@/components/ui";
import { getCandidates, getRun, mockActive, startRun } from "@/lib/api";
import { mockQueries } from "@/lib/mock";
import type { Candidate, Category } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";
import { useI18n } from "@/lib/i18n";

const SEEN_COLLAPSED_DEFAULT = true;

function CandidateCard({ c, index }: { c: Candidate; index: number }) {
  const { t } = useI18n();
  const [seenOpen, setSeenOpen] = useState(!SEEN_COLLAPSED_DEFAULT ? true : false);

  const body = (
    <div className="p-5">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <DedupBadge status={c.dedupStatus} />
        <DeadlineChip deadline={c.deadline} confidence={c.deadlineConfidence} />
        <span className="text-[0.7rem] font-mono text-[var(--color-faint)] ml-auto">#{index + 1}</span>
      </div>
      <h3 className="font-display text-lg font-bold mb-2 leading-snug break-words">{c.title}</h3>
      <p className="text-sm text-[var(--color-muted)] leading-relaxed mb-4 break-words">{c.snippet}</p>
      <div className="flex flex-wrap items-center gap-3">
        <a
          href={c.url}
          target="_blank"
          rel="noreferrer"
          className="btn-ghost !py-2 !px-4 !text-[0.78rem]"
        >
          {t.discover.source}
        </a>
        <span className="text-[0.7rem] font-mono text-[var(--color-faint)] truncate max-w-[210px] sm:max-w-[320px] min-w-0" title={c.sourceQuery}>
          {t.discover.queryLabel} “{c.sourceQuery}”
        </span>
      </div>
    </div>
  );

  if (c.dedupStatus === "SEEN") {
    return (
      <div className="card overflow-hidden rise-in opacity-80 hover:opacity-100 hover:border-[rgba(0,229,255,0.4)] transition-all">
        <button
          className="w-full flex items-center gap-3 p-5 text-left"
          onClick={() => setSeenOpen((o) => !o)}
          aria-expanded={seenOpen}
        >
          <span className="text-[var(--color-muted)] text-sm transition-transform shrink-0" style={{ transform: seenOpen ? "rotate(90deg)" : "none" }}>
            ▶
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{c.title}</p>
            <p className="text-xs text-[var(--color-faint)]">{t.discover.alreadyLedger}</p>
          </div>
          <span className="shrink-0">
            <DedupBadge status={c.dedupStatus} />
          </span>
        </button>
        {seenOpen && <div className="border-t border-[rgba(0,229,255,0.12)]">{body}</div>}
      </div>
    );
  }

  return <div className="card card-hover overflow-hidden rise-in">{body}</div>;
}

export default function Discover() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Category>("hackathons");
  const [queries, setQueries] = useState<Record<Category, string[]>>(mockQueries);
  const [newQuery, setNewQuery] = useState("");
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const visible = useMemo(
    () => (candidates ?? []).filter((c) => c.category === tab),
    [candidates, tab]
  );
  const newCount = visible.filter((c) => c.dedupStatus === "NEW").length;

  async function runDiscovery() {
    setLoading(true);
    setCandidates(null);
    try {
      let runId = "mock-run";
      if (!mockActive) {
        // Live mode: run the real Saturday pipeline, then read its candidates.
        const run = await startRun();
        runId = run.runId;
        for (let i = 0; i < 60; i++) {
          await new Promise((r) => setTimeout(r, 2000));
          const info = await getRun(runId);
          if (info.status === "failed") throw new Error("pipeline failed");
          if (info.progress >= 100) break;
        }
      }
      const all = await getCandidates(runId);
      setCandidates(all);
      const fresh = all.filter((c) => c.dedupStatus === "NEW").length;
      setToast(t.discover.toastDone(all.length, fresh));
    } catch {
      setToast(t.discover.toastFailed);
    } finally {
      setLoading(false);
    }
  }

  function addQuery() {
    const q = newQuery.trim();
    if (!q) return;
    setQueries((prev) => ({ ...prev, [tab]: [...prev[tab], q] }));
    setNewQuery("");
  }

  function removeQuery(i: number) {
    setQueries((prev) => ({ ...prev, [tab]: prev[tab].filter((_, j) => j !== i) }));
  }

  return (
    <>
      <PageHeader
        eyebrow={t.discover.eyebrow}
        title={<>{t.discover.titleA} <span className="glow-text">{t.discover.titleB}</span></>}
        sub={t.discover.sub}
      />

      {/* category tabs */}
      <div className="flex gap-3 flex-wrap mb-8">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setTab(c.id)}
            className={`rounded-full px-6 py-2.5 text-sm font-semibold border transition-all ${
              tab === c.id
                ? "bg-[var(--color-neon)] text-[var(--color-on-neon)] border-[var(--color-neon)] shadow-[0_0_18px_rgba(0,229,255,0.45)]"
                : "bg-transparent text-[var(--color-muted)] border-[rgba(0,229,255,0.4)] hover:text-[var(--color-neon)] hover:border-[var(--color-neon)]"
            }`}
          >
            {c.icon} {t.categories[c.id] ?? c.label}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-[380px_1fr] gap-6 items-start">
        {/* query editor */}
        <div className="card p-6 rise-in lg:sticky lg:top-24">
          <SectionLabel>{t.discover.searchQueries(t.categories[tab] ?? CATEGORIES.find((c) => c.id === tab)?.label ?? tab)}</SectionLabel>
          <div className="grid gap-2.5 mb-4">
            {queries[tab].map((q, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-xl border border-[rgba(0,229,255,0.16)] bg-[var(--color-inset)] px-4 py-2.5"
              >
                <span className="text-[var(--color-neon)] text-xs">✦</span>
                <span className="flex-1 text-sm font-mono text-[var(--color-muted)] truncate" title={q}>
                  {q}
                </span>
                <button
                  onClick={() => removeQuery(i)}
                  className="text-[var(--color-faint)] hover:text-[var(--color-rose)] text-lg leading-none min-w-[36px] min-h-[36px] grid place-items-center -mr-2 shrink-0"
                  aria-label={t.discover.removeQuery(q)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mb-6">
            <input
              className="field !py-2.5 !text-sm min-w-0"
              placeholder={t.discover.addQueryPh}
              value={newQuery}
              onChange={(e) => setNewQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addQuery()}
            />
            <button className="btn-ghost shrink-0" onClick={addQuery}>
              {t.discover.add}
            </button>
          </div>
          <button className="btn-glow w-full" onClick={runDiscovery} disabled={loading}>
            {loading ? (
              <>
                <span className="spinner-ring" /> {t.discover.searching}
              </>
            ) : (
              <>{t.discover.runDiscovery}</>
            )}
          </button>
          <p className="text-[0.7rem] text-[var(--color-faint)] font-mono mt-3">
            {t.discover.creditNote}
          </p>
        </div>

        {/* results */}
        <div>
          {loading && (
            <div className="grid gap-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="card p-5">
                  <div className="shimmer h-5 w-2/3 rounded mb-3" />
                  <div className="shimmer h-4 w-full rounded mb-2" />
                  <div className="shimmer h-4 w-5/6 rounded" />
                </div>
              ))}
            </div>
          )}

          {!loading && !candidates && (
            <Empty
              icon="🔭"
              title={t.discover.emptyTitle}
              hint={t.discover.emptyHint}
            />
          )}

          {!loading && candidates && visible.length === 0 && (
            <Empty
              icon="🌊"
              title={t.discover.emptyCatTitle}
              hint={t.discover.emptyCatHint}
            />
          )}

          {!loading && candidates && visible.length > 0 && (
            <>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <p className="text-sm text-[var(--color-muted)]">
                  <b className="text-[var(--color-ink)]">{visible.length}</b> {t.discover.resultsLabel}
                  {newCount > 0 && (
                    <>
                      {" · "}<b className="text-[var(--color-mint)]">{t.discover.netNew(newCount)}</b>
                    </>
                  )}
                </p>
                <span className="chip chip-seen ml-auto">{t.discover.seenNote}</span>
              </div>
              <div className="grid gap-4">
                {visible.map((c, i) => (
                  <CandidateCard key={c.id} c={c} index={i} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </>
  );
}
