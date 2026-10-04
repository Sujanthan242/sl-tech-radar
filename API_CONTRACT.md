# SL Tech Radar — API Contract v1 (frozen)

Base URL (dev): `http://localhost:8080` · Frontend dev: `http://localhost:3000`
All responses JSON. Timestamps ISO-8601. Errors: `{ "error": "message" }`.

Both backend and frontend MUST implement/consume exactly this contract.
Categories enum: `hackathons | internships | courses | scholarships`
Draft status enum: `draft | approved | edited | rejected`
Dedup status enum: `NEW | SEEN | VERIFY`
Run status enum: `queued | running | drafting | in_review | done | failed`

## Radar runs
- `POST /api/radar/runs` → `202 Accepted` `{ "runId": "uuid", "edition": "2026-W41" }`
  Starts async pipeline: discover (Tavily) → normalize → deterministic dedup → draft per category.
- `GET /api/radar/runs/{runId}` → `{ "runId", "edition", "status", "progress": 0-100, "startedAt", "finishedAt?", "stats": { "candidatesFound", "netNew", "draftsReady" } }`
- `GET /api/radar/runs/{runId}/candidates` → `{ "candidates": [Candidate] }`
  Candidate: `{ "id", "title", "url", "deadline": "YYYY-MM-DD|null", "deadlineConfidence": "high|medium|low", "kind": "hackathon|internship|course|scholarship|free-offer", "snippet", "sourceQuery", "dedupStatus": "NEW|SEEN|VERIFY" }`

## Drafts
- `POST /api/drafts/generate` body `{ "runId", "categories": ["hackathons", ...] }` → `{ "drafts": [{ "id", "category", "status": "draft" }] }`
- `GET /api/drafts?edition=2026-W41` → `{ "drafts": [DraftSection] }`
  DraftSection: `{ "id", "edition", "category", "contentMd", "status", "rejectionReason": null, "tokensUsed": 1234, "modelUsed": "llama-3.3-70b", "sources": [{ "title", "url" }], "createdAt", "updatedAt" }`
- `PUT /api/drafts/{id}` body `{ "contentMd" }` → updated DraftSection (status becomes `edited`)
- `POST /api/drafts/{id}/approve` → `{ "id", "status": "approved" }`
- `POST /api/drafts/{id}/reject` body `{ "reason": "deadline passed|not SL-eligible|duplicate|low quality|other", "note"? }` → `{ "id", "status": "rejected" }`
- `POST /api/drafts/{id}/regenerate` body `{ "feedback" }` → new DraftSection (new id, old kept)

## Editions & export
- `GET /api/editions` → `{ "editions": [{ "id", "week": "2026-W41", "status": "draft|in_review|published", "stats": { "found", "approved", "rejected", "tokensUsed", "costUsd" }, "createdAt" }] }`
- `POST /api/editions/{id}/export` → `{ "markdown": "# SL Tech Students Weekly ..." }`

## Ledger
- `GET /api/ledger?q=&kind=&status=` → `{ "events": [{ "id", "name", "url", "kind", "registrationDeadline", "notes", "status": "candidate|approved|rejected|published", "edition", "firstSeen" }] }`

## Providers
- `GET /api/providers/status` → `{ "chain": [{ "name": "nebius|groq|gemini|ollama|template", "status": "active|standby|unavailable", "latencyMs": null, "model": "..." }], "usage": { "month": "2026-10", "tokensIn", "tokensOut", "tavilyCreditsUsed", "costUsd", "projectedRunway": "100+ years" } }`
- `GET /api/providers/fallback-test` → `{ "nebiusSimulated": "down", "servedBy": "groq", "ok": true, "latencyMs": 812 }`

## Mock mode (no keys)
When provider keys are absent, backend MUST still serve every endpoint: discovery returns curated sample candidates (seed from `seen_events.json`-style data), drafts return template-mode sections clearly marked `"modelUsed": "template"`, and `/providers/status` shows `template` as active. Frontend MUST work against mock backend AND include a built-in mock-data fallback if the backend is unreachable (`NEXT_PUBLIC_MOCK=true`).
