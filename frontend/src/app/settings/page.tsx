"use client";

import { useEffect, useState } from "react";
import { PageHeader, SectionLabel, StatusDot, Toast } from "@/components/ui";
import { clearWeekCache, getCacheStats, getProviders } from "@/lib/api";
import type { ProviderInfo } from "@/lib/types";
import { MOCK_EDITION } from "@/lib/mock";
import { useI18n } from "@/lib/i18n";

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
  const { t } = useI18n();
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
    setToast(t.settings.toastCache(cleared, MOCK_EDITION));
  }

  function togglePref(key: keyof typeof prefs) {
    if (typeof prefs[key] !== "boolean") return;
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  }

  return (
    <>
      <PageHeader
        eyebrow={t.settings.eyebrow}
        title={<>{t.settings.titleA} <span className="glow-text">{t.settings.titleB}</span></>}
        sub={t.settings.sub}
      />

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* provider keys */}
        <div className="card p-6 rise-in">
          <SectionLabel>{t.settings.providerKeys}</SectionLabel>
          <div className="grid gap-4">
            {KEY_FIELDS.map((k) => (
              <div key={k.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 mb-1.5">
                  <label htmlFor={`key-${k.id}`} className="text-sm font-semibold">
                    {k.label}
                  </label>
                  <span className="text-[0.68rem] font-mono text-[var(--color-faint)] break-words">{k.hint}</span>
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
            onClick={() => setToast(t.settings.toastKeys)}
          >
            {t.settings.saveKeys}
          </button>
          <p className="text-[0.7rem] text-[var(--color-faint)] mt-3 leading-relaxed">
            {t.settings.keysNote}
          </p>
        </div>

        {/* fallback chain */}
        <div className="card p-6 rise-in" style={{ animationDelay: "0.06s" }}>
          <SectionLabel>{t.settings.fallbackChain}</SectionLabel>
          <div className="grid gap-2.5">
            {chain.map((p, i) => (
              <div
                key={p.name}
                className="flex items-center gap-3 rounded-xl border border-[rgba(0,229,255,0.16)] bg-[var(--color-inset)] px-4 py-3"
              >
                <span className="font-mono text-xs text-[var(--color-faint)] w-7">#{i + 1}</span>
                <StatusDot status={p.status} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold capitalize text-sm">{p.name}</p>
                  <select
                    className="mt-1 w-full bg-transparent text-[0.72rem] font-mono text-[var(--color-muted)] outline-none cursor-pointer"
                    value={models[p.name] ?? p.model}
                    onChange={(e) => setModels((m) => ({ ...m, [p.name]: e.target.value }))}
                    aria-label={t.settings.modelFor(p.name)}
                  >
                    {(MODEL_OPTIONS[p.name] ?? [p.model]).map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    className="text-[var(--color-muted)] hover:text-[var(--color-neon)] disabled:opacity-25 text-sm leading-none min-w-[36px] min-h-[36px] grid place-items-center"
                    onClick={() => moveProvider(i, -1)}
                    disabled={i === 0}
                    aria-label={t.settings.moveUp(p.name)}
                  >
                    ▲
                  </button>
                  <button
                    className="text-[var(--color-muted)] hover:text-[var(--color-neon)] disabled:opacity-25 text-sm leading-none min-w-[36px] min-h-[36px] grid place-items-center"
                    onClick={() => moveProvider(i, 1)}
                    disabled={i === chain.length - 1}
                    aria-label={t.settings.moveDown(p.name)}
                  >
                    ▼
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            className="btn-ghost w-full mt-4"
            onClick={() => setToast(t.settings.toastChain)}
          >
            {t.settings.saveChain}
          </button>
          <p className="text-[0.7rem] text-[var(--color-faint)] mt-3 leading-relaxed">
            {t.settings.chainNote}
          </p>
        </div>

        {/* cache */}
        <div className="card p-6 rise-in" style={{ animationDelay: "0.12s" }}>
          <SectionLabel>{t.settings.cacheTitle}</SectionLabel>
          {cache ? (
            <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-5 text-center">
              <div className="rounded-xl border border-[rgba(0,229,255,0.14)] bg-[var(--color-inset)] p-3 sm:p-4 min-w-0">
                <p className="font-display text-xl sm:text-2xl font-bold glow-text">{cache.entries}</p>
                <p className="text-[0.66rem] text-[var(--color-faint)] uppercase tracking-widest mt-1">{t.settings.entries}</p>
              </div>
              <div className="rounded-xl border border-[rgba(0,229,255,0.14)] bg-[var(--color-inset)] p-3 sm:p-4 min-w-0">
                <p className="font-display text-xl sm:text-2xl font-bold glow-text">{Math.round(cache.hitRate * 100)}%</p>
                <p className="text-[0.66rem] text-[var(--color-faint)] uppercase tracking-widest mt-1">{t.settings.hitRate}</p>
              </div>
              <div className="rounded-xl border border-[rgba(0,229,255,0.14)] bg-[var(--color-inset)] p-3 sm:p-4 min-w-0">
                <p className="font-display text-xl sm:text-2xl font-bold truncate" title={cache.weekKey}>{cache.weekKey.replace("2026-", "’26 ")}</p>
                <p className="text-[0.66rem] text-[var(--color-faint)] uppercase tracking-widest mt-1">{t.settings.weekKey}</p>
              </div>
            </div>
          ) : (
            <div className="shimmer h-20 rounded-xl mb-5" />
          )}
          <p className="text-xs text-[var(--color-muted)] mb-4 leading-relaxed">
            {t.settings.cacheNote}
          </p>
          <button className="btn-danger w-full" onClick={() => void handleClearCache()} disabled={clearing}>
            {clearing ? (
              <><span className="spinner-ring-light" /> {t.settings.clearing}</>
            ) : (
              t.settings.clearCache
            )}
          </button>
        </div>

        {/* substack export prefs */}
        <div className="card p-6 rise-in" style={{ animationDelay: "0.18s" }}>
          <SectionLabel>{t.settings.exportPrefs}</SectionLabel>
          <div className="grid gap-4 mb-5">
            {(
              [
                { key: "deadlineSummary", label: t.settings.deadlineSummary, hint: t.settings.deadlineSummaryHint },
                { key: "tamilIntro", label: t.settings.tamilIntro, hint: t.settings.tamilIntroHint },
                { key: "sujaysTake", label: t.settings.sujaysTake, hint: t.settings.sujaysTakeHint },
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
            {t.settings.signature}
          </label>
          <input
            id="sig"
            className="field"
            value={prefs.signature}
            onChange={(e) => setPrefs((p) => ({ ...p, signature: e.target.value }))}
          />
          <button
            className="btn-ghost w-full mt-4"
            onClick={() => setToast(t.settings.toastPrefs)}
          >
            {t.settings.savePrefs}
          </button>
        </div>
      </div>

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </>
  );
}
