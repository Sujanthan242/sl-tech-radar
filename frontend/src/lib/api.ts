/**
 * API client for the frozen v1 contract (app/API_CONTRACT.md).
 *
 * Mock policy: `NEXT_PUBLIC_MOCK=true` forces bundled mock data. When unset,
 * mock mode is the default if NEXT_PUBLIC_API_URL is missing OR unreachable —
 * the client attempts the live call once and falls back to mock on failure.
 */
import type {
  Candidate,
  Category,
  DraftSection,
  Edition,
  LedgerEvent,
  ProviderInfo,
  RejectReason,
  RunInfo,
  UsageInfo,
} from "./types";
import {
  MOCK_EDITION,
  mockCache,
  mockCandidates,
  mockDrafts,
  mockEditions,
  mockLedger,
  mockProviders,
  mockStartRun,
  mockUsage,
} from "./mock";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
const FORCE_MOCK = process.env.NEXT_PUBLIC_MOCK === "true";

export const isMockMode = FORCE_MOCK || API_URL === "";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function live<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`API ${res.status} on ${path}`);
  return (await res.json()) as T;
}

/** Run live, fall back to the mock supplier on any failure (mock policy). */
async function withFallback<T>(path: string, mock: () => Promise<T>, init?: RequestInit): Promise<T> {
  if (isMockMode) return mock();
  try {
    return await live<T>(path, init);
  } catch {
    return mock();
  }
}

/**
 * Live variant for contract endpoints that return a wrapper object
 * (`{ "drafts": [...] }`, `{ "candidates": [...] }`, …): `pick` extracts
 * the payload the page actually wants.
 */
async function withFallbackPick<T>(
  path: string,
  mock: () => Promise<T>,
  pick: (json: unknown) => T,
  init?: RequestInit,
): Promise<T> {
  if (isMockMode) return mock();
  try {
    return pick(await live<unknown>(path, init));
  } catch {
    return mock();
  }
}

const asRecord = (json: unknown): Record<string, unknown> =>
  typeof json === "object" && json !== null ? (json as Record<string, unknown>) : {};

/** Earliest "⏰ YYYY-MM-DD" stamp in draft markdown → review-queue sort key. */
function nextDeadlineOf(contentMd: string): string | null {
  const dates = Array.from(contentMd.matchAll(/⏰\s*(\d{4}-\d{2}-\d{2})/g)).map((m) => m[1]);
  return dates.length ? dates.sort()[0] : null;
}

const KIND_TO_CATEGORY: Record<string, Category> = {
  hackathon: "hackathons",
  internship: "internships",
  course: "courses",
  scholarship: "scholarships",
  "free-offer": "courses", // free credits / tool offers ride with the courses section
};

/** Frontend-only enrichment: the contract's Candidate has no `category`,
 *  but the discover page tabs by it — derive from the query that found it. */
function categoryOf(kind: string, sourceQuery = ""): Category {
  const q = sourceQuery.toLowerCase();
  for (const c of ["hackathons", "internships", "courses", "scholarships"] as Category[]) {
    if (q.includes(c) || q.includes(c.replace(/s$/, ""))) return c;
  }
  return KIND_TO_CATEGORY[kind] ?? "courses";
}

const withCategory = (c: Candidate & { sourceQuery?: string }): Candidate => ({
  ...c,
  category: c.category ?? categoryOf(c.kind, c.sourceQuery ?? ""),
});

const withNextDeadline = (d: DraftSection): DraftSection => ({
  ...d,
  nextDeadline: d.nextDeadline ?? nextDeadlineOf(d.contentMd ?? ""),
});

/* ---------------- radar runs ---------------- */

/** Local progress simulation for mock runs (mirrors the real pipeline stages). */
const runStartedAt = new Map<string, number>();

export async function startRun(): Promise<RunInfo> {
  return withFallback("/api/radar/runs", async () => {
    const run = mockStartRun();
    runStartedAt.set(run.runId, Date.now());
    return run;
  }, { method: "POST" });
}

