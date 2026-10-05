"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import type { DedupStatus } from "@/lib/types";
import { countdownLabel, isUrgent, prettyDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

/* ---------- page header ---------- */
export function PageHeader({ eyebrow, title, sub, action }: {
  eyebrow: string;
  title: ReactNode;
  sub?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-8 rise-in">
      <div>
        <p className="eyebrow mb-2">{eyebrow}</p>
        <h1 className="font-display text-[clamp(2rem,4.5vw,3rem)] font-bold leading-tight tracking-wide">
          {title}
        </h1>
        {sub && <p className="text-[var(--color-muted)] mt-2 max-w-[640px]">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

/* ---------- stat tile ---------- */
export function Stat({ label, value, hint, accent }: {
  label: string;
  value: ReactNode;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="card card-hover p-5 min-w-0">
      <p className="eyebrow !text-[0.62rem] !tracking-[3px] mb-2">{label}</p>
      <p className={`font-display text-[1.65rem] md:text-[2rem] font-bold leading-none ${accent ? "glow-text" : ""}`}>
        {value}
      </p>
      {hint && <p className="text-xs text-[var(--color-muted)] mt-2">{hint}</p>}
    </div>
  );
}

/* ---------- dedup badge ---------- */
export function DedupBadge({ status }: { status: DedupStatus }) {
  const { t } = useI18n();
  if (status === "NEW") return <span className="chip chip-new">{t.badges.new}</span>;
  if (status === "SEEN") return <span className="chip chip-seen">{t.badges.seen}</span>;
  return <span className="chip chip-verify">{t.badges.verify}</span>;
}

/* ---------- deadline countdown chip ---------- */
export function DeadlineChip({ deadline, confidence }: {
  deadline: string | null;
  confidence?: "high" | "medium" | "low";
}) {
  const { t } = useI18n();
  if (!deadline) {
    return (
      <span className="chip chip-seen" title={t.badges.dateTbc}>
        {t.badges.dateTbc}{confidence === "low" ? ` · ${t.badges.unverified}` : ""}
      </span>
    );
  }
  const urgent = isUrgent(deadline);
  return (
    <span
      className={`chip ${urgent ? "chip-deadline-urgent" : "chip-deadline"}`}
      title={`Deadline ${prettyDate(deadline)}${confidence ? ` · confidence: ${confidence}` : ""}`}
    >
      ⏳ {prettyDate(deadline)} · {countdownLabel(deadline)}
    </span>
  );
}

/* ---------- confidence badge ---------- */
export function ConfidenceBadge({ level }: { level: "high" | "medium" | "low" }) {
  const { t } = useI18n();
  const styles = {
    high: "text-[var(--color-mint)] border-[rgba(61,220,151,0.5)] bg-[rgba(61,220,151,0.07)]",
    medium: "text-[var(--color-neon)] border-[rgba(0,229,255,0.5)] bg-[rgba(0,229,255,0.06)]",
    low: "text-[var(--color-amber)] border-[rgba(255,180,84,0.55)] bg-[rgba(255,180,84,0.07)]",
  } as const;
  const label = level === "high" ? t.badges.confHigh : level === "medium" ? t.badges.confMedium : t.badges.confLow;
  return (
    <span className={`chip ${styles[level]}`} title={label}>
      {label}
    </span>
  );
}

/* ---------- status dot ---------- */
export function StatusDot({ status }: { status: "active" | "standby" | "unavailable" }) {
  const color =
    status === "active"
      ? "bg-[var(--color-mint)] shadow-[0_0_10px_rgba(61,220,151,0.9)]"
      : status === "standby"
        ? "bg-[var(--color-amber)] shadow-[0_0_10px_rgba(255,180,84,0.7)]"
        : "bg-[var(--color-rose)] shadow-[0_0_10px_rgba(255,107,129,0.8)]";
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${color}`} />;
}

/* ---------- progress bar ---------- */
export function ProgressBar({ value, label }: { value: number; label?: string }) {
  return (
    <div>
      {label && (
        <div className="flex justify-between text-xs text-[var(--color-muted)] mb-2">
          <span>{label}</span>
          <span className="font-mono text-[var(--color-neon)]">{Math.round(value)}%</span>
        </div>
      )}
      <div className="h-[10px] rounded-full bg-[rgba(0,229,255,0.08)] border border-[rgba(0,229,255,0.18)] overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[rgba(0,229,255,0.6)] to-[var(--color-neon)] shadow-[0_0_14px_rgba(0,229,255,0.7)] transition-all duration-500"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}

/* ---------- meter (usage) ---------- */
export function Meter({ label, used, total, display }: {
  label: string;
  used: number;
  total: number;
  display: string;
}) {
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-sm text-[var(--color-muted)]">{label}</span>
        <span className="text-sm font-mono text-[var(--color-ink)]">{display}</span>
      </div>
      <div className="h-[8px] rounded-full bg-[rgba(0,229,255,0.08)] overflow-hidden">
        <div
          className="h-full rounded-full bg-[var(--color-neon)] shadow-[0_0_10px_rgba(0,229,255,0.6)]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ---------- empty state ---------- */
export function Empty({ icon, title, hint }: { icon: string; title: string; hint?: string }) {
  return (
    <div className="card p-10 text-center">
      <p className="text-4xl mb-4">{icon}</p>
      <p className="font-display text-xl font-bold mb-2">{title}</p>
      {hint && <p className="text-sm text-[var(--color-muted)]">{hint}</p>}
    </div>
  );
}

/* ---------- toast (auto-dismisses; click to dismiss early) ---------- */
export function Toast({ message, onDone, duration = 4500 }: {
  message: string;
  onDone: () => void;
  duration?: number;
}) {
  useEffect(() => {
    const t = setTimeout(onDone, duration);
    return () => clearTimeout(t);
  }, [onDone, duration]);

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] card px-6 py-3.5 flex items-center gap-3 rise-in cursor-pointer max-w-[calc(100vw-2rem)]"
      onClick={onDone}
      role="status"
      aria-live="polite"
    >
      <span className="text-[var(--color-neon)] text-lg shrink-0" aria-hidden="true">✦</span>
      <span className="text-sm font-medium break-words min-w-0">{message}</span>
    </div>
  );
}

/* ---------- section label ---------- */
export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="eyebrow !text-[0.66rem] !tracking-[3px] mb-4">{children}</p>;
}
