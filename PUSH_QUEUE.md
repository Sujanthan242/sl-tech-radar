# PUSH QUEUE — SL Tech Radar v2

Local commits not yet on GitHub. This machine has no push credentials, so FRIDAY
pushes these via browser in batches (oldest → newest).

## Already on GitHub (do NOT re-push)
These local commits have browser-committed equivalents on GitHub main (same file
content, different SHAs) — pushing them again would duplicate:
- local `cc2cca3` ≈ GitHub `92c2edf` (WebCorsConfig.java) + `6427c83` (render.yaml)
- local `efa9daa` ≈ GitHub `b529613` (frontend/next.config.ts) + `0545762` (.github/workflows/pages.yml)

## Queue — push in this order
| # | Local SHA | Message | Files changed |
|---|-----------|---------|---------------|
| 1 | `55fd817` | v2: add /api/health liveness probe + Render healthCheckPath | `backend/src/main/java/lk/sltech/radar/web/HealthController.java` (new), `render.yaml` (added `healthCheckPath: /api/health`) |
| 2 | `70b03c7` | v2: add PUSH_QUEUE.md (push coordination log) | `PUSH_QUEUE.md` (new) |
| 3 | `1c9a450` | v2: responsive fixes across 5 screens | `frontend/`: min-w-0/break-words/overflow-wrap fixes, capped query widths, 36px tap targets, wrapped headers/footers, mobile nav |
| 4 | `de11082` | v2: dark/light mode with CSS-variable theming | `frontend/src/app/globals.css` (`@custom-variant dark`, light tokens at `:root`, dark neon under `.dark`), `src/lib/prefs.tsx` (new: ThemeProvider/useTheme, `slr-theme`), `layout.tsx` (pre-paint script), `Nav.tsx` (sun/moon toggle) |
| 5 | `d6133ba` | v2: trilingual UI chrome (EN / தமிழ் / සිංහල) | `frontend/src/lib/i18n.tsx` (new: ~115-key dictionary, LanguageProvider, `slr-lang`), `Nav.tsx` (EN/த/சி toggle), all 5 screens' chrome wired; content data stays English |
| 6 | `cd1141d` | v2: WhatsApp share on editions | `frontend/`: per-edition share button → `wa.me/?text=` with week + top items + deadlines + site URL |
| 7 | `7e4755c` | v2: deadline countdowns — urgent threshold 7d to 3d | `frontend/src/lib/format.ts` (`isUrgent` 7d→3d), `DeadlineChip` under every shipped item on editions page |
| 8 | `c43b589` | v2: lite mode for low-data mobile users | `frontend/`: `body.lite` gates animations/glows, static gradient hero instead of R3F canvas, header toggle (`slr-lite`) |

_Note: commit 1's render.yaml diff applies cleanly onto GitHub's `6427c83` version
(identical surrounding context); HealthController.java is a brand-new file._
