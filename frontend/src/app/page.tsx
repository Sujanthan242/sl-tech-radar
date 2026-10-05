"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import RadarHero3D from "@/components/RadarHero3D";
import { PageHeader, Stat, StatusDot, Meter, ProgressBar, SectionLabel, Toast } from "@/components/ui";
import { startRun, getRun, getProviders } from "@/lib/api";
import { mockCandidates, mockEditions, MOCK_EDITION } from "@/lib/mock";
import { useI18n } from "@/lib/i18n";
import type { ProviderInfo, RunInfo, UsageInfo } from "@/lib/types";
import { compactNum, daysUntil, prettyDateTime, timeAgo, usd } from "@/lib/format";

const STAGE_LOGS: { status: string; lines: string[] }[] = [
  { status: "queued", lines: ["Run queued — warming up the pipeline…"] },
  {
    status: "running",
    lines: [
      "Discovering — 12 Tavily searches across 4 categories (time_range=week)…",
      "Normalizing 14 candidates — titles, deadlines, snippets…",
      "Dedup vs ledger — 6 seen, 8 net-new ✓",
      "Grading — deadline parseable? SL-eligible? in the future?",
    ],
  },
  {
    status: "drafting",
    lines: [
      "Drafting hackathons section — llama-3.3-70b…",
      "Drafting internships section — llama-3.3-70b…",
      "Drafting courses + scholarships — structured JSON…",
      "Attaching citations [1..n] to every claim…",
    ],
  },
  { status: "in_review", lines: ["4 drafts ready — awaiting your 15-minute review ✓"] },
];

