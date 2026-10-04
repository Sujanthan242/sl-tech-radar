"use client";

import { useEffect, useState } from "react";
import { PageHeader, SectionLabel, StatusDot, Toast } from "@/components/ui";
import { clearWeekCache, getCacheStats, getProviders } from "@/lib/api";
import type { ProviderInfo } from "@/lib/types";
import { MOCK_EDITION } from "@/lib/mock";

const KEY_FIELDS = [
  { id: "nebius", label: "Nebius Token Factory", hint: "Primary inference · Llama 3.3 70B", placeholder: "nebius-…" },
  { id: "tavily", label: "Tavily", hint: "Live search · 1 credit per basic search", placeholder: "tvly-…" },
  { id: "langsmith", label: "LangSmith", hint: "Trace one run per week · binary feedback", placeholder: "lsv2_…" },
  { id: "groq", label: "Groq", hint: "Fallback #1 · free tier", placeholder: "gsk_…" },
  { id: "gemini", label: "Gemini", hint: "Fallback #2 · Flash-Lite free tier", placeholder: "AIza…" },
] as const;

const MODEL_OPTIONS: Record<string, string[]> = {
  nebius: ["meta-llama/llama-3.3-70b-instruct", "qwen/qwen3-32b", "minimax/minimax-m3"],
  groq: ["qwen/qwen3-32b", "openai/gpt-oss-120b", "llama-3.3-70b-versatile"],
  gemini: ["gemini-2.5-flash-lite", "gemini-2.5-flash"],
  ollama: ["llama3.1:8b (local)"],
  template: ["curated templates (no AI)"],
};

