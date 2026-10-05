/**
 * RadarHero3D — the live 3D radar hero.
 *
 * Data: uses the `candidates` prop when given (the dashboard passes the mock
 * dataset); otherwise fetches live from `/api/radar/runs/{runId}/candidates`
 * via the contract client, which falls back to the bundled mock dataset on
 * any failure — never a blank screen, and the mock-data contract is untouched.
 *
 * Guards: the R3F scene is client-only (dynamic, ssr:false); rendering pauses
 * when scrolled off-screen (IntersectionObserver → frameloop "never");
 * prefers-reduced-motion renders one static frame; a WebGL crash falls back
 * to a static 2D radar instead of a blank card.
 */
"use client";

import dynamic from "next/dynamic";
import { Component, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Candidate } from "@/lib/types";
import { getCandidates } from "@/lib/api";
import { mockCandidates } from "@/lib/mock";
import { countdownLabel, daysUntil, prettyDate } from "@/lib/format";
import { useLite } from "@/lib/prefs";
import { KIND_LABELS, kindColor } from "./radarKinds";

const RadarScene = dynamic(() => import("./RadarScene"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 shimmer" aria-hidden="true" />,
});

interface RadarHero3DProps {
  /** Candidate nodes to plot. Falls back to a live fetch, then mock data. */
  candidates?: Candidate[];
  /** Used for the live candidates fetch when `candidates` is not provided. */
  runId?: string;
  /** Fired when a node is clicked — the dashboard routes to /discover. */
  onNodeClick?: (id: string) => void;
}

/* ---------------- error boundary → static 2D fallback ---------------- */

class RadarErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Static 2D radar — shown only if WebGL/the 3D scene fails. */
function RadarFallback({ data }: { data: Candidate[] }) {
  return (
    <div className="absolute inset-0 grid place-items-center" aria-hidden="true">
      {[80, 60, 40].map((s) => (
        <div
          key={s}
          className="absolute rounded-full border border-[rgba(0,229,255,0.22)]"
          style={{ width: `${s}%`, aspectRatio: "1" }}
        />
      ))}
      {data.map((c, i) => {
        const a = (i / Math.max(1, data.length)) * Math.PI * 2;
        const r = 30 + (i % 3) * 8;
        return (
          <div
            key={c.id}
            className="absolute w-2.5 h-2.5 rounded-full"
            style={{
              left: `${50 + Math.cos(a) * r}%`,
              top: `${50 + Math.sin(a) * r}%`,
              background: kindColor(c.kind),
              boxShadow: `0 0 10px ${kindColor(c.kind)}`,
            }}
          />
        );
      })}
      <div className="absolute w-3 h-3 rounded-full bg-[var(--color-neon)] shadow-[0_0_18px_rgba(0,229,255,0.9)]" />
    </div>
  );
}

/* ---------------- shared overlays (3D + lite hero) ---------------- */

function HeroHeader({ data, urgent, kindsPresent }: {
  data: Candidate[] | null;
  urgent: number;
  kindsPresent: string[];
}) {
  return (
    <div className="absolute top-0 left-0 right-0 flex flex-wrap items-start justify-between gap-2 p-4 pointer-events-none">
      <div>
        <p className="eyebrow !text-[0.62rem] !tracking-[3px]">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-mint)] shadow-[0_0_8px_rgba(61,220,151,0.9)] mr-2 align-middle" />
          Live radar
        </p>
        <p className="text-xs text-[var(--color-muted)] mt-1 font-mono">
          {data ? (
            <>
              <b className="text-[var(--color-ink)]">{data.length}</b> opportunities
              {urgent > 0 && (
                <>
                  {" · "}<b className="text-[var(--color-rose)]">{urgent} closing ≤ 7d</b>
                </>
              )}
            </>
          ) : (
            "scanning…"
          )}
        </p>
      </div>
      {/* legend: color = kind */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 justify-end max-w-full sm:max-w-[55%]" aria-label="Legend: node color by category">
        {kindsPresent.map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5 text-[0.66rem] font-mono text-[var(--color-muted)]">
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: kindColor(k), boxShadow: `0 0 8px ${kindColor(k)}` }}
            />
            {KIND_LABELS[k] ?? k}
          </span>
        ))}
      </div>
    </div>
  );
}