export async function getRun(runId: string): Promise<RunInfo> {
  return withFallback(`/api/radar/runs/${runId}`, async () => {
    const t0 = runStartedAt.get(runId) ?? Date.now();
    const elapsed = (Date.now() - t0) / 1000;
    const startedAt = new Date(t0).toISOString();
    if (elapsed < 2)
      return { runId, edition: MOCK_EDITION, status: "queued", progress: 4, startedAt, stats: { candidatesFound: 0, netNew: 0, draftsReady: 0 } };
    if (elapsed < 7) {
      const p = Math.min(58, 8 + Math.round(elapsed * 7));
      return {
        runId, edition: MOCK_EDITION, status: "running", progress: p, startedAt,
        stats: { candidatesFound: 14, netNew: Math.min(8, Math.round(elapsed)), draftsReady: 0 },
      };
    }
    if (elapsed < 11) {
      const p = Math.min(92, 62 + Math.round((elapsed - 7) * 7));
      return {
        runId, edition: MOCK_EDITION, status: "drafting", progress: p, startedAt,
        stats: { candidatesFound: 14, netNew: 8, draftsReady: Math.min(4, Math.round(elapsed - 7)) },
      };
    }
    return {
      runId, edition: MOCK_EDITION, status: "in_review", progress: 100, startedAt,
      finishedAt: new Date().toISOString(),
      stats: { candidatesFound: 14, netNew: 8, draftsReady: 4 },
    };
  });
}

export async function getCandidates(runId: string): Promise<Candidate[]> {
  return withFallbackPick(
    `/api/radar/runs/${runId}/candidates`,
    async () => {
      await delay(500);
      return mockCandidates;
    },
    (json) => (asRecord(json).candidates as Candidate[]).map(withCategory),
  );
}

/* ---------------- drafts ---------------- */

export async function generateDrafts(runId: string, categories: Category[]): Promise<DraftSection[]> {
  return withFallbackPick(
    "/api/drafts/generate",
    async () => {
      await delay(900);
      return mockDrafts.filter((d) => categories.includes(d.category));
    },
    (json) => (asRecord(json).drafts as DraftSection[]).map(withNextDeadline),
    { method: "POST", body: JSON.stringify({ runId, categories }) }
  );
}

export async function getDrafts(edition: string): Promise<DraftSection[]> {
  return withFallbackPick(
    `/api/drafts?edition=${encodeURIComponent(edition)}`,
    async () => {
      await delay(400);
      return mockDrafts;
    },
    (json) => (asRecord(json).drafts as DraftSection[]).map(withNextDeadline)
  );
}

export async function updateDraft(id: string, contentMd: string): Promise<DraftSection> {
  return withFallback(
    `/api/drafts/${id}`,
    async () => {
      await delay(350);
      const d = mockDrafts.find((x) => x.id === id);
      if (!d) throw new Error("draft not found");
      return { ...d, contentMd, status: "edited" as const, updatedAt: new Date().toISOString() };
    },
    { method: "PUT", body: JSON.stringify({ contentMd }) }
  ).then(withNextDeadline);
}

export async function approveDraft(id: string): Promise<{ id: string; status: "approved" }> {
  return withFallback(
    `/api/drafts/${id}/approve`,
    async () => {
      await delay(250);
      return { id, status: "approved" as const };
    },
    { method: "POST" }
  );
}

export async function rejectDraft(
  id: string,
  reason: RejectReason,
  note?: string,
): Promise<{ id: string; status: "rejected" }> {
  return withFallback(
    `/api/drafts/${id}/reject`,
    async () => {
      await delay(250);
      const d = mockDrafts.find((x) => x.id === id);
      if (!d) throw new Error("draft not found");
      return { id, status: "rejected" as const }; // mirrors the contract: { "id", "status" }
    },
    { method: "POST", body: JSON.stringify({ reason, note }) }
  );
}