export default function Settings() {
  const [chain, setChain] = useState<ProviderInfo[]>([]);
  const [models, setModels] = useState<Record<string, string>>({});
  const [cache, setCache] = useState<{ entries: number; hitRate: number; weekKey: string } | null>(null);
  const [clearing, setClearing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [prefs, setPrefs] = useState({
    deadlineSummary: true,
    tamilIntro: true,
    sujaysTake: true,
    signature: "— Sujay · SL Tech Students Weekly",
  });

  useEffect(() => {
    getProviders().then(({ chain }) => {
      setChain(chain);
      const m: Record<string, string> = {};
      chain.forEach((p) => {
        m[p.name] = p.model;
      });
      setModels(m);
    });
    getCacheStats().then(setCache);
  }, []);

  function moveProvider(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= chain.length) return;
    setChain((prev) => {
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function handleClearCache() {
    setClearing(true);
    const { cleared } = await clearWeekCache();
    setCache((c) => (c ? { ...c, entries: 0, hitRate: 0 } : c));
    setClearing(false);
    setToast(`Cleared ${cleared} cached entries for ${MOCK_EDITION}`);
  }

  function togglePref(key: keyof typeof prefs) {
    if (typeof prefs[key] !== "boolean") return;
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  }

  return (
    <>
      <PageHeader
        eyebrow="Configuration"
        title={<>Control <span className="glow-text">room</span></>}
        sub="Providers, fallback chain, models, cache, and how the Substack export is shaped."
      />

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* provider keys */}
        <div className="card p-6 rise-in">
          <SectionLabel>Provider keys</SectionLabel>
          <div className="grid gap-4">
            {KEY_FIELDS.map((k) => (
              <div key={k.id}>
                <div className="flex items-baseline justify-between mb-1.5">
                  <label htmlFor={`key-${k.id}`} className="text-sm font-semibold">
                    {k.label}
                  </label>
                  <span className="text-[0.68rem] font-mono text-[var(--color-faint)]">{k.hint}</span>
                </div>
                <input
                  id={`key-${k.id}`}
                  type="password"
                  className="field font-mono !text-sm"
                  placeholder={k.placeholder}
                  autoComplete="off"
                />
              </div>
            ))}
          </div>
          <button
            className="btn-ghost w-full mt-5"
            onClick={() => setToast("Mock mode — keys stay in your browser and are never sent anywhere")}
          >
            💾 Save keys
          </button>
          <p className="text-[0.7rem] text-[var(--color-faint)] mt-3 leading-relaxed">
            In production these are server-side secrets (never shipped to the browser). Missing keys are fine —
            the chain falls through to template mode automatically.
          </p>
        </div>

        {/* fallback chain */}
        <div className="card p-6 rise-in" style={{ animationDelay: "0.06s" }}>
          <SectionLabel>Fallback chain · drag-free reorder</SectionLabel>
          <div className="grid gap-2.5">
            {chain.map((p, i) => (
              <div
                key={p.name}
                className="flex items-center gap-3 rounded-xl border border-[rgba(0,229,255,0.16)] bg-[rgba(4,7,15,0.5)] px-4 py-3"
              >
                <span className="font-mono text-xs text-[var(--color-faint)] w-7">#{i + 1}</span>
                <StatusDot status={p.status} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold capitalize text-sm">{p.name}</p>
                  <select
                    className="mt-1 w-full bg-transparent text-[0.72rem] font-mono text-[var(--color-muted)] outline-none cursor-pointer"
                    value={models[p.name] ?? p.model}
                    onChange={(e) => setModels((m) => ({ ...m, [p.name]: e.target.value }))}
                    aria-label={`Model for ${p.name}`}
                  >
                    {(MODEL_OPTIONS[p.name] ?? [p.model]).map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    className="text-[var(--color-muted)] hover:text-[var(--color-neon)] disabled:opacity-25 text-sm leading-none"
                    onClick={() => moveProvider(i, -1)}
                    disabled={i === 0}
                    aria-label={`Move ${p.name} up`}
                  >
                    ▲
                  </button>
                  <button
                    className="text-[var(--color-muted)] hover:text-[var(--color-neon)] disabled:opacity-25 text-sm leading-none"
                    onClick={() => moveProvider(i, 1)}
                    disabled={i === chain.length - 1}
                    aria-label={`Move ${p.name} down`}
                  >
                    ▼
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            className="btn-ghost w-full mt-4"
            onClick={() => setToast("Fallback order saved — applies to the next run")}
          >
            ✓ Save chain order
          </button>
          <p className="text-[0.7rem] text-[var(--color-faint)] mt-3 leading-relaxed">
            If a provider fails mid-run, the next one in line takes over transparently. Template mode is the
            floor — the app always works, with or without AI.
          </p>
        </div>

        {/* cache */}
        <div className="card p-6 rise-in" style={{ animationDelay: "0.12s" }}>
          <SectionLabel>Cache · week-keyed</SectionLabel>
          {cache ? (
            <div className="grid grid-cols-3 gap-4 mb-5 text-center">
              <div className="rounded-xl border border-[rgba(0,229,255,0.14)] bg-[rgba(4,7,15,0.5)] p-4">
                <p className="font-display text-2xl font-bold glow-text">{cache.entries}</p>
                <p className="text-[0.66rem] text-[var(--color-faint)] uppercase tracking-widest mt-1">entries</p>
              </div>
              <div className="rounded-xl border border-[rgba(0,229,255,0.14)] bg-[rgba(4,7,15,0.5)] p-4">
                <p className="font-display text-2xl font-bold glow-text">{Math.round(cache.hitRate * 100)}%</p>
                <p className="text-[0.66rem] text-[var(--color-faint)] uppercase tracking-widest mt-1">hit-rate</p>
              </div>
              <div className="rounded-xl border border-[rgba(0,229,255,0.14)] bg-[rgba(4,7,15,0.5)] p-4">
                <p className="font-display text-2xl font-bold">{cache.weekKey.replace("2026-", "’26 ")}</p>
                <p className="text-[0.66rem] text-[var(--color-faint)] uppercase tracking-widest mt-1">week key</p>
              </div>
            </div>
          ) : (
            <div className="shimmer h-20 rounded-xl mb-5" />
          )}
          <p className="text-xs text-[var(--color-muted)] mb-4 leading-relaxed">
            Content-addressed drafts — <span className="font-mono">SHA256(category + week + source-url-set)</span>.
            Re-running a week never re-spends tokens or Tavily credits.
          </p>
          <button className="btn-danger w-full" onClick={() => void handleClearCache()} disabled={clearing}>
            {clearing ? (
              <><span className="spinner-ring-light" /> Clearing…</>
            ) : (
              "🗑 Clear week cache"
            )}
          </button>
        </div>

        {/* substack export prefs */}
        <div className="card p-6 rise-in" style={{ animationDelay: "0.18s" }}>
          <SectionLabel>Substack export preferences</SectionLabel>
          <div className="grid gap-4 mb-5">
            {(
              [
                { key: "deadlineSummary", label: "Deadline summary table", hint: "Top-of-mail countdown grid" },
                { key: "tamilIntro", label: "Tanglish intro block", hint: "Your voice, before the sections" },
                { key: "sujaysTake", label: "“Sujay’s take” closers", hint: "Opinion line per section" },
              ] as const
            ).map((row) => (
              <div key={row.key} className="flex items-center gap-4">
                <button
                  className="toggle"
                  role="switch"
                  aria-checked={prefs[row.key]}
                  aria-label={row.label}
                  onClick={() => togglePref(row.key)}
                />
                <div>
                  <p className="text-sm font-semibold">{row.label}</p>
                  <p className="text-xs text-[var(--color-faint)]">{row.hint}</p>
                </div>
              </div>
            ))}
          </div>
          <label htmlFor="sig" className="text-sm font-semibold block mb-1.5">
            Newsletter signature
          </label>
          <input
            id="sig"
            className="field"
            value={prefs.signature}
            onChange={(e) => setPrefs((p) => ({ ...p, signature: e.target.value }))}
          />
          <button
            className="btn-ghost w-full mt-4"
            onClick={() => setToast("Export preferences saved")}
          >
            ✓ Save preferences
          </button>
        </div>
      </div>

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </>
  );
}
