# Weekly Loop Redesign — Sequential, Feedback-Driven Demo

**Date:** 2026-06-28
**Status:** Approved (design)
**Author:** Nori (with Claude)

## Problem

The current demo shows everything at once — hypotheses, reels, CPC, and analysis
appear simultaneously, and the Coca-Cola sample short-circuits to a pre-seeded
batch with a flat set of 9 cached reels (`reel_1..9.mp4`) that never change. This
does not "look real" and, critically, does not demonstrate the product's thesis:
a **self-improving loop** where each week's creative is generated from the prior
week's performance feedback, and CPC visibly drops week over week.

Specific complaints being addressed:

1. Week 1/2/3 appear immediately — no sense of a campaign running over time.
2. Reels for later weeks are recycled, not newly generated from learnings.
3. CPC is shown **before** the reel's video exists — wrong order.
4. No per-week report explaining what worked and which hypothesis was wrong.
5. Preloaded CAC goal `4.5` reads as invalid; should be a natural number.
6. (Nice-to-have) clicking a reel should open it with audio.

## Goals

- One **real loop for every product**. Coca-Cola is not special-cased except for
  *where the video bytes come from*.
- Strict, server-enforced phase order per week:
  `Hypotheses → Reels generating → Reels ready → Simulation (day-by-day) → Analysis → Weekly Report`.
- Reels genuinely **evolve week to week**, driven by the prior week's Analyst
  feedback (`nextBatchBrief`) and the new hypotheses.
- Presenter-driven advancement: each week runs itself, then stops at a
  **"Run Next Week"** button. Fixed at **3 weeks**.
- CPC visibly **decreases** across weeks (via a documented per-week prior).
- A **Weekly Report** each week: winners, which hypothesis was confirmed/refuted,
  CPC/CAC delta vs last week, and the directive for next week.
- **Clean UI** throughout.
- Killed reels stay **visible but clearly marked** as killed (dimmed + "CUT"
  badge), never hidden.
- Click-to-play **video popup with audio**.
- CAC goal a natural number.

## Non-Goals

- Live Meta/TikTok integration (still Mode A only).
- Auth, billing, multi-tenancy.
- More than 3 agents.

## Architecture

### One loop, two video sources

Remove the Coca-Cola short-circuit in `ProductInputForm.handleSubmit`
(`if (form.name === SAMPLE_PRODUCT_NAME && CACHED_BATCH_ID) → /dashboard/CACHED`).
Every product — including Coca-Cola — runs `products.create` →
`experiments.startBatch` → the live agent+simulator loop.

The **only** product-specific branch is in `video.generateVariantVideo`:

- **Coca-Cola sample** (detected by a `usesCachedReels` flag on the product, or by
  name match against `SAMPLE_PRODUCT_NAME`): skip Sora; resolve a cached file
  `/reels/week{w}_slot{n}.mp4`; patch `videoStatus: "ready"`, `videoUrl` instantly.
- **Any other product:** live Sora exactly as today.

`week` = the product's 1-based batch ordinal (1st batch = week 1). `slot` = the
variant's index within its batch (0..2). Both are passed from `runGenerator` when
it schedules the video jobs (it already loops variant ids in order; week is
derivable from how many prior runs the product has).

### Strict phase gating (server-side)

Today `runGenerator` schedules `simulator.runCampaign` immediately, regardless of
video status — this is why CPC can appear before the reel.

New behavior: after `runGenerator` inserts variants and fires the video jobs, it
does **not** start the campaign directly. Instead it schedules a small,
self-rescheduling gate action `simulator.awaitReelsThenRun(batchId)` that:

1. Reads the batch's variants.
2. If every variant has `videoStatus ∈ {ready, failed}` → schedule
   `simulator.runCampaign`.
3. Otherwise → reschedule itself after ~1.5s (bounded by a max-attempts ceiling;
   on ceiling, proceed anyway so a stuck Sora job never deadlocks the demo).

For Coca-Cola, videos are `ready` on first check → near-instant. For live Sora,
the simulation genuinely waits → CPC can never precede the reel.

`experiments.getStatus` gains a `generating_video` phase between `generating` and
`simulating`: variants exist, but not all videos are `ready`/`failed` and no
metrics yet.

### Three reels per week

Generator produces **3** variants per batch (down from 8) — cleaner UI, matches
the cached Coca-Cola set, cheaper Sora for real products. Update the Generator
prompt/schema expectation and any "8 variants" copy.

### Multi-week, presenter-driven

`startNextBatch(productId, priorBatchId)` already exists and already chains the
prior Analyst's `nextBatchBrief` into the next Strategist and into the video
prompts. Reframe the UI around it:

- A new query `experiments.weeksByProduct(productId)` returns, ordered by
  `startedAt`, each batch's `{ week, batchId, status, avgCpc, avgCac }` summary.
- The run view renders the **current week's** pipeline plus a **cross-week CPC
  trend** rail (built from `weeksByProduct`) that visibly drops.
- When the current week is `complete`, show **"Run Next Week ▸"**. Clicking calls
  `startNextBatch` and routes to the new batch. Stop after week 3 (show a final
  "Campaign complete" summary instead of the button).

### CPC-decrease guarantee (documented prior)

