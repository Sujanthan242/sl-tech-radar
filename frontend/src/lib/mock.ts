/**
 * Bundled mock data — used when NEXT_PUBLIC_MOCK=true (default) or when
 * NEXT_PUBLIC_API_URL is unset / unreachable. Anchored to "today" so the
 * demo always shows live-looking countdowns.
 */
import type {
  Candidate,
  Category,
  DraftSection,
  Edition,
  LedgerEvent,
  ProviderInfo,
  RunInfo,
  UsageInfo,
} from "./types";
import { isoWeekLabel, ymdFromNow } from "./format";

const NOW = new Date();
export const MOCK_EDITION = isoWeekLabel(NOW);
const iso = (offsetDays: number, h = 9, m = 30) =>
  new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() + offsetDays, h, m).toISOString();

/* ---------------- candidates (8 across 4 categories) ---------------- */

export const mockCandidates: Candidate[] = [
  {
    id: "cand-h1",
    title: "HackNova 2026 — National Inter-University Hackathon",
    url: "https://hacknova.lk/2026",
    deadline: ymdFromNow(5),
    deadlineConfidence: "high",
    kind: "hackathon",
    snippet:
      "48-hour build sprint hosted by the University of Moratuwa IEEE chapter. Open to all Sri Lankan undergraduates; teams of 3–4. Theme: AI for public services. LKR 500k prize pool.",
    sourceQuery: "hackathons sri lanka undergraduate 2026",
    dedupStatus: "NEW",
    category: "hackathons",
  },
  {
    id: "cand-h2",
    title: "CodeSprint 10 — Idea to Prototype in 24 Hours",
    url: "https://codesprint.lk",
    deadline: ymdFromNow(19),
    deadlineConfidence: "high",
    kind: "hackathon",
    snippet:
      "The tenth edition of Sri Lanka's flagship student hackathon. Registrations open; early-bird team slots for university societies. Covered in last week's digest.",
    sourceQuery: "coding competitions students sri lanka",
    dedupStatus: "SEEN",
    category: "hackathons",
  },
  {
    id: "cand-h3",
    title: "AI Builders Challenge — Nebius × NVIDIA",
    url: "https://builders.nebius.example/challenge",
    deadline: null,
    deadlineConfidence: "low",
    kind: "hackathon",
    snippet:
      "Global online AI build challenge with GPU credits for winners. The registration page mentions 'limited seats' but no explicit closing date was found in the snippet — needs a human check before publishing.",
    sourceQuery: "hackathons sri lanka undergraduate 2026",
    dedupStatus: "VERIFY",
    category: "hackathons",
  },
  {
    id: "cand-i1",
    title: "WSO2 Software Engineering Internship — Summer 2026",
    url: "https://wso2.com/careers/internships",
    deadline: ymdFromNow(9),
    deadlineConfidence: "high",
    kind: "internship",
    snippet:
      "6-month paid internship for 3rd/4th-year CS/SE undergrads. Java, Ballerina and cloud-native teams. Colombo + remote hybrid. Previous interns converted to ASE roles at a high rate.",
    sourceQuery: "internships sri lanka software engineering students",
    dedupStatus: "NEW",
    category: "internships",
  },
  {
    id: "cand-i2",
    title: "99x Associate Software Engineer Intern Program",
    url: "https://99x.io/careers/interns",
    deadline: ymdFromNow(26),
    deadlineConfidence: "medium",
    kind: "internship",
    snippet:
      "Structured intern track with mentorship and real client projects. Deadline inferred from the careers page ('applications close late this month') — confirm on the site.",
    sourceQuery: "internships sri lanka software engineering students",
    dedupStatus: "NEW",
    category: "internships",
  },
  {
    id: "cand-c1",
    title: "freeCodeCamp — Back End Development & APIs Certification",
    url: "https://freecodecamp.org/learn/back-end-development-and-apis",
    deadline: null,
    deadlineConfidence: "high",
    kind: "course",
    snippet:
      "Free 300-hour certification: Node, Express, MongoDB, REST APIs. Self-paced, no deadline — perfect portfolio builder alongside the Spring Boot coursework.",
    sourceQuery: "free courses scholarships tech students 2026",
    dedupStatus: "NEW",
    category: "courses",
  },
  {
    id: "cand-s1",
    title: "Google Generation Scholarship — APAC 2026",
    url: "https://buildyourfuture.withgoogle.com/scholarships/generation-google-scholarship-apac",
    deadline: ymdFromNow(33),
    deadlineConfidence: "high",
    kind: "scholarship",
    snippet:
      "USD 2,500 award for women and underrepresented students in CS across APAC, including Sri Lanka. Requires enrollment in a bachelor's program for 2026–27 and a short essay.",
    sourceQuery: "free courses scholarships tech students 2026",
    dedupStatus: "NEW",
    category: "scholarships",
  },
  {
    id: "cand-s2",
    title: "ICTA Spiralation Seed Grant — Student Track",
    url: "https://icta.lk/spiralation",
    deadline: ymdFromNow(-4),
    deadlineConfidence: "high",
    kind: "scholarship",
    snippet:
      "LKR 1.5M seed funding for student startups. This cycle closed 4 days ago — kept in the ledger so next cycle's announcement dedups correctly.",
    sourceQuery: "free courses scholarships tech students 2026",
    dedupStatus: "SEEN",
    category: "scholarships",
  },
];

