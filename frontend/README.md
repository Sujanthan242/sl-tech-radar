# SL Tech Radar — Frontend

AI newsletter assistant for Sujay's weekly Substack **SL Tech Students Weekly**.
Next.js (App Router) + Tailwind CSS v4 + TypeScript, in the neon-cyan dark
design language of his portfolio. Consumes the frozen v1 contract at
`../API_CONTRACT.md` exactly.

## Quick start

```bash
npm install
npm run dev      # http://localhost:3000
```

## Mock mode (default)

No backend required. With `NEXT_PUBLIC_MOCK=true` (or simply no
`NEXT_PUBLIC_API_URL` set) the UI serves a rich bundled dataset: a full fake
week — 8 candidates, 4 draft sections with clickable sources, editions
history, provider health, usage meters. The 60-second LinkedIn demo runs
entirely in mock mode.

```bash
npm run dev   # mock mode out of the box
```

To go live against the Spring Boot backend:

```bash
# .env.local
NEXT_PUBLIC_MOCK=false
NEXT_PUBLIC_API_URL=http://localhost:8080
```

Live calls that fail still fall back to mock data (never a blank screen).

## Scripts

| script        | what it does                        |
| ------------- | ----------------------------------- |
| `npm run dev` | dev server on :3000                 |
| `npm run build` | production build (must be green)  |
| `npm run start` | serve the production build        |
| `npm run lint` | eslint (next config)               |

## Routes

| route        | screen                                                       |
| ------------ | ------------------------------------------------------------ |
| `/`          | **Dashboard** — radar status, big Generate button w/ animated progress, `<RadarHero3D />` Phase-2 slot, provider health strip, monthly usage meter |
| `/discover`  | **Discover** — category tabs, editable per-category queries, result cards (🟢 NEW / ⚪ SEEN collapsible / ⚠️ VERIFY) |
| `/review`    | **Review queue** — deadline-sorted drafts, rendered markdown beside an always-visible sources panel, approve/edit/reject/regenerate, keyboard-first (`j/k/a/e/r/g/?`), progress bar, Substack export |
| `/editions`  | **Editions** — archive: what shipped, what was cut + reasons, export history, per-edition token cost, dedup ledger |
| `/settings`  | **Settings** — provider keys, fallback chain reorder + model picker, cache stats + clear, Substack export preferences |

## Structure

```
src/
  app/
    page.tsx            Dashboard
    discover/page.tsx   Discover
    review/page.tsx     Review queue (keyboard-first)
    editions/page.tsx   Editions archive + ledger
    settings/page.tsx   Settings
    layout.tsx          Root layout · Playfair Display + Inter · Nav · footer
    globals.css         Tailwind v4 @theme tokens + glow/chip/modal/kbd styles
  components/
    Nav.tsx             Top nav (active states, mobile menu, mock badge)
    RadarHero3D.tsx     PHASE-2 SLOT — 3D radar mounts here; dashboard renders it
    ui.tsx              Shared primitives: chips, badges, meters, toasts…
  lib/
    types.ts            v1 contract types (frozen)
    api.ts              Contract client w/ mock fallback policy
    mock.ts             Bundled demo dataset (anchored to “today”)
    format.ts           Countdowns, ISO weeks, currency
```

## Design language

Dark `#04070f` background, neon-cyan `#00e5ff` glow accents, Playfair Display
serif headings + Inter body, generous spacing — the same brand family as
`~/workspace/portfolio-sujanthan`. Tool screens trade some airiness for
density where the review queue needs it.

## Notes

- `src/components/RadarHero3D.tsx` is a clearly-marked placeholder. Phase 2
  (React Three Fiber) replaces only that file; the dashboard already renders
  `<RadarHero3D />` unconditionally.
- Keys entered in Settings are never persisted or sent anywhere in mock mode
  (production keeps them server-side).
- Fonts load via `next/font/google` at build time (needs network once).