function HeroFooter({ lite }: { lite: boolean }) {
  return (
    <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-none">
      <p className="text-center text-[0.66rem] font-mono text-[var(--color-faint)]">
        {lite
          ? "◉ static radar · lite mode — tap to open discover"
          : "◉ pulsing = closing ≤ 7 days · inner rings = urgent · hover/tap a node · click → discover"}
      </p>
    </div>
  );
}

const HERO_BOX =
  "relative w-full h-[340px] md:h-[400px] rounded-[18px] overflow-hidden border border-[rgba(0,229,255,0.25)] bg-[radial-gradient(ellipse_at_center,rgba(0,229,255,0.06),transparent_70%),var(--color-panel)]";

/* ---------------- main component ---------------- */

export default function RadarHero3D({ candidates, runId, onNodeClick }: RadarHero3DProps) {
  const { lite } = useLite();
  const [fetched, setFetched] = useState<Candidate[] | null>(null);
  const [inView, setInView] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  const [hovered, setHovered] = useState<Candidate | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  /* data: the `candidates` prop wins; otherwise fetch live once, then mock */
  const data = candidates ?? fetched;
  useEffect(() => {
    if (candidates) return;
    let alive = true;
    getCandidates(runId ?? "latest").then((list) => {
      if (alive) setFetched(list.length > 0 ? list : mockCandidates);
    });
    return () => {
      alive = false;
    };
  }, [candidates, runId]);

  /* pause rendering when scrolled off-screen */
  useEffect(() => {
    const el = boxRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.02,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* one static frame for reduced-motion users */
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const urgent = (data ?? []).filter((c) => {
    const d = daysUntil(c.deadline);
    return d !== null && d >= 0 && d <= 7;
  }).length;

  const animated = !reducedMotion;
  const kindsPresent = [...new Set((data ?? []).map((c) => c.kind))];
  const ariaLabel = `3D radar — ${data?.length ?? 0} opportunities plotted by category and deadline urgency${urgent > 0 ? `, ${urgent} closing within 7 days` : ""}`;

  /* lite mode: static gradient hero, no WebGL — three.js never loads */
  if (lite) {
    return (
      <div
        className={`${HERO_BOX} cursor-pointer`}
        role="region"
        aria-label={`${ariaLabel} (lite mode — static)`}
        onClick={() => onNodeClick?.("lite")}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onNodeClick?.("lite");
        }}
        tabIndex={0}
      >
        <RadarFallback data={data ?? []} />
        <HeroHeader data={data} urgent={urgent} kindsPresent={kindsPresent} />
        <HeroFooter lite />
      </div>
    );
  }

  return (
    <div
      ref={boxRef}
      className={HERO_BOX}
      role="region"
      aria-label={ariaLabel}
    >
      {/* 3D scene */}
      {data ? (
        <RadarErrorBoundary fallback={<RadarFallback data={data} />}>
          <RadarScene
            candidates={data}
            animated={animated}
            active={inView}
            onHover={setHovered}
            onSelect={(id) => onNodeClick?.(id)}
          />
        </RadarErrorBoundary>
      ) : (
        <div className="absolute inset-0 shimmer" aria-hidden="true" />
      )}

      <HeroHeader data={data} urgent={urgent} kindsPresent={kindsPresent} />

      {/* hover tooltip — title + deadline + source */}
      {hovered && (
        <div className="absolute top-[74px] left-4 right-4 sm:right-auto sm:max-w-[300px] card !rounded-xl p-4 rise-in pointer-events-none z-10">
          <p className="flex items-center gap-2 text-[0.66rem] font-mono uppercase tracking-widest mb-1.5">
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: kindColor(hovered.kind), boxShadow: `0 0 8px ${kindColor(hovered.kind)}` }}
            />
            <span style={{ color: kindColor(hovered.kind) }}>{KIND_LABELS[hovered.kind] ?? hovered.kind}</span>
          </p>
          <p className="text-sm font-bold leading-snug mb-1.5 break-words">{hovered.title}</p>
          <p className="text-xs text-[var(--color-muted)] font-mono">
            ⏳ {hovered.deadline ? `${prettyDate(hovered.deadline)} · ${countdownLabel(hovered.deadline)}` : "date TBC"}
          </p>
          <p className="text-[0.7rem] font-mono text-[var(--color-faint)] truncate mt-1">
            ↗ {hovered.url.replace(/^https?:\/\//, "").split("/")[0]}
          </p>
        </div>
      )}

      <HeroFooter lite={false} />
    </div>
  );
}