export async function regenerateDraft(id: string, feedback: string): Promise<DraftSection> {
  return withFallback(
    `/api/drafts/${id}/regenerate`,
    async () => {
      await delay(2200);
      const d = mockDrafts.find((x) => x.id === id);
      if (!d) throw new Error("draft not found");
      const v = (d.contentMd.match(/\(v(\d+)\)/)?.[1] ?? "1");
      return {
        ...d,
        id: `${d.id}-r${Date.now().toString(36)}`,
        contentMd: d.contentMd.replace(/\n?---\n?\*Regenerated[\s\S]*?\*\.?\n?/, "") + `\n\n---\n*Regenerated (v${Number(v) + 1}) with your feedback: “${feedback}”. Previous version kept for diff.*`,
        status: "draft" as const,
        rejectionReason: null,
        tokensUsed: d.tokensUsed + 940,
        updatedAt: new Date().toISOString(),
      };
    },
    { method: "POST", body: JSON.stringify({ feedback }) }
  ).then(withNextDeadline);
}

/* ---------------- editions & export ---------------- */

export async function getEditions(): Promise<Edition[]> {
  return withFallbackPick(
    "/api/editions",
    async () => {
      await delay(400);
      return mockEditions;
    },
    (json) => {
      // The contract's Edition has no shipped/cut/exports — derive them from
      // the ledger, which the archive page fetches anyway. Export history has
      // no backend record yet, so it stays empty in live mode.
      const raw = asRecord(json).editions as Edition[];
      return raw.map((ed) => ({ ...ed, shipped: [], cut: [], exports: [] }));
    }
  );
}

export async function getEditionsWithLedger(): Promise<{
  editions: Edition[];
  ledger: LedgerEvent[];
}> {
  const [editions, ledger] = await Promise.all([getEditions(), getLedger()]);
  return {
    editions: editions.map((ed) => ({
      ...ed,
      shipped: ledger
        .filter(
          (e) => e.edition === ed.week && (e.status === "approved" || e.status === "published"),
        )
        .map((e) => ({ category: categoryOf(e.kind, ""), title: e.name })),
      cut: ledger
        .filter((e) => e.edition === ed.week && e.status === "rejected")
        .map((e) => ({ title: e.name, reason: e.notes })),
    })),
    ledger,
  };
}

export async function exportEdition(id: string, sections: DraftSection[]): Promise<string> {
  return withFallbackPick(
    `/api/editions/${id}/export`,
    async () => {
      await delay(500);
      const ready = sections.filter((s) => s.status === "approved" || s.status === "edited");
      const body = ready.map((s) => s.contentMd).join("\n\n---\n\n");
      return `# SL Tech Students Weekly — ${MOCK_EDITION}\n\n*Curated for Sri Lankan tech undergrads. Never miss a deadline that matters.*\n\n${body}\n\n---\n\n*Generated with SL Tech Radar · reviewed by Sujay*\n`;
    },
    (json) => String(asRecord(json).markdown ?? ""),
    { method: "POST" }
  );
}

/* ---------------- ledger / providers ---------------- */

export async function getLedger(): Promise<LedgerEvent[]> {
  return withFallbackPick(
    "/api/ledger",
    async () => {
      await delay(300);
      return mockLedger;
    },
    (json) => asRecord(json).events as LedgerEvent[],
  );
}

export async function getProviders(): Promise<{ chain: ProviderInfo[]; usage: UsageInfo }> {
  return withFallback("/api/providers/status", async () => {
    await delay(400);
    return { chain: mockProviders, usage: mockUsage };
  });
}

export async function getCacheStats(): Promise<{ entries: number; hitRate: number; weekKey: string }> {
  await delay(200);
  return mockCache;
}

export async function clearWeekCache(): Promise<{ cleared: number }> {
  await delay(600);
  return { cleared: mockCache.entries };
}

export { isMockMode as mockActive, MOCK_EDITION };