export default function Dashboard() {
  const router = useRouter();
  const { t } = useI18n();
  const [run, setRun] = useState<RunInfo | null>(null);
  const [running, setRunning] = useState(false);
  const [chain, setChain] = useState<ProviderInfo[]>([]);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [cacheHit, setCacheHit] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    getProviders().then(({ chain, usage }) => {
      setChain(chain);
      setUsage(usage);
      setCacheHit(0.73);
    });
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const busy = running && run && run.status !== "in_review" && run.status !== "done";

  async function handleGenerate() {
    if (running) return;
    setRunning(true);
    setRun(null);
    const started = await startRun();
    setRun(started);
    pollRef.current = setInterval(async () => {
      const s = await getRun(started.runId);
      setRun(s);
      if (s.status === "in_review" || s.status === "done" || s.status === "failed") {
        if (pollRef.current) clearInterval(pollRef.current);
        setRunning(false);
        if (s.status === "failed") {
          setToast(t.dashboard.toastFailed);
        } else {
          setToast(t.dashboard.toastDone(s.stats.draftsReady));
        }
      }
    }, 900);
  }

  const closingSoon = mockCandidates.filter((c) => {
    const d = daysUntil(c.deadline);
    return d !== null && d >= 0 && d <= 7;
  }).length;

  const logLines = STAGE_LOGS.filter((s) => {
    const order = ["queued", "running", "drafting", "in_review", "done"];
    const cur = run ? order.indexOf(run.status === "done" ? "in_review" : run.status) : -1;
    return order.indexOf(s.status) <= cur;
  }).flatMap((s) => s.lines);

  const active = chain.find((p) => p.status === "active");

  return (
    <>
      <PageHeader
        eyebrow={t.dashboard.eyebrow}
        title={<>{t.dashboard.titleA} <span className="glow-text">{t.dashboard.titleB}</span></>}
        sub={t.dashboard.sub}
        action={
          <span className="chip chip-new">{t.dashboard.editionLive(MOCK_EDITION)}</span>
        }
      />

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* status card */}
        <div className="card p-6 rise-in">
          <SectionLabel>{t.dashboard.radarStatus}</SectionLabel>
          <div className="grid grid-cols-2 gap-5">
            <Stat label={t.dashboard.lastRun} value={mockEditions[0] ? timeAgo(mockEditions[0].createdAt) : "—"} hint={prettyDateTime(mockEditions[0].createdAt)} />
            <Stat label={t.dashboard.itemsFound} value={mockCandidates.length} hint={t.dashboard.netNew(mockCandidates.filter((c) => c.dedupStatus === "NEW").length)} accent />
            <Stat label={t.dashboard.closingSoon} value={closingSoon} hint={t.dashboard.deadlineFirst} />
            <Stat label={t.dashboard.draftsReady} value={4} hint={t.dashboard.ofSections} />
          </div>
          <div className="mt-6 pt-5 border-t border-[rgba(0,229,255,0.12)] flex items-center justify-between text-sm">
            <span className="text-[var(--color-muted)]">{t.dashboard.editionStatus}</span>
            <span className="chip chip-verify">{t.dashboard.inReview}</span>
          </div>
        </div>

        {/* generate card */}
        <div className="card p-6 rise-in flex flex-col" style={{ animationDelay: "0.08s" }}>
          <SectionLabel>{t.dashboard.saturdayPipeline}</SectionLabel>
          <p className="font-display text-xl font-bold mb-1">{t.dashboard.generateTitle}</p>
          <p className="text-sm text-[var(--color-muted)] mb-5">
            {t.dashboard.generateDesc}
          </p>

          {!run && !running && (
            <button className="btn-glow w-full text-lg py-5" onClick={handleGenerate}>
              {t.dashboard.generateBtn}
            </button>
          )}

          {(run || running) && (
            <div className="flex-1 flex flex-col">
              <ProgressBar
                value={run?.progress ?? 0}
                label={run ? `${run.status.replace("_", " ")} · ${run.edition}` : t.dashboard.starting}
              />
              <div className="mt-4 flex-1 min-h-[118px] rounded-xl bg-[var(--color-inset)] border border-[rgba(0,229,255,0.12)] p-3.5 font-mono text-[0.72rem] leading-relaxed overflow-y-auto">
                {logLines.map((l, i) => (
                  <p key={i} className="log-line text-[var(--color-muted)]">
                    <span className="text-[var(--color-neon)]">›</span> {l}
                  </p>
                ))}
                {busy && (
                  <p className="log-line text-[var(--color-neon)] flex items-center gap-2 mt-1">
                    <span className="spinner-ring-light" /> {t.dashboard.working}
                  </p>
                )}
              </div>
              <div className="flex gap-5 mt-4 text-xs font-mono text-[var(--color-muted)]">
                <span>{t.dashboard.statFound} <b className="text-[var(--color-ink)]">{run?.stats.candidatesFound ?? 0}</b></span>
                <span>{t.dashboard.statNetNew} <b className="text-[var(--color-mint)]">{run?.stats.netNew ?? 0}</b></span>
                <span>{t.dashboard.statDrafts} <b className="text-[var(--color-neon)]">{run?.stats.draftsReady ?? 0}</b></span>
              </div>
              {run?.status === "in_review" && (
                <Link href="/review" className="btn-glow w-full mt-5 rise-in">
                  {t.dashboard.openReview}
                </Link>
              )}
              {run && run.status !== "in_review" && (
                <button className="btn-glow w-full mt-5" disabled>
                  <span className="spinner-ring" /> {run.status === "queued" ? t.dashboard.queued : run.status === "running" ? t.dashboard.discovering : t.dashboard.drafting}
                </button>
              )}
            </div>
          )}

          {!run && !running && (
            <p className="text-xs text-[var(--color-faint)] mt-4 font-mono">
              {t.dashboard.mockNote}
            </p>
          )}
        </div>

        {/* 3D radar hero — real candidate nodes, click → discover */}
        <div className="rise-in" style={{ animationDelay: "0.16s" }}>
          <RadarHero3D
            candidates={mockCandidates}
            runId={run?.runId}
            onNodeClick={() => router.push("/discover")}
          />
        </div>
      </div>

      {/* provider health strip */}
      <div className="card p-6 mb-6 rise-in" style={{ animationDelay: "0.2s" }}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <SectionLabel>{t.dashboard.providerHealth}</SectionLabel>
          <Link href="/settings" className="text-xs text-[var(--color-neon)] hover:underline">
            {t.dashboard.manageChain}
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {chain.length === 0
            ? [0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-xl border border-[rgba(0,229,255,0.14)] bg-[var(--color-inset)] p-4" aria-hidden="true">
                  <div className="shimmer h-3 w-1/2 rounded mb-3" />
                  <div className="shimmer h-4 w-3/4 rounded mb-2" />
                  <div className="shimmer h-3 w-2/3 rounded" />
                </div>
              ))
            : chain.map((p, i) => (
            <div key={p.name} className="rounded-xl border border-[rgba(0,229,255,0.14)] bg-[var(--color-inset)] p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <StatusDot status={p.status} />
                <span className="text-[0.66rem] font-mono text-[var(--color-faint)]">#{i + 1}</span>
              </div>
              <p className="font-bold capitalize text-sm">{p.name}</p>
              <p className="text-[0.7rem] text-[var(--color-muted)] font-mono truncate" title={p.model}>
                {p.model}
              </p>
              <p className="text-[0.7rem] mt-1.5 font-mono">
                {p.status === "active" ? (
                  <span className="text-[var(--color-mint)]">✓ {p.latencyMs}ms</span>
                ) : (
                  <span className="text-[var(--color-amber)]">standby</span>
                )}
              </p>
            </div>
          ))}
          <div className="rounded-xl border border-[rgba(0,229,255,0.14)] bg-[var(--color-inset)] p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <StatusDot status="active" />
            </div>
            <p className="font-bold text-sm">{t.dashboard.cache}</p>
            <p className="text-[0.7rem] text-[var(--color-muted)] font-mono">{t.dashboard.weekKeyed}</p>
            <p className="text-[0.7rem] mt-1.5 font-mono text-[var(--color-neon)]">
              {cacheHit === null ? "…" : t.dashboard.hitRate(Math.round(cacheHit * 100))}
            </p>
          </div>
        </div>
        {active && (
          <p className="text-xs text-[var(--color-muted)] mt-4">
            {t.dashboard.servingVia} <b className="text-[var(--color-mint)]">{active.name}</b>
            <span className="font-mono"> ({active.model})</span> {t.dashboard.chainNote}
          </p>
        )}
      </div>

      {/* usage meter */}
      <div className="card p-6 rise-in" style={{ animationDelay: "0.24s" }}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <SectionLabel>{t.dashboard.monthlyUsage(usage?.month ?? "…")}</SectionLabel>
          <span className="chip chip-new">{t.dashboard.runway(usage?.projectedRunway ?? "…")}</span>
        </div>
        {usage ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Meter label={t.dashboard.tokensIn} used={usage.tokensIn} total={200_000} display={compactNum(usage.tokensIn)} />
            <Meter label={t.dashboard.tokensOut} used={usage.tokensOut} total={80_000} display={compactNum(usage.tokensOut)} />
            <Meter
              label={t.dashboard.tavilyCredits}
              used={usage.tavilyCreditsUsed}
              total={usage.tavilyCreditsFree}
              display={`${usage.tavilyCreditsUsed} / ${usage.tavilyCreditsFree} free`}
            />
            <div className="rounded-xl border border-[rgba(0,229,255,0.14)] bg-[var(--color-inset)] p-4 flex flex-col justify-center">
              <p className="eyebrow !text-[0.62rem] !tracking-[3px] mb-1">{t.dashboard.spendMonth}</p>
              <p className="font-display text-3xl font-bold glow-text">{usd(usage.costUsd)}</p>
              <p className="text-xs text-[var(--color-muted)] mt-1">{t.dashboard.honest}</p>
            </div>
          </div>
        ) : (
          <div className="shimmer h-20 rounded-xl" />
        )}
      </div>

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </>
  );
}