/* ---------------- draft sections (4) ---------------- */

export const mockDrafts: DraftSection[] = [
  {
    id: "draft-hack",
    edition: MOCK_EDITION,
    category: "hackathons",
    contentMd: `## ⚡ Hackathons — build this month, not someday

Two real shots on goal this week. **HackNova 2026** is the headline: 48 hours, national, and the theme — *AI for public services* — is exactly the kind of problem statement that looks elite on a portfolio. If you only enter one thing this semester, make it this.

**The shortlist**
- **HackNova 2026** — team of 3–4, all SL undergrads eligible, LKR 500k prize pool. Registrations close **soon**; form your team *this weekend* [1].
- **CodeSprint 10** — the flagship is back for its tenth run. You saw it here first last week; early-bird society slots are still open if your batch missed round one [2].

> ⚠️ **Needs your eyes:** the Nebius × NVIDIA AI Builders Challenge surfaced with GPU credits for winners, but the page never states a closing date. I did **not** include it above — check the registration page before it goes in [3].

**Sujay's take:** hackathons are the fastest way to turn "I know Spring Boot" into "I shipped something with Spring Boot under pressure." Pick one. Commit publicly.`,
    status: "draft",
    rejectionReason: null,
    tokensUsed: 1184,
    modelUsed: "llama-3.3-70b",
    sources: [
      { title: "HackNova 2026 — official site", url: "https://hacknova.lk/2026" },
      { title: "CodeSprint 10 — registrations", url: "https://codesprint.lk" },
      { title: "AI Builders Challenge — Nebius × NVIDIA", url: "https://builders.nebius.example/challenge" },
    ],
    createdAt: iso(-1, 10, 12),
    updatedAt: iso(-1, 10, 12),
    nextDeadline: ymdFromNow(5),
  },
  {
    id: "draft-intern",
    edition: MOCK_EDITION,
    category: "internships",
    contentMd: `## 💼 Internships — applications open now

Internship season doesn't wait for exams to end. Two structured programs opened this week, and both convert interns to full-time at serious rates.

**The shortlist**
- **WSO2 Summer 2026** — 6-month paid track for 3rd/4th years; Java and cloud-native teams, Colombo + hybrid. Past cohorts converted to Associate SE roles — this is the single highest-ROI application you can send this month [1].
- **99x Intern Program** — mentored track with real client work from week two. The careers page says applications close "late this month" — treat it as urgent and confirm the exact date on the site [2].

**How to apply like you mean it:** one page CV, GitHub link first, and a 3-line cover note naming *their* stack. Recruiters skim for 8 seconds — make the first 8 count.`,
    status: "draft",
    rejectionReason: null,
    tokensUsed: 1022,
    modelUsed: "llama-3.3-70b",
    sources: [
      { title: "WSO2 — internships", url: "https://wso2.com/careers/internships" },
      { title: "99x — intern program", url: "https://99x.io/careers/interns" },
    ],
    createdAt: iso(-1, 10, 14),
    updatedAt: iso(-1, 10, 14),
    nextDeadline: ymdFromNow(9),
  },
  {
    id: "draft-course",
    edition: MOCK_EDITION,
    category: "courses",
    contentMd: `## 📚 Free courses — level up for LKR 0

One pick this week, and it's a deliberate one. **freeCodeCamp's Back End Development & APIs** certification (300 hours, self-paced) covers Node, Express, MongoDB and REST API design — the exact vocabulary your Spring Boot coursework is teaching you in Java.

**Why this pairs with your semester:** learning the same patterns (routing, middleware, auth) in a second stack is the fastest way to stop memorizing and start *understanding*. No deadline, no cost — start the first module tonight and thank yourself in December [1].

> Pattern to steal: every endpoint you build in Express, ask "how would I write this as a \`@RestController\`?" — that translation exercise is the whole game.`,
    status: "edited",
    rejectionReason: null,
    tokensUsed: 764,
    modelUsed: "llama-3.3-70b",
    sources: [
      { title: "freeCodeCamp — Back End Development and APIs", url: "https://freecodecamp.org/learn/back-end-development-and-apis" },
    ],
    createdAt: iso(-1, 10, 16),
    updatedAt: iso(-1, 8, 20),
    nextDeadline: null,
  },
  {
    id: "draft-schol",
    edition: MOCK_EDITION,
    category: "scholarships",
    contentMd: `## 🎓 Scholarships — money on the table

**Google Generation Scholarship (APAC 2026)** — USD 2,500 for CS undergrads across APAC including Sri Lanka. You need to be enrolled for 2026–27 and write one short essay. That's it. The essay prompt rewards *specific* project stories, not grades — your hackathon write-ups are literally the raw material [1].

**Missed this cycle:** ICTA's Spiralation student seed grant (LKR 1.5M) closed a few days ago. I'm tracking it so the next cycle lands here the day it opens — watch this space.

**Sujay's take:** most students never apply because "someone better will get it." That someone is usually just the person who applied.`,
    status: "draft",
    rejectionReason: null,
    tokensUsed: 891,
    modelUsed: "llama-3.3-70b",
    sources: [
      { title: "Generation Google Scholarship — APAC", url: "https://buildyourfuture.withgoogle.com/scholarships/generation-google-scholarship-apac" },
      { title: "ICTA Spiralation", url: "https://icta.lk/spiralation" },
    ],
    createdAt: iso(-1, 10, 18),
    updatedAt: iso(-1, 10, 18),
    nextDeadline: ymdFromNow(33),
  },
];

