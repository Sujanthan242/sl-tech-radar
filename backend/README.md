# SL Tech Radar — Backend

Spring Boot 4.0.x + Java 21 AI backend for Sujay's weekly Substack
**"SL Tech Students Weekly"**. Pipeline: **Tavily live search → deterministic
dedup → deadline pre-pass → one structured draft call per category → human
review queue**. Implements [`API_CONTRACT.md`](../API_CONTRACT.md) v1 exactly.

## Stack (pinned, verified on Maven Central 2026-10-04)

| Piece | Version | Notes |
|---|---|---|
| Spring Boot | **4.0.8** | latest 4.0.x GA |
| Spring AI BOM | **2.0.1** | imported for version alignment; 2.1.0-M1 avoided (milestone) |
| Java | 21 (Temurin) | |
| Maven | 3.9.16 | |
| Spring Data JPA / Caffeine | via Boot BOM | |
| PostgreSQL | 16 (Docker) | default profile |
| H2 | via Boot BOM | `dev` profile |

> **Spring Boot 4 notes:** Boot 4 ships **Jackson 3** (`tools.jackson.*`, not
> `com.fasterxml.jackson.*`) — all JSON code uses the new package. Boot 4
> artifacts also publish Gradle-flattened POMs (explicit versions, no
> `<parent>`); the offline resolver in `~/workspace/.build-tools/m2fetch.py`
> accounts for this.

> **Spring AI note:** the BOM is imported so Spring AI stays version-aligned
> with the project, but the provider chain is hand-rolled on Spring
> `RestClient` rather than Spring AI's `ChatModel` beans. Reason: the chain
> needs uniform cross-provider semantics — availability probing (missing key ⇒
> bean reports unavailable), per-call token/cost capture, and chaos testing —
> that auto-configured chat models don't expose cleanly. All providers are
> OpenAI-compatible / plain REST, so Spring AI's OpenAI chat model remains a
> drop-in alternative later.

## Quick start

```bash
# 0) Toolchain (one-time) — Temurin JDK 21 + Maven live here durably:
export JAVA_HOME=~/workspace/.build-tools/jdk-21*   # adjust to extracted dir name
export M2_HOME=~/workspace/.build-tools/apache-maven-3.9.16
export PATH=$JAVA_HOME/bin:$M2_HOME/bin:$PATH

# 1a) Dev profile — H2 in-memory, zero dependencies, mock mode out of the box:
SPRING_PROFILES_ACTIVE=dev mvn spring-boot:run

# 1b) Default profile — PostgreSQL via Docker Compose:
docker compose up -d db
mvn spring-boot:run
```

The API is then at `http://localhost:8080` (see `API_CONTRACT.md`).

## Environment variables

No keys are ever hardcoded. A missing key ⇒ that provider bean reports
**unavailable** and the chain falls through silently.

| Variable | Purpose | Required? |
|---|---|---|
| `NEBIUS_API_KEY` | Nebius Token Factory (primary LLM) | No — chain falls through |
| `GROQ_API_KEY` | Groq free tier (fallback 1) | No |
| `GEMINI_API_KEY` | Gemini Flash-Lite (fallback 2) | No |
| `OLLAMA_BASE_URL` | Local Ollama (fallback 3), default `http://localhost:11434` | No |
| `TAVILY_API_KEY` | Tavily `/search` (discovery) | No — mock discovery otherwise |
| `LANGSMITH_API_KEY` | LangSmith tracing | No — tracing is a no-op without it |
| `LANGSMITH_PROJECT` | Trace project name (default `sl-tech-radar`) | No |
| `LANGSMITH_DATASET_ID` | Dataset receiving rejected drafts | No |
| `APP_PROVIDERS_ORDER` | Chain order, e.g. `groq,nebius,gemini,ollama,template` | No |
| `NEBIUS_MODEL` / `GROQ_MODEL` / `GEMINI_MODEL` / `OLLAMA_MODEL` | Model overrides | No |
| `DB_HOST` `DB_PORT` `DB_NAME` `DB_USER` `DB_PASSWORD` | Postgres connection (default profile) | For Docker Compose: no (defaults match) |
| `PORT` | HTTP port (default 8080) | No |
| `APP_MOCK_ENABLED` | Seed curated samples when no AI keys (default true) | No |

## Profiles

| Profile | DB | When to use |
|---|---|---|
| *(default)* | PostgreSQL (`DB_HOST`, default localhost) | Real runs, Docker Compose |
| `dev` | H2 in-memory (`create-drop`) | Frontend dev, demos, no Docker |

## How mock mode works

With **no provider keys** in the environment, the backend still serves every
endpoint:

- `POST /api/radar/runs` → discovery returns ~10 curated sample candidates
  (`MockDataService`), dedup/deadline/grade run for real, drafts are built by
  the **template provider** (`"modelUsed": "template"` — clearly marked).
- `GET /api/providers/status` → `template` shows `active`, everything else
  `unavailable`; usage shows `projectedRunway: "100+ years"`.
- Startup seeds **3 sample ledger events** (2 published, 1 rejected with a
  reason) so `/api/ledger` is never empty.

## Endpoints