The simulator seeds per-batch, so improvement is not currently monotonic. Add a
**per-week improvement prior**: the simulator scales its baseline CPC/CAC down by
a week factor (e.g. week *w* multiplies baseline CPC by `IMPROVEMENT^(w-1)` with
`IMPROVEMENT ≈ 0.8`), justified as "each generation inherits the winning DNA, so
the floor of performance improves." Per-variant variance is preserved on top, so
individual reels still differ and some still get killed. This is an explicit,
documented demo prior — consistent with CLAUDE.md's "documented priors + LLM
commentary," not random noise.

The week factor is derived from the product's batch ordinal (same source as the
video `week`).

### Per-week hypothesis display

Each week opens by displaying **that week's hypothesis** prominently, report-style
("Week N — Hypothesis"), sourced from the batch's `hypotheses`. The same
hypothesis is **recapped in the Weekly Report** next to its verdict, so each week
reads as a self-contained experiment: here's what we believed → here's what
happened → here's the verdict. This makes the hypothesis visible every week, not
just buried in the Strategist panel.

### Weekly Report

Extend `analystSchema` + `buildAnalystPrompt` with a `hypothesisVerdict` array:
`{ hypothesis, verdict: "confirmed" | "refuted" | "partial", why }`. Combined with
the existing `winners`, `losers`, `perDimensionAttribution`, and `nextBatchBrief`,
render a **Weekly Report** card after the Analyst completes:

- Headline metric deltas (CPC/CAC vs prior week, green when down).
- "What won" / "What was cut."
- "Which hypothesis was wrong" (from `hypothesisVerdict`).
- "Next week's directive" (from `nextBatchBrief`).

### Killed reels — visible, clearly marked

Reels with a `kill` allocation status are **not removed**. They render dimmed
(reduced opacity / desaturated), with a clear **"CUT"** badge and a muted-red
accent, and remain clickable (the popup still works). This mirrors the existing
`status === "killed"` styling in the components but is applied to the live video
tiles, keyed off the bandit allocation status for that variant.

### Video popup with audio

Reel tiles stay muted-autoplay-loop. Clicking a tile opens a modal:
larger video, **unmuted, native controls**, plays with sound. Closes on backdrop
click / Esc. Frontend-only component; killed reels are still openable (badged as
cut inside the modal too).

### CAC natural number

`MOCK_PRODUCT.targetCAC: 4.50 → 5`. Verify the form's CAC input `step`/parsing so
a whole number doesn't read as invalid.

## Components / files touched

**Nori's zone**
- `convex/agents.ts` — Generator → schedule gate instead of campaign; 3 variants;
  pass week/slot to video jobs; extend Analyst handling for `hypothesisVerdict`.
- `convex/video.ts` — `generateVariantVideo` cached-vs-Sora branch (week/slot args).
- `convex/simulator.ts` — `awaitReelsThenRun` gate action; per-week improvement
  prior in day simulation.
- `convex/experiments.ts` — `weeksByProduct` query; `generating_video` phase in
  `getStatus`.
- `lib/agents/schemas.ts`, `lib/agents/prompts.ts` — `hypothesisVerdict`; 3-variant
  expectation.
- `lib/video/prompt.ts` — (already feedback-aware; verify week framing).

**Steven's zone (crossing per user direction)**
- `app/dashboard/[batchId]/page.tsx` — phase-gated reveal; cross-week CPC rail;
  Weekly Report card; "Run Next Week" / final-summary logic; killed-reel styling;
  remove cached-path special case (cache now resolved server-side).
- `components/` — `WeeklyReport.tsx` (new), `ReelModal.tsx` (new, video popup);
  reel tile killed-state styling; clean-up pass.
- `components/ProductInputForm.tsx` — remove Coca-Cola short-circuit; CAC input.
- `lib/mockData.ts` — `targetCAC: 5`.
- `lib/types.ts` — `hypothesisVerdict` type; optional `usesCachedReels` on product
  if used as the cache signal.

## Cached-reel generation (prerequisite)

Generate the 9 evolving Coca-Cola reels once via the real prompt chain (feedback
flowing week→week) and save to `public/reels/week{w}_slot{n}.mp4`.

**Blocked on:** a working `OPENAI_API_KEY` with Sora access + credits. The key is
currently empty in `.env.local`; Sora runs in Convex actions reading the
deployment env. Generation must run either through a Convex action (key in the
deployment) or a standalone script (key in `.env.local`). Confirm key availability
before this step; until then the cache lookup falls back to the `ReelPreview`
poster for any missing file, so the rest of the demo still works.

## Risks

- **No key → no cached reels.** Mitigated by poster fallback; the loop, gating,
  reports, and popup all work without the MP4s.
- **Live Sora latency** for non-Coca-Cola products can make the gated simulation
  wait visibly long. Mitigated by the gate's max-attempts ceiling (proceed anyway).
- **Per-week prior** is a deliberate nudge; if challenged, it is documented and
  layered under real per-variant variance, not a fabricated straight line.

## Testing

- Loop ordering: assert the gate does not start the campaign until all videos are
  `ready`/`failed`.
- `weeksByProduct` ordering and per-week CPC monotonic-down with the prior applied.
- Analyst schema round-trips `hypothesisVerdict`.
- Manual: run Coca-Cola end to end through 3 weeks; confirm ordered reveal, CPC
  drop, killed reels visible+badged, popup audio.
