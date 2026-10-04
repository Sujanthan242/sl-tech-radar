I used to spend my whole Saturday researching hackathons, internships, courses and scholarships for SL tech students.

So I built the thing that does the research for me — SL Tech Radar. One click: it searches live, grades every deadline, skips anything we've already covered, and drafts the week's newsletter. I just review for 15 minutes — approve, edit, reject — and export straight to Substack.

The part I'm most proud of isn't the AI. It's the architecture:

→ Provider fallback chain: Nebius → Groq → Gemini → local Ollama → template mode. If every paid API dies, it still ships an edition.
→ Weekly caching + a seen-events ledger, so it never re-pays for the same research twice.
→ The cost math: ~$0.002 per Saturday run on Llama 3.3 70B. My $50 in credits = 100+ years of newsletters. And when the credits run out? It keeps working — that was the whole design goal. Lifetime-workable, not demo-workable.

Built with my own stack: Java + Spring Boot backend, React + TypeScript frontend, PostgreSQL, Docker. Full repo here: github.com/Sujanthan242/sl-tech-radar

If you're a student drowning in "deadline yesterday" panic — this is for you. Never miss a deadline that matters. 🛰️

What's the most painful manual research task in YOUR week? Thinking of open-sourcing the pipeline as a template next.

#BuildInPublic #SpringBoot #React #AI #SriLankaTech