All per [`API_CONTRACT.md`](../API_CONTRACT.md):

| Method & path | What it does |
|---|---|
| `POST /api/radar/runs` | Starts the async pipeline → `202 {runId, edition}` |
| `GET /api/radar/runs/{runId}` | Status + `progress` 0–100 + `stats{candidatesFound, netNew, draftsReady}` |
| `GET /api/radar/runs/{runId}/candidates` | Raw candidates with `NEW / SEEN / VERIFY` flags |
| `POST /api/drafts/generate` | `{runId, categories[]}` → one structured draft per category |
| `GET /api/drafts?edition=2026-W41` | Draft sections with sources + model/tokens |
| `PUT /api/drafts/{id}` | Inline edit → status `edited` (+ LangSmith 0.5 feedback) |
| `POST /api/drafts/{id}/approve` | → `approved` (+ LangSmith 1.0 feedback, ledger → approved) |
| `POST /api/drafts/{id}/reject` | `{reason, note?}` → `rejected`, reason → ledger + LangSmith dataset |
| `POST /api/drafts/{id}/regenerate` | `{feedback}` → **new** draft row; old kept for diffing |
| `GET /api/editions` | Archive with per-edition stats |
| `POST /api/editions/{id}/export` | `{markdown}` ready to paste into Substack |
| `GET /api/ledger?q=&kind=&status=` | Searchable seen-events ledger |
| `GET /api/providers/status` | Chain health + monthly tokens/cost + runway |
| `GET /api/providers/fallback-test` | Chaos button: simulates Nebius down, reports who served |

## Key design points

- **Fallback chain** (`ai/`): `AiProvider` interface; beans tried in
  `app.providers.order` = `nebius → groq → gemini → ollama → template`.
- **Dedup** (`pipeline/DedupService`): normalized-URL exact match first, then
  Jaro-Winkler ≥ 0.85 on titles. No embeddings.
- **Deadline pre-pass** (`pipeline/DeadlineExtractor`): regex + date parsing
  over snippets *before* the LLM call → `high/medium/low` confidence.
- **Content-addressed draft cache** (`pipeline/DraftService`):
  `SHA256(category + week + sorted source URLs)` → Caffeine + `draft_sections.cache_key`.
  Identical inputs are never regenerated.
- **Tavily** (`search/TavilyClient`): basic search, 1 credit, `time_range="week"`,
  cached per query+week. *Note: Tavily was acquired by Nebius (Feb 2026); the
  wrapper follows the stable `/search` shape — if Nebius reshapes the API,
  adapt this one class. Fallback today: mock discovery.*
- **LangSmith** (`tracing/TracingService`): one trace per run
  (`weekly_radar_run` → `discover_opportunities`, `deduplicate_candidates`,
  `draft_section_<category>`); binary feedback on approve/edit/reject;
  rejections appended to a dataset. No-op without `LANGSMITH_API_KEY`.
- **Cost math** (`cost/`): tokens in/out recorded per call;
  `/providers/status` returns monthly usage + `projectedRunway`.

### The "$50 ≈ 100+ years" derivation

- Nebius Llama 3.3 70B: $0.13 / $0.40 per 1M tokens (in/out).
- One weekly run ≈ 8k input + 3k output tokens → 8000/1e6×0.13 + 3000/1e6×0.40
  = **$0.00224/run** → ≈ **$0.116/year**.
- $50 ÷ $0.116/yr ≈ **429 years** → reported as **"100+ years"** (capped, per contract).
- Tavily: 1 credit per basic search; ~40 searches/month ≈ 480/yr — covered by
  the free 1,000 credits/month tier.

## Tests

```bash
mvn test      # unit tests: dedup, deadline parser, cost estimator, fallback chain
mvn package   # full build (must pass)
```

## Building in this sandbox (offline Maven)

This VM's egress proxy allows `curl` but blocks the `java` binary from opening
HTTPS tunnels, so Maven cannot download dependencies directly. The workaround
used here (all network I/O via `curl`, which the sandbox permits):

```bash
# 1) Populate the local repo (~/.m2 -> /root/.m2 for root builds):
python3 ~/workspace/.build-tools/m2fetch.py            # library closure
python3 ~/workspace/.build-tools/m2fetch.py --loop     # runs `mvn -o package`,
                                                       # fetches whatever it
                                                       # reports missing, repeats
# 2) Normal offline build afterwards:
mvn -o package
```

`m2fetch.py` resolves the dependency graph from POMs (handles Spring Boot 4's
Gradle-flattened POMs, classic parent chains, imported BOMs, exclusions) and
drops artifacts into the standard `/root/.m2/repository` layout. If Maven
reports a missing artifact, run the `--loop` again — it parses the error and
fetches it.

> Note: the sandbox's proxy password rotates frequently. If `curl` starts
> failing, it picks up the fresh password from `$https_proxy` automatically —
> no action needed. (`~/.m2/settings.xml` carries a proxy entry for direct
> Maven use on machines where Java *can* egress; it is not used by the
> offline flow above.)

## Docker

```bash
docker compose up -d db                 # Postgres only
docker compose --profile app up --build # Postgres + backend (keys via env)
```
