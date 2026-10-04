"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { PageHeader, ConfidenceBadge, DeadlineChip, Empty, ProgressBar, SectionLabel, Toast } from "@/components/ui";
import {
  approveDraft,
  exportEdition,
  getDrafts,
  getEditions,
  regenerateDraft,
  rejectDraft,
  updateDraft,
  MOCK_EDITION,
} from "@/lib/api";
import { mockCandidates } from "@/lib/mock";
import type { DeadlineConfidence, DraftSection, DraftStatus, RejectReason } from "@/lib/types";
import { CATEGORIES, REJECT_REASONS } from "@/lib/types";
import { compactNum, prettyDateTime } from "@/lib/format";

const STATUS_META: Record<DraftStatus, { label: string; cls: string }> = {
  draft: { label: "◌ draft", cls: "chip-seen" },
  approved: { label: "✓ approved", cls: "chip-new" },
  edited: { label: "✎ edited", cls: "chip-deadline" },
  rejected: { label: "✕ rejected", cls: "chip-deadline-urgent" },
};

/** Worst deadline-confidence among this category's fresh candidates. */
function categoryConfidence(cat: DraftSection["category"]): DeadlineConfidence {
  const confs = mockCandidates
    .filter((c) => c.category === cat && c.dedupStatus !== "SEEN")
    .map((c) => c.deadlineConfidence);
  if (confs.includes("low")) return "low";
  if (confs.includes("medium")) return "medium";
  return "high";
}

function sortByDeadline(drafts: DraftSection[]): DraftSection[] {
  return [...drafts].sort((a, b) => {
    if (!a.nextDeadline && !b.nextDeadline) return 0;
    if (!a.nextDeadline) return 1;
    if (!b.nextDeadline) return -1;
    return a.nextDeadline.localeCompare(b.nextDeadline);
  });
}

const SHORTCUTS: { keys: string; action: string }[] = [
  { keys: "j / k", action: "Move to next / previous section" },
  { keys: "a", action: "Approve selected section" },
  { keys: "e", action: "Edit selected section inline" },
  { keys: "r", action: "Reject selected section (with reason)" },
  { keys: "g", action: "Regenerate selected section" },
  { keys: "?", action: "Show this overlay" },
  { keys: "esc", action: "Close dialog / cancel edit" },
];

