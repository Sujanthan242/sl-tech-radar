# SL Tech Radar — E2E QA Report

**Date:** 2026-10-04 · **Profile:** backend `dev` (H2 in-memory) + `next start` production build
**Contract:** `API_CONTRACT.md` (frozen v1) · **Method:** curl against live servers + code inspection (no browser)

## Verdict: ✅ PASS — 14/14 backend endpoints, 5/5 frontend routes, secret-free, commit-ready

## Backend endpoint matrix

| # | Endpoint | Expected | Actual | Result |
|---|---|---|---|---|
| 1 | `POST /api/radar/runs` | `202` + `{runId, edition}` | `202`, `{"runId":"8114e1f4-…","edition":"2026-W40"}` | ✅ PASS |
| 2 | `GET /api/radar/runs/{id}` | `{runId, edition, status(enum), progress, startedAt, finishedAt?, stats{candidatesFound, netNew, draftsReady}}` | `status:"in_review"`, `progress:100`, stats `10/6/4`, ISO-8601 timestamps | ✅ PASS |
| 3 | `GET /api/radar/runs/{id}/candidates` | `{candidates:[Candidate]}` — `id,title,url,deadline,deadlineConfidence,kind,snippet,sourceQuery,dedupStatus` | 10 candidates, all fields present; enums valid (`NEW`, `high`) | ✅ PASS |
| 4 | `POST /api/drafts/generate` `{runId, categories:[4]}` | `{drafts:[{id, category, status:"draft"}]}` | 4 drafts, one per category | ✅ PASS |
| 5 | `GET /api/drafts?edition=2026-W40` | `{drafts:[DraftSection]}` — all 11 contract fields | exact field set `id,edition,category,contentMd,status,rejectionReason,tokensUsed,modelUsed,sources,createdAt,updatedAt`; `"modelUsed":"template"` in mock | ✅ PASS |
| 6 | `PUT /api/drafts/{id}` `{contentMd}` | updated DraftSection, `status:"edited"` | `edited`, content persisted | ✅ PASS |
| 7 | `POST /api/drafts/{id}/approve` | `{id, status:"approved"}` | exact match | ✅ PASS |
| 8 | `POST /api/drafts/{id}/reject` `{reason,note}` | `{id, status:"rejected"}`, reason persisted | exact match; `rejectionReason:"duplicate — already covered last week"` | ✅ PASS |
| 9 | `POST /api/drafts/{id}/regenerate` `{feedback}` | new DraftSection, new id, old kept | new id ≠ old, `status:"draft"` | ✅ PASS |
| 10 | `GET /api/editions` | `{editions:[{id, week, status(enum), stats{found,approved,rejected,tokensUsed,costUsd}, createdAt}]}` | `week:"2026-W40"`, `status:"in_review"`, stats `10/2/1/2424/$0.0` | ✅ PASS |
| 11 | `POST /api/editions/{id}/export` | `{markdown:"# SL Tech Students Weekly …"}` | starts `# SL Tech Students Weekly — 2026-W40`, includes approved sections + "Cut this week" with rejection reason | ✅ PASS |
| 12 | `GET /api/ledger` | `{events:[…]}` — `id,name,url,kind,registrationDeadline,notes,status,edition,firstSeen` | 12 events, exact field set | ✅ PASS |
| 13 | `GET /api/providers/status` | `{chain:[{name,status,latencyMs,model}], usage{month,tokensIn,tokensOut,tavilyCreditsUsed,costUsd,projectedRunway}}` | `template` active, others unavailable (mock); `projectedRunway:"100+ years"` | ✅ PASS |
| 14 | `GET /api/providers/fallback-test` | `{nebiusSimulated:"down", servedBy, ok:true, latencyMs}` | `servedBy:"template"` (only active provider in mock — correct), `ok:true` | ✅ PASS |
| — | error shape | `{ "error": "message" }` | unknown run/draft → `{"error":"Unknown run: nope-123"}`, HTTP 400 | ✅ PASS |

Full Saturday flow verified end-to-end: **run → poll → candidates → generate → list → approve / reject / edit / regenerate → export → providers**. Export markdown is sane (approved sections assembled, rejected listed under "Cut this week").

## Frontend

| Route | Before fix | After fix |
|---|---|---|
| `/` | 200 | 200 |
| `/discover` | 200 | 200 |
| `/editions` | 200 | 200 |
| `/review` | 200 | 200 |
| `/settings` | 200 | 200 |

`npm run build` green 3× (baseline, after api.ts fixes, after standalone-output change); TypeScript clean.

### Mock-mode coherence
Frontend types are a **benign superset** of the contract (extra frontend-only fields: `Candidate.category`, `DraftSection.nextDeadline`, `Edition.shipped/cut/exports`, `UsageInfo.tavilyCreditsFree`). Enums match exactly. The api client now enriches live responses with the derived fields, so live and mock modes render identically.

## Bugs found & fixed (all in frontend live path — mock mode was unaffected)

| ID | Bug | Fix |
|---|---|---|
| B1 | `api.ts` live path never unwrapped the contract's wrapper objects (`{drafts}`, `{candidates}`, `{editions}`, `{events}`, `{markdown}`) — every list/export page would have broken against a real backend | New `withFallbackPick(path, mock, pick)` helper unwraps per the contract; live-only |
| B2 | `rejectDraft` returned a full `DraftSection` in mock, but the contract says `{id, status}` | Client now returns `{id, status:"rejected"}` in both modes; review page merges onto the local draft |
| B3 | Review page called `exportEdition("ed-w40", …)` — hardcoded id, 404s in live mode (UUIDs) | Edition id resolved from `getEditions()` by week, with fallback |
| B4 | Discover page used hardcoded runId `"mock-run"` — in live mode this would silently fall back to mock data | Live mode now `POST /api/radar/runs`, polls to 100%, then fetches real candidates; `category` derived from kind/query, `nextDeadline` parsed from `⏰ YYYY-MM-DD` stamps |
| B5 | Dev DB passwords hardcoded in `backend/docker-compose.yml` | `${POSTGRES_PASSWORD:-radar-dev}` substitution; `application.properties` default aligned |

## Notes (not bugs)
- Contract examples say edition `2026-W41`; the real ISO week of 2026-10-04 is **W40** — the backend is correct.
- Unknown run/draft returns HTTP **400** with the correct `{error}` shape; 404 would be more RESTful but the contract doesn't specify codes — left as-is.
- `docker compose config` couldn't run (no Docker in this VM); both compose files YAML-parse clean.

## Secrets scan — CLEAN ✅
- No API keys, tokens, passwords, or key-like strings anywhere in source (`sk-…`, `ghp_…`, `AKIA…`, `tavily-…`, `AIza…` patterns: zero hits; no `key/secret/password = "literal"` assignments).
- `.env.example` files exist for backend (created this phase) and frontend; root `.gitignore` excludes `.env`, `.env.local`, `*.pem`, `*.key`, `target/`, `node_modules/`, `.next/`.

## What remains for Sujay (the 5%)
1. `git init` + push to `Sujanthan242/sl-tech-radar` (everything is commit-ready; not initialized here on purpose).
2. Screen-record the 60-sec demo using `DEMO_SCRIPT.md`, then publish with `LINKEDIN_POST_DRAFT.md`.
3. When ready for live mode: copy `.env.example` → `.env`, add the two Nebius promo codes + Tavily key.