/* ---------------- discovery queries per category ---------------- */

export const mockQueries: Record<Category, string[]> = {
  hackathons: ["hackathons sri lanka undergraduate 2026", "coding competitions students sri lanka"],
  internships: ["internships sri lanka software engineering students", "software engineer intern colombo 2026"],
  courses: ["free courses scholarships tech students 2026", "free backend development certification 2026"],
  scholarships: ["scholarships sri lanka university students 2026", "google generation scholarship apac"],
};

/* ---------------- editions archive ---------------- */

const prevWeek = (n: number) => {
  const d = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - n * 7);
  return isoWeekLabel(d);
};

export const mockEditions: Edition[] = [
  {
    id: "ed-w40",
    week: MOCK_EDITION,
    status: "in_review",
    stats: { found: 8, approved: 1, rejected: 0, tokensUsed: 3861, costUsd: 0.0021 },
    createdAt: iso(-1, 9, 55),
    shipped: [{ category: "courses", title: "freeCodeCamp Back End cert — paired with Spring Boot" }],
    cut: [],
    exports: [],
  },
  {
    id: "ed-w39",
    week: prevWeek(1),
    status: "published",
    stats: { found: 11, approved: 4, rejected: 2, tokensUsed: 4102, costUsd: 0.0023 },
    createdAt: iso(-8, 10, 5),
    shipped: [
      { category: "hackathons", title: "CodeSprint 10 early-bird slots" },
      { category: "internships", title: "IFS R&D intern track" },
      { category: "courses", title: "Helsinki Java MOOC part II" },
      { category: "scholarships", title: "ICTA Spiralation seed grant" },
    ],
    cut: [
      { title: "Crypto trading bot contest", reason: "not SL-eligible" },
      { title: "Design-a-thon (expired listing)", reason: "deadline passed" },
    ],
    exports: [{ at: iso(-8, 14, 40), chars: 6842 }],
  },
  {
    id: "ed-w38",
    week: prevWeek(2),
    status: "published",
    stats: { found: 9, approved: 3, rejected: 3, tokensUsed: 3590, costUsd: 0.0019 },
    createdAt: iso(-15, 10, 2),
    shipped: [
      { category: "hackathons", title: "HackNova 2026 announcement" },
      { category: "courses", title: "AWS Cloud Practitioner free tier labs" },
      { category: "scholarships", title: "British Council STEM grants" },
    ],
    cut: [
      { title: "Global game jam (US-only)", reason: "not SL-eligible" },
      { title: "Duplicate: CodeSprint 9 recap", reason: "duplicate" },
      { title: "Paid bootcamp ad", reason: "low quality" },
    ],
    exports: [{ at: iso(-15, 15, 12), chars: 5918 }],
  },
  {
    id: "ed-w37",
    week: prevWeek(3),
    status: "published",
    stats: { found: 7, approved: 3, rejected: 1, tokensUsed: 3211, costUsd: 0.0017 },
    createdAt: iso(-22, 10, 8),
    shipped: [
      { category: "hackathons", title: "MoraHack 2.0 results" },
      { category: "internships", title: "Dialog Axiata intern drive" },
      { category: "courses", title: "Git & GitHub for Hackathons (e-book ch.1)" },
    ],
    cut: [{ title: "Expired: LSEG spring week", reason: "deadline passed" }],
    exports: [{ at: iso(-22, 14, 55), chars: 6104 }],
  },
];

