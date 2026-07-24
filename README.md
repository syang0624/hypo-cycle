# HypoCycle

An autonomous experimentation platform that gives AI agents a scientific
method. HypoCycle turns an objective into falsifiable hypotheses, runs
controlled variants against a baseline, and adopts only what the evidence
supports — cycle after cycle. See `PRD.md` for the full product vision and
`CLAUDE.md` for the working architecture contract.

The repo currently ships **two surfaces**:

1. **The live app** — the HookLoop-era ad-experimentation loop being migrated
   to the HypoCycle domain model. Convex backend, three agents (hypothesis /
   treatment / evaluation), seeded campaign simulator, Thompson-sampling
   budget allocation, and a real-time dashboard. Start at `/programs/new`.
2. **The self-contained demo** — a frontend-only walkthrough of a fixed
   Coca-Cola three-week campaign with bundled reels; no backend or API keys
   required. Start at `/demo` (data in `lib/demoReels.ts`, videos in
   `public/reels/`).

Campaign metrics in both surfaces are **simulated** and labeled as such —
never live ad-platform results.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

- **Explore the demo** needs nothing else — it is fully static.
- **Start an experiment program** (the live loop) needs the Convex backend
  running (`npx convex dev`) and an `OPENAI_API_KEY` in `.env.local`.

## Verify

```bash
npm run build
```

`scripts/check-demo-only.mjs` asserts a demo-only repo layout; it applies to
demo-only builds, not to this merged main branch.

## Working docs

- `CLAUDE.md` — architecture, rules of engagement, file ownership
- `STEVEN.md` / `NORI.md` — per-owner migration work plans
- `PRD.md` — HypoCycle product requirements
- `PROGRESS-REPORT.md`, `SUBMISSION.md` — demo narrative and hackathon
  submission materials
