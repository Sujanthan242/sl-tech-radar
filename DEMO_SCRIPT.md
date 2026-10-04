# SL Tech Radar — 60-Second LinkedIn Demo Script

**Format:** screen recording, 1080p, 16:9 · **Assemble in:** CapCut / DaVinci
**Bookends:** `assets/videos/intro-stinger.mp4` (5 s) → app demo (~50 s) → `assets/videos/outro-bumper.mp4` (5 s)
**Setup:** frontend in mock mode (`NEXT_PUBLIC_MOCK=true`), browser zoom 100%, hide bookmarks bar, close extra tabs. Do one dry run first.

## Shot list

### 0:00–0:05 — INTRO STINGER
- **Viewer sees:** `intro-stinger.mp4` — glowing cyan radar emblem, fade from black.
- **Voiceover:** *"SL Tech Radar. Never miss a deadline that matters."*

### 0:05–0:12 — THE PROBLEM (dashboard `/`)
- **Click:** open `http://localhost:3000`, stay on the dashboard.
- **Viewer sees:** "Run the Saturday pipeline" button, provider chain (Nebius → Groq → Gemini → Ollama → template), this week's numbers.
- **Voiceover:** *"Every Saturday I research hackathons, internships, courses, and scholarships for SL tech students. That used to eat my whole morning. So I automated the research — but kept the judgment."*

### 0:12–0:20 — RUN THE PIPELINE
- **Click:** "Run discovery" / "Run Saturday pipeline" button.
- **Viewer sees:** progress bar climbing through queued → running → drafting → in_review; stats ticking up (candidates found, net-new).
- **Voiceover:** *"One click. It searches live, grades every deadline, and dedups against everything we've ever covered."*

### 0:20–0:30 — DISCOVER (`/discover`)
- **Click:** navigate to Discover; switch tabs: Hackathons → Internships.
- **Viewer sees:** candidate cards with dedup badges (NEW / SEEN / VERIFY) and deadline chips.
- **Voiceover:** *"New finds get drafted. Already-covered ones are skipped automatically. Uncertain dates get flagged for a human — never silently published."*

### 0:30–0:45 — REVIEW QUEUE (`/review`)
- **Click:** open Review; press `a` to approve one section, `r` to reject one (pick "duplicate"), `e` to edit a line.
- **Viewer sees:** sections flipping to approved / rejected; keyboard hints; the rejection feeding the ledger note.
- **Voiceover:** *"The 15-minute review. Approve, edit, reject — all keyboard-driven. Every rejection teaches the system what to skip next week."*

### 0:45–0:53 — EXPORT + PROVIDERS (`/editions` or settings)
- **Click:** Export → show the markdown; then glance at `/settings` provider chain.
- **Viewer sees:** `# SL Tech Students Weekly — 2026-W40` markdown, "Cut this week" section; provider chain with template as the last-resort fallback.
- **Voiceover:** *"Export is one click — markdown straight into Substack. And here's the part I'm proud of…"*

### 0:53–0:55 — THE MONEY SHOT
- **Click:** nothing — hover over the cost/runway stat (`$0.002/week`, `100+ years`).
- **Viewer sees:** the runway number.
- **Voiceover:** *"…fifty dollars of credits runs this for a hundred-plus years. And when the credits are gone, it still works."*

### 0:55–1:00 — OUTRO BUMPER
- **Viewer sees:** `outro-bumper.mp4` — radar emblem fading to black. Burn an end-card in your editor: **"SL Tech Radar — github.com/Sujanthan242/sl-tech-radar"**.
- **Voiceover:** *"Built with my own stack — Java, Spring Boot, React. Link in the comments."*

## Recording tips
- Record the app demo in one take at 0:05–0:55; add the stingers in post (they're silent — lay your voiceover + any music over them in the editor).
- Move the mouse deliberately; pause half a second on each key stat so viewers can read it.
- If the pipeline finishes too fast on screen, that's fine — speed reads as "fast", not "fake".
- Captions on. Most LinkedIn views are muted.