/* ---------------- providers + usage ---------------- */

export const mockProviders: ProviderInfo[] = [
  { name: "nebius", status: "active", latencyMs: 812, model: "meta-llama/llama-3.3-70b-instruct" },
  { name: "groq", status: "standby", latencyMs: null, model: "qwen/qwen3-32b" },
  { name: "gemini", status: "standby", latencyMs: null, model: "gemini-2.5-flash-lite" },
  { name: "ollama", status: "standby", latencyMs: null, model: "llama3.1:8b (local)" },
  { name: "template", status: "standby", latencyMs: null, model: "curated templates (no AI)" },
];

export const mockUsage: UsageInfo = {
  month: `${NOW.getFullYear()}-${String(NOW.getMonth() + 1).padStart(2, "0")}`,
  tokensIn: 31_240,
  tokensOut: 11_860,
  tavilyCreditsUsed: 48,
  tavilyCreditsFree: 1000,
  costUsd: 0.0086,
  projectedRunway: "100+ years",
};

export const mockCache = { entries: 26, hitRate: 0.73, weekKey: MOCK_EDITION };

/* ---------------- ledger ---------------- */

export const mockLedger: LedgerEvent[] = [
  {
    id: "led-1",
    name: "HackNova 2026",
    url: "https://hacknova.lk/2026",
    kind: "hackathon",
    registrationDeadline: ymdFromNow(5),
    notes: "National inter-university hackathon, AI for public services",
    status: "candidate",
    edition: MOCK_EDITION,
    firstSeen: iso(-1, 9, 58),
  },
  {
    id: "led-2",
    name: "CodeSprint 10",
    url: "https://codesprint.lk",
    kind: "hackathon",
    registrationDeadline: ymdFromNow(19),
    notes: "Flagship student hackathon, 10th edition",
    status: "published",
    edition: prevWeek(1),
    firstSeen: iso(-8, 10, 1),
  },
  {
    id: "led-3",
    name: "ICTA Spiralation Seed Grant",
    url: "https://icta.lk/spiralation",
    kind: "scholarship",
    registrationDeadline: ymdFromNow(-4),
    notes: "Student track closed; watch for next cycle",
    status: "published",
    edition: prevWeek(1),
    firstSeen: iso(-8, 10, 3),
  },
];

/* ---------------- run simulation ---------------- */

export function mockStartRun(): RunInfo {
  return {
    runId: `run-${Date.now().toString(36)}`,
    edition: MOCK_EDITION,
    status: "queued",
    progress: 0,
    startedAt: new Date().toISOString(),
    stats: { candidatesFound: 0, netNew: 0, draftsReady: 0 },
  };
}