export default function Review() {
  const [drafts, setDrafts] = useState<DraftSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [rejectTarget, setRejectTarget] = useState<DraftSection | null>(null);
  const [reason, setReason] = useState<RejectReason>("deadline passed");
  const [note, setNote] = useState("");
  const [regenTarget, setRegenTarget] = useState<DraftSection | null>(null);
  const [feedback, setFeedback] = useState("Make the intro punchier and lead with the earliest deadline.");
  const [regenBusy, setRegenBusy] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportMd, setExportMd] = useState("");
  const [exportBusy, setExportBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    getDrafts(MOCK_EDITION).then((d) => {
      setDrafts(sortByDeadline(d));
      setLoading(false);
    });
  }, []);

  const done = drafts.filter((d) => d.status === "approved" || d.status === "edited").length;
  const allDone = drafts.length > 0 && done === drafts.length;

  const scrollTo = useCallback((i: number) => {
    setSel(i);
    cardRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const doApprove = useCallback(async (d: DraftSection) => {
    if (d.status === "approved") return;
    await approveDraft(d.id);
    setDrafts((prev) => prev.map((x) => (x.id === d.id ? { ...x, status: "approved" as const } : x)));
    setToast(`Approved — ${CATEGORIES.find((c) => c.id === d.category)?.label}`);
  }, []);

  const startEdit = useCallback((d: DraftSection) => {
    setEditingId(d.id);
    setEditText(d.contentMd);
  }, []);

  const saveEdit = useCallback(async (d: DraftSection) => {
    const updated = await updateDraft(d.id, editText);
    setDrafts((prev) => prev.map((x) => (x.id === d.id ? updated : x)));
    setEditingId(null);
    setToast("Edit saved — marked as human-edited ✎");
  }, [editText]);

  const openReject = useCallback((d: DraftSection) => {
    setReason("deadline passed");
    setNote("");
    setRejectTarget(d);
  }, []);

  const confirmReject = useCallback(async () => {
    if (!rejectTarget) return;
    const res = await rejectDraft(rejectTarget.id, reason, note || undefined);
    // The contract returns { id, status } only — merge onto the local draft.
    setDrafts((prev) =>
      prev.map((x) =>
        x.id === rejectTarget.id
          ? {
              ...x,
              status: res.status,
              rejectionReason: note ? `${reason} — ${note}` : reason,
              updatedAt: new Date().toISOString(),
            }
          : x,
      ),
    );
    setRejectTarget(null);
    setToast(`Rejected — feeds the ledger + prompt dataset`);
  }, [rejectTarget, reason, note]);

  const confirmRegen = useCallback(async () => {
    if (!regenTarget) return;
    setRegenBusy(true);
    const fresh = await regenerateDraft(regenTarget.id, feedback);
    setDrafts((prev) => sortByDeadline(prev.map((x) => (x.id === regenTarget.id ? fresh : x))));
    setRegenBusy(false);
    setRegenTarget(null);
    setToast("Regenerated — previous version kept for diff");
  }, [regenTarget, feedback]);

  /* keyboard-first review — never hijacks keystrokes while typing */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const ae = document.activeElement as HTMLElement | null;
      const typing =
        !!ae &&
        (ae.tagName === "INPUT" ||
          ae.tagName === "TEXTAREA" ||
          ae.tagName === "SELECT" ||
          ae.isContentEditable);
      if (e.key === "Escape") {
        setShowKeys(false);
        setRejectTarget(null);
        setRegenTarget(null);
        setExportOpen(false);
        setEditingId(null);
        return;
      }
      if (typing || rejectTarget || regenTarget || exportOpen || showKeys) return;
      const d = drafts[sel];
      if (e.key === "j") scrollTo(Math.min(drafts.length - 1, sel + 1));
      else if (e.key === "k") scrollTo(Math.max(0, sel - 1));
      else if (!d) return;
      else if (e.key === "a") void doApprove(d);
      else if (e.key === "e") startEdit(d);
      else if (e.key === "r") openReject(d);
      else if (e.key === "g") setRegenTarget(d);
      else if (e.key === "?") setShowKeys(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drafts, sel, scrollTo, doApprove, startEdit, openReject, rejectTarget, regenTarget, exportOpen, showKeys]);

  const openExport = useCallback(async () => {
    setExportBusy(true);
    setExportOpen(true);
    // Resolve the real edition id (live mode uses UUIDs, mock uses a fixed slug).
    const eds = await getEditions();
    const editionId =
      eds.find((e) => e.week === MOCK_EDITION)?.id ?? drafts[0]?.edition ?? "ed-w40";
    const md = await exportEdition(editionId, drafts);
    setExportMd(md);
    setExportBusy(false);
  }, [drafts]);

  const copyExport = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(exportMd);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = exportMd;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setToast("Markdown copied — paste straight into Substack");
    setTimeout(() => setCopied(false), 2500);
  }, [exportMd]);

  const readyCount = useMemo(() => drafts.filter((d) => d.status === "approved" || d.status === "edited").length, [drafts]);

  if (loading) {
    return (
      <div className="grid gap-6">
        {[0, 1].map((i) => (
          <div key={i} className="card p-6">
            <div className="shimmer h-6 w-1/3 rounded mb-4" />
            <div className="shimmer h-4 w-full rounded mb-2" />
            <div className="shimmer h-4 w-5/6 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={`Review queue · edition ${MOCK_EDITION}`}
        title={<>Approve in <span className="glow-text">15 minutes</span></>}
        sub="Every draft ships with its sources attached — a contextless approve button is not a safety measure. j/k to move, ? for shortcuts."
        action={
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => setShowKeys(true)}>
              <span className="kbd">?</span> shortcuts
            </button>
            <button className="btn-glow !py-2.5 !px-6 !text-sm" onClick={openExport} disabled={readyCount === 0}>
              ⬆ Export for Substack
            </button>
          </div>
        }
      />

      {/* progress */}
      <div className="card p-5 mb-6 rise-in">
        <ProgressBar
          value={(done / Math.max(1, drafts.length)) * 100}
          label={`${done} of ${drafts.length} sections approved`}
        />
        {allDone && (
          <p className="text-sm text-[var(--color-mint)] mt-3 rise-in">
            ✓ All sections cleared — export is ready when you are.
          </p>
        )}
      </div>

      {/* draft cards */}
      {drafts.length === 0 ? (
        <Empty
          icon="📭"
          title="No drafts yet"
          hint="Run the Saturday pipeline from the dashboard — sections land here with their sources attached."
        />
      ) : (
      <div className="grid gap-6">
        {drafts.map((d, i) => {
          const meta = STATUS_META[d.status];
          const cat = CATEGORIES.find((c) => c.id === d.category);
          const selected = i === sel;
          const editing = editingId === d.id;
          return (
            <div
              key={d.id}
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              onClick={() => setSel(i)}
              className={`card overflow-hidden rise-in transition-all ${
                selected ? "!border-[var(--color-neon)] shadow-[0_0_28px_rgba(0,229,255,0.3)]" : "opacity-95"
              }`}
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              {/* header */}
              <div className="flex flex-wrap items-center gap-2.5 px-6 pt-5 pb-4 border-b border-[rgba(0,229,255,0.12)]">
                <span className="text-xl">{cat?.icon}</span>
                <h2 className="font-display text-lg font-bold capitalize">{d.category}</h2>
                <span className={`chip ${meta.cls} !text-[0.78rem] !px-4 !py-[7px]`}>{meta.label}</span>
                <DeadlineChip deadline={d.nextDeadline} />
                <ConfidenceBadge level={categoryConfidence(d.category)} />
                <span className="text-[0.7rem] font-mono text-[var(--color-faint)] ml-auto">
                  {d.modelUsed} · {compactNum(d.tokensUsed)} tok
                </span>
              </div>

              <div className="grid lg:grid-cols-[1fr_300px]">
                {/* draft body */}
                <div className="p-6">
                  {d.status === "rejected" && d.rejectionReason && (
                    <div className="rounded-xl border border-[rgba(255,107,129,0.4)] bg-[rgba(255,107,129,0.06)] px-4 py-3 mb-4 text-sm">
                      <span className="text-[var(--color-rose)] font-semibold">Rejected:</span>{" "}
                      <span className="text-[var(--color-muted)]">{d.rejectionReason}</span>
                    </div>
                  )}
                  {editing ? (
                    <div>
                      <textarea
                        className="field !rounded-xl font-mono !text-[0.82rem] leading-relaxed"
                        rows={16}
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        autoFocus
                      />
                      <div className="flex gap-2 mt-3">
                        <button className="btn-glow !py-2.5 !px-6 !text-sm" onClick={() => void saveEdit(d)}>
                          ✓ Save edit
                        </button>
                        <button className="btn-ghost" onClick={() => setEditingId(null)}>
                          Cancel
                        </button>
                      </div>
                      <p className="text-xs text-[var(--color-faint)] mt-2">
                        Edits are captured verbatim for prompt improvement (LangSmith dataset).
                      </p>
                    </div>
                  ) : (
                    <div className="md">
                      <ReactMarkdown>{d.contentMd}</ReactMarkdown>
                    </div>
                  )}

                  {/* actions */}
                  {!editing && (
                    <div className="flex flex-wrap gap-2 mt-6 pt-5 border-t border-[rgba(0,229,255,0.12)]">
                      <button
                        className="btn-ghost !border-[rgba(61,220,151,0.5)] !text-[var(--color-mint)]"
                        onClick={() => void doApprove(d)}
                        disabled={d.status === "approved"}
                        title="Approve (a)"
                      >
                        ✓ Approve <span className="kbd !min-w-[20px] !h-[20px] !text-[0.66rem]">a</span>
                      </button>
                      <button className="btn-ghost" onClick={() => startEdit(d)} title="Edit inline (e)">
                        ✎ Edit <span className="kbd !min-w-[20px] !h-[20px] !text-[0.66rem]">e</span>
                      </button>
                      <button className="btn-danger" onClick={() => openReject(d)} title="Reject with reason (r)">
                        ✕ Reject <span className="kbd !min-w-[20px] !h-[20px] !text-[0.66rem]">r</span>
                      </button>
                      <button className="btn-ghost" onClick={() => setRegenTarget(d)} title="Regenerate (g)">
                        ⟳ Regenerate <span className="kbd !min-w-[20px] !h-[20px] !text-[0.66rem]">g</span>
                      </button>
                      <span className="text-[0.7rem] text-[var(--color-faint)] ml-auto self-center">
                        updated {prettyDateTime(d.updatedAt)}
                      </span>
                    </div>
                  )}
                </div>

                {/* sources side panel — always visible, approve is never contextless */}
                <aside className="border-t lg:border-t-0 lg:border-l border-[rgba(0,229,255,0.12)] bg-[rgba(4,7,15,0.55)] p-6">
                  <SectionLabel>🔗 Sources · linked to this draft</SectionLabel>
                  <div className="grid gap-3">
                    {d.sources.map((s, si) => (
                      <a
                        key={si}
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className="group rounded-xl border border-[rgba(0,229,255,0.16)] bg-[rgba(10,16,35,0.6)] p-3.5 hover:border-[var(--color-neon)] hover:shadow-[0_0_16px_rgba(0,229,255,0.25)] transition-all"
                      >
                        <p className="text-sm font-semibold leading-snug mb-1.5">
                          <span className="text-[var(--color-neon)] font-mono mr-1.5">[{si + 1}]</span>
                          {s.title}
                        </p>
                        <p className="text-[0.7rem] font-mono text-[var(--color-faint)] truncate group-hover:text-[var(--color-neon)] transition-colors">
                          ↗ {s.url.replace(/^https?:\/\//, "")}
                        </p>
                      </a>
                    ))}
                  </div>
                  <p className="text-[0.7rem] text-[var(--color-faint)] mt-4 leading-relaxed">
                    Each <span className="font-mono text-[var(--color-neon)]">[n]</span> citation in the draft
                    maps to the source with the same number here.
                  </p>
                  <div className="mt-4 pt-4 border-t border-[rgba(0,229,255,0.1)] text-[0.72rem] text-[var(--color-faint)] font-mono leading-relaxed">
                    drafted {prettyDateTime(d.createdAt)}
                    <br />
                    id {d.id.slice(0, 12)}…
                  </div>
                </aside>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* reject modal */}
      {rejectTarget && (
        <div className="modal-backdrop" onClick={() => setRejectTarget(null)}>
          <div className="modal-panel card p-6" role="dialog" aria-modal="true" aria-label="Reject section" onClick={(e) => e.stopPropagation()}>
            <p className="eyebrow mb-2">Reject section</p>
            <h3 className="font-display text-xl font-bold mb-4 capitalize">{rejectTarget.category}</h3>
            <div className="grid gap-2 mb-4">
              {REJECT_REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={`text-left rounded-xl border px-4 py-3 text-sm transition-all ${
                    reason === r
                      ? "border-[var(--color-rose)] bg-[rgba(255,107,129,0.08)] shadow-[0_0_14px_rgba(255,107,129,0.25)]"
                      : "border-[rgba(0,229,255,0.16)] text-[var(--color-muted)] hover:border-[rgba(0,229,255,0.4)]"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <textarea
              className="field mb-4"
              rows={2}
              placeholder="optional note — feeds the prompt-tuning dataset…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <button className="btn-ghost" onClick={() => setRejectTarget(null)}>Cancel</button>
              <button className="btn-danger" onClick={() => void confirmReject()}>✕ Confirm reject</button>
            </div>
          </div>
        </div>
      )}

      {/* regenerate modal */}
      {regenTarget && (
        <div className="modal-backdrop" onClick={() => !regenBusy && setRegenTarget(null)}>
          <div className="modal-panel card p-6" role="dialog" aria-modal="true" aria-label="Regenerate section" onClick={(e) => e.stopPropagation()}>
            <p className="eyebrow mb-2">Regenerate section</p>
            <h3 className="font-display text-xl font-bold mb-4 capitalize">{regenTarget.category}</h3>
            <p className="text-sm text-[var(--color-muted)] mb-3">
              Your feedback is injected into the regeneration prompt. The old version is kept for diff.
            </p>
            <textarea
              className="field mb-4"
              rows={3}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              disabled={regenBusy}
            />
            <div className="flex gap-2 justify-end">
              <button className="btn-ghost" onClick={() => setRegenTarget(null)} disabled={regenBusy}>Cancel</button>
              <button className="btn-glow !py-2.5 !px-6 !text-sm" onClick={() => void confirmRegen()} disabled={regenBusy}>
                {regenBusy ? (
                  <><span className="spinner-ring" /> Regenerating…</>
                ) : (
                  "⟳ Regenerate"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* export modal */}
      {exportOpen && (
        <div className="modal-backdrop" onClick={() => setExportOpen(false)}>
          <div
            className="card p-6 rise-in"
            role="dialog"
            aria-modal="true"
            aria-label="Substack export"
            style={{ width: "min(760px, 100%)", maxHeight: "88vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="eyebrow mb-1">Substack export</p>
                <h3 className="font-display text-xl font-bold">SL Tech Students Weekly — {MOCK_EDITION}</h3>
              </div>
              <button
                className="btn-glow !py-2.5 !px-6 !text-sm"
                onClick={() => void copyExport()}
                disabled={exportBusy || !exportMd}
              >
                {copied ? "✓ Copied" : "⧉ Copy markdown"}
              </button>
            </div>
            {exportBusy ? (
              <div className="shimmer h-64 rounded-xl" />
            ) : (
              <pre className="rounded-xl border border-[rgba(0,229,255,0.16)] bg-[rgba(4,7,15,0.7)] p-5 text-[0.78rem] font-mono leading-relaxed text-[var(--color-muted)] whitespace-pre-wrap max-h-[52vh] overflow-y-auto">
                {exportMd}
              </pre>
            )}
            <p className="text-xs text-[var(--color-faint)] mt-3">
              {readyCount} approved sections · {exportMd.length.toLocaleString()} chars · paste into the Substack editor
            </p>
          </div>
        </div>
      )}

      {/* shortcut overlay */}
      {showKeys && (
        <div className="modal-backdrop" onClick={() => setShowKeys(false)}>
          <div className="modal-panel card p-6" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts" onClick={(e) => e.stopPropagation()}>
            <p className="eyebrow mb-4">Keyboard shortcuts</p>
            <div className="grid gap-3">
              {SHORTCUTS.map((s) => (
                <div key={s.keys} className="flex items-center gap-4">
                  <span className="kbd shrink-0">{s.keys}</span>
                  <span className="text-sm text-[var(--color-muted)]">{s.action}</span>
                </div>
              ))}
            </div>
            <button className="btn-ghost w-full mt-6" onClick={() => setShowKeys(false)}>
              Back to the queue
            </button>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </>
  );
}
