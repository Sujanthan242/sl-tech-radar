/* Types mirroring the frozen v1 API contract (app/API_CONTRACT.md). */

export type Category = "hackathons" | "internships" | "courses" | "scholarships";
export type DedupStatus = "NEW" | "SEEN" | "VERIFY";
export type DraftStatus = "draft" | "approved" | "edited" | "rejected";
export type RunStatus = "queued" | "running" | "drafting" | "in_review" | "done" | "failed";
export type EditionStatus = "draft" | "in_review" | "published";
export type ProviderStatus = "active" | "standby" | "unavailable";
export type DeadlineConfidence = "high" | "medium" | "low";
export type RejectReason =
  | "deadline passed"
  | "not SL-eligible"
  | "duplicate"
  | "low quality"
  | "other";

export interface Candidate {
  id: string;
  title: string;
  url: string;
  deadline: string | null; // YYYY-MM-DD
  deadlineConfidence: DeadlineConfidence;
  kind: "hackathon" | "internship" | "course" | "scholarship" | "free-offer";
  snippet: string;
  sourceQuery: string;
  dedupStatus: DedupStatus;
  category: Category;
}

export interface DraftSource {
  title: string;
  url: string;
}

export interface DraftSection {
  id: string;
  edition: string;
  category: Category;
  contentMd: string;
  status: DraftStatus;
  rejectionReason: string | null;
  tokensUsed: number;
  modelUsed: string;
  sources: DraftSource[];
  createdAt: string;
  updatedAt: string;
  /** Earliest deadline among cited candidates — drives review-queue sort order. */
  nextDeadline: string | null;
}

export interface RunInfo {
  runId: string;
  edition: string;
  status: RunStatus;
  progress: number;
  startedAt: string;
  finishedAt?: string;
  stats: { candidatesFound: number; netNew: number; draftsReady: number };
}

export interface Edition {
  id: string;
  week: string;
  status: EditionStatus;
  stats: { found: number; approved: number; rejected: number; tokensUsed: number; costUsd: number };
  createdAt: string;
  shipped: { category: Category; title: string }[];
  cut: { title: string; reason: string }[];
  exports: { at: string; chars: number }[];
}

export interface LedgerEvent {
  id: string;
  name: string;
  url: string;
  kind: string;
  registrationDeadline: string | null;
  notes: string;
  status: "candidate" | "approved" | "rejected" | "published";
  edition: string;
  firstSeen: string;
}

export interface ProviderInfo {
  name: "nebius" | "groq" | "gemini" | "ollama" | "template";
  status: ProviderStatus;
  latencyMs: number | null;
  model: string;
}

export interface UsageInfo {
  month: string;
  tokensIn: number;
  tokensOut: number;
  tavilyCreditsUsed: number;
  /** Absent from the /api/providers/status usage object — frontend falls back to 1000. */
  tavilyCreditsFree?: number;
  costUsd: number;
  projectedRunway: string;
}

export const CATEGORIES: { id: Category; label: string; icon: string }[] = [
  { id: "hackathons", label: "Hackathons", icon: "⚡" },
  { id: "internships", label: "Internships", icon: "💼" },
  { id: "courses", label: "Courses", icon: "📚" },
  { id: "scholarships", label: "Scholarships", icon: "🎓" },
];

export const REJECT_REASONS: RejectReason[] = [
  "deadline passed",
  "not SL-eligible",
  "duplicate",
  "low quality",
  "other",
];
