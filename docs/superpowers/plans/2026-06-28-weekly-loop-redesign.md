# Weekly Loop Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the HookLoop demo into a sequential, feedback-driven weekly loop where reels evolve each week, CPC visibly drops, every phase reveals in strict order (reel before CPC), and each week ends with a hypothesis-vs-verdict report.

**Architecture:** One real Convex agent+simulator loop drives every product. The only product-specific branch is video bytes — Coca-Cola (sample) gets cached files keyed by `(week, slot)`, every other product gets live Sora. A reel-ready gate holds the simulator until videos resolve, so CPC never precedes the reel. A documented per-week performance prior guarantees CPC trends down across the 3 presenter-advanced weeks.

**Tech Stack:** Next.js 14 (App Router), TypeScript strict, Tailwind, Convex (DB + actions + scheduler), OpenAI structured outputs, Sora 2 video.

## Global Constraints

- TypeScript strict; no `any` without a `// FIXME`. (CLAUDE.md)
- No barrel/index re-export files; direct imports only. (CLAUDE.md)
- CAC is primary, CPC secondary; kill/scale gated on a CVR floor. (CLAUDE.md)
- Three agents only: Strategist, Generator, Analyst. (CLAUDE.md)
- Mode A only — heuristic simulator, no live ad APIs. (CLAUDE.md)
- No test runner exists in this repo. Verification gates are: `npx tsc --noEmit` (types), `npx convex dev --once` (Convex validator/push), `npm run lint`, and explicit manual browser checks. Do NOT add a test framework.
- Reels per week: **3** (down from 8).
- Weeks per campaign: **3**, presenter-advanced.
- Coca-Cola is detected by `product.name === SAMPLE_PRODUCT_NAME` ("Coca-Cola").
- Cached reel path format: `/reels/week{week}_slot{slot}.mp4` (week 1-based, slot 0-based).
- Per-week performance prior: `PERF_MULT = 1.25 ** (week - 1)` applied to effective CTR & CVR (lowers CPC and CAC monotonically).

---

### Task 1: Shared sample-product constant + cache-path helper

Foundation used by both Convex (`convex/video.ts`, `convex/agents.ts`) and frontend (`ProductInputForm`). Centralizes the "is this the cached demo product?" decision and the cache path format so the two sides never drift.

**Files:**
- Create: `lib/sampleProduct.ts`
- Modify: `lib/mockData.ts:11` (re-export the constant from the new module instead of redefining)

**Interfaces:**
- Produces: `SAMPLE_PRODUCT_NAME: "Coca-Cola"`, `usesCachedReels(name: string): boolean`, `cachedReelPath(week: number, slot: number): string`

- [ ] **Step 1: Create the shared module**

```ts
// lib/sampleProduct.ts
/**
 * Single source of truth for the cached-demo product. Imported by both the
 * Convex backend (to branch video generation) and the frontend (to prefill /
 * route). Keeping it framework-free means Convex's bundler pulls in nothing
 * heavy.
 */
export const SAMPLE_PRODUCT_NAME = "Coca-Cola";

/** True when this product should serve pre-generated cached reels (not Sora). */
export function usesCachedReels(name: string): boolean {
  return name.trim().toLowerCase() === SAMPLE_PRODUCT_NAME.toLowerCase();
}

/** Cache file path for a given week (1-based) and slot (0-based). */
export function cachedReelPath(week: number, slot: number): string {
  return `/reels/week${week}_slot${slot}.mp4`;
}
```

- [ ] **Step 2: Re-point `lib/mockData.ts` at the shared constant**

In `lib/mockData.ts`, replace the line:

```ts
export const SAMPLE_PRODUCT_NAME = "Coca-Cola";
```

with:

```ts
export { SAMPLE_PRODUCT_NAME } from "./sampleProduct";
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (no errors). Confirms the re-export resolves and no other file broke.

- [ ] **Step 4: Commit**

```bash
git add lib/sampleProduct.ts lib/mockData.ts
git commit -m "feat: shared sample-product constant + cached-reel path helper"
```

---

### Task 2: CAC natural number + remove Coca-Cola short-circuit

Coca-Cola must run the real loop like every product (no jump to a pre-seeded cached batch). And the preloaded target CAC must be a whole number.

**Files:**
- Modify: `lib/mockData.ts` (`MOCK_PRODUCT.targetCAC`)
- Modify: `components/ProductInputForm.tsx` (remove short-circuit, drop `CACHED_BATCH_ID` import)

**Interfaces:**
- Consumes: `SAMPLE_PRODUCT_NAME` (still imported, but no longer used to short-circuit — removed entirely from the submit path).

- [ ] **Step 1: Set target CAC to a whole number**

In `lib/mockData.ts`, in `MOCK_PRODUCT`, change:

```ts
  targetCAC: 4.50,
```

to:

```ts
  targetCAC: 5,
```

- [ ] **Step 2: Remove the short-circuit in the form submit**

In `components/ProductInputForm.tsx`, change the import line:

```ts
import { MOCK_PRODUCT, SAMPLE_PRODUCT_NAME, CACHED_BATCH_ID } from "@/lib/mockData";
```

to:

```ts
import { MOCK_PRODUCT } from "@/lib/mockData";
```

Then in `handleSubmit`, delete this block entirely:

```ts
      // Use cached batch for sample Coca-Cola data (reels already generated)
      if (form.name === SAMPLE_PRODUCT_NAME && CACHED_BATCH_ID) {
        router.push(`/dashboard/${CACHED_BATCH_ID}`);
        return;
      }
```

so the `try` body becomes just:

```ts
    try {
      const { productId } = await createProduct(form);
      const batchId = await startBatch({ productId });
      router.push(`/launch/${batchId}`);
    } finally {
      setSubmitting(false);
    }
```

- [ ] **Step 3: Verify the CAC field accepts whole numbers cleanly**

Open `components/ProductInputForm.tsx` and locate the Target CAC `<input>`. Confirm it is `type="number"` and has **no** `step` attribute that would force decimals (a `step="0.01"` is fine for whole numbers; a `min` higher than 5 would not be). No code change unless a `step`/`min` makes `5` invalid — if so, set `step="1"` `min="1"` on that input.

- [ ] **Step 4: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS. (`SAMPLE_PRODUCT_NAME`/`CACHED_BATCH_ID` no longer referenced → no unused-import lint error.)

- [ ] **Step 5: Commit**

```bash
git add lib/mockData.ts components/ProductInputForm.tsx
git commit -m "feat: target CAC=5; Coca-Cola runs the real loop (no cached-batch jump)"
```

---

### Task 3: Generator + Strategist emit 3 reels per week

Tighten the agents from 8 variants to 3 (cleaner UI, matches cached set, cheaper Sora).

**Files:**
- Modify: `lib/agents/schemas.ts` (generator + strategist descriptions)
- Modify: `lib/agents/prompts.ts` (`GENERATOR_SYSTEM`, `buildGeneratorPrompt`, strategist hypotheses count)

- [ ] **Step 1: Update schema descriptions**

In `lib/agents/schemas.ts`:

Strategist `hypotheses` description — change:

```ts
        description: "4-8 testable creative hypotheses, each tied to one DNA dimension.",
```

to:

```ts
        description: "Exactly 3 testable creative hypotheses, each tied to one DNA dimension.",
```

Generator `variants` description — change:

```ts
        description: "Exactly 8 ad variants spanning the hypotheses.",
```

to:

```ts
        description: "Exactly 3 ad variants spanning the hypotheses (one per hypothesis).",
```

Also update the comment above `generatorSchema`:

```ts
// Generator — emits exactly 8 variants matching the ad_variants DNA columns.
```

to:

```ts
// Generator — emits exactly 3 variants matching the ad_variants DNA columns.
```

- [ ] **Step 2: Update the Generator prompt text**

In `lib/agents/prompts.ts`, in `GENERATOR_SYSTEM`, change:

```ts
Your job: turn the Strategist's hypotheses into exactly 8 short-form ad variants, each tagged with full creative DNA so the simulator can score it and the Analyst can attribute results.

Hard rules:
- Emit EXACTLY 8 variants. Spread them across the hypotheses so each hypothesis is tested by at least one variant; vary the DNA dimension under test while holding others reasonable.
```

to:

```ts
Your job: turn the Strategist's hypotheses into exactly 3 short-form ad variants, each tagged with full creative DNA so the simulator can score it and the Analyst can attribute results.

Hard rules:
- Emit EXACTLY 3 variants — one per hypothesis. Vary the DNA dimension under test while holding others reasonable.
```

In `buildGeneratorPrompt`, change the final line:

```ts
Generate exactly 8 variants. Each must reference one of the hypotheses above and carry a per-variant budget around $${input.perVariantBudget}.`,
```

to:

```ts
Generate exactly 3 variants — one per hypothesis above — each carrying a per-variant budget around $${input.perVariantBudget}.`,
```

- [ ] **Step 3: Push to Convex to validate the schema still compiles**

Run: `npx convex dev --once`
Expected: Functions push successfully with no schema/validator errors.

- [ ] **Step 4: Commit**

```bash
git add lib/agents/schemas.ts lib/agents/prompts.ts
git commit -m "feat: agents emit 3 reels per week instead of 8"
```

---

### Task 4: Per-week derivation + cached-vs-Sora video branch

The video step must serve a cached file for Coca-Cola and call Sora otherwise, keyed by week + slot.

**Files:**
- Modify: `convex/experiments.ts` (add `weeksByProduct` query — used here for week derivation and later by the UI)
- Modify: `convex/video.ts` (`generateVariantVideo` gains `week`, `slot`, `useCached` args + cache branch)
- Modify: `convex/agents.ts` (`runGenerator` computes week, passes week/slot/useCached)

**Interfaces:**
- Produces: `experiments.weeksByProduct(productId) → Array<{ batchId: string; week: number; status: "running" | "complete" | "failed"; startedAt: number; avgCpc: number; avgCac: number }>` ordered ascending by `startedAt`.
- Produces: `video.generateVariantVideo(variantId, feedback?, week, slot, useCached)`.

- [ ] **Step 1: Add `weeksByProduct` query**

In `convex/experiments.ts`, add after `getStatus`:

```ts
/**
 * All of a product's batches in chronological order, each tagged with its
 * 1-based week index and a summary of its campaign metrics. Used to derive the
 * video week, drive the cross-week CPC rail, and compute week-over-week deltas.
 */
export const weeksByProduct = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const runs = await ctx.db
      .query("experiment_runs")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .collect();
    runs.sort((a, b) => a.startedAt - b.startedAt);

    const out: Array<{
      batchId: string;
      week: number;
      status: "running" | "complete" | "failed";
      startedAt: number;
      avgCpc: number;
      avgCac: number;
    }> = [];

    for (let i = 0; i < runs.length; i++) {
      const run = runs[i];
      const metrics = await ctx.db
        .query("campaign_metrics")
        .withIndex("by_batch", (q) => q.eq("batchId", run.batchId))
        .collect();
      const active = metrics.filter((m) => m.impressions > 0);
      const spend = active.reduce((s, m) => s + m.spend, 0);
      const clicks = active.reduce((s, m) => s + m.clicks, 0);
      const conversions = active.reduce((s, m) => s + m.conversions, 0);
      out.push({
        batchId: run.batchId,
        week: i + 1,
        status: run.status,
        startedAt: run.startedAt,
        avgCpc: clicks > 0 ? Math.round((spend / clicks) * 100) / 100 : 0,
        avgCac: conversions > 0 ? Math.round((spend / conversions) * 100) / 100 : 0,
      });
    }
    return out;
  },
});
```

Note: `experiment_runs` status is typed `"running" | "complete"` in the schema but `markFailed` patches `"failed"`; the union above includes `"failed"` to match runtime. If `tsc` complains the schema type lacks `"failed"`, widen the return cast: `status: run.status as "running" | "complete" | "failed"`.

- [ ] **Step 2: Add the cache branch to the video action**

In `convex/video.ts`, add the import at the top:

```ts
import { cachedReelPath } from "../lib/sampleProduct";
```

Replace the `generateVariantVideo` args + early body. Change the signature:

```ts
export const generateVariantVideo = internalAction({
  args: { variantId: v.id("ad_variants"), feedback: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!VIDEO_ENABLED) return;
    const variant = await ctx.runQuery(internal.video.getVariant, { variantId: args.variantId });
    if (!variant) return;
    try {
```

to:

```ts
export const generateVariantVideo = internalAction({
  args: {
    variantId: v.id("ad_variants"),
    feedback: v.optional(v.string()),
    week: v.number(),
    slot: v.number(),
    useCached: v.boolean(),
  },
  handler: async (ctx, args) => {
    if (!VIDEO_ENABLED) return;
    const variant = await ctx.runQuery(internal.video.getVariant, { variantId: args.variantId });
    if (!variant) return;

    // Cached-demo product (Coca-Cola): serve the pre-generated, week-evolving
    // reel file instead of calling Sora. Marked ready immediately so the
    // reel-ready gate releases the simulator without waiting on the network.
    if (args.useCached) {
      await ctx.runMutation(internal.video.patchVariantVideo, {
        variantId: args.variantId,
        videoStatus: "ready",
        videoUrl: cachedReelPath(args.week, args.slot),
      });
      return;
    }

    try {
```

(The rest of the `try` block — Sora start, pending patch, poll schedule, catch — is unchanged.)

- [ ] **Step 3: Compute and pass week/slot/useCached from the Generator**

In `convex/agents.ts`, add the import:

```ts
import { usesCachedReels } from "../lib/sampleProduct";
```

In `runGenerator`, replace the video-scheduling loop:

```ts
    // Fire one video reel per variant — async, parallel, NON-BLOCKING: the loop
    // proceeds to the simulator immediately regardless of video status. The
    // prior batch's feedback steers the reels so they improve each loop.
    for (const variantId of variantIds) {
      await ctx.scheduler.runAfter(0, internal.video.generateVariantVideo, {
        variantId,
        feedback: args.videoFeedback,
      });
    }

    // Variants exist — kick off the simulated campaign.
    await ctx.scheduler.runAfter(0, internal.simulator.runCampaign, { batchId: args.batchId });
    return result;
```

with:

```ts
    // Derive this batch's 1-based week (its ordinal among the product's runs).
    const weeks = await ctx.runQuery(api.experiments.weeksByProduct, {
      productId: args.productId,
    });
    const week = weeks.find((w) => w.batchId === args.batchId)?.week ?? 1;
    const useCached = usesCachedReels(product.name);

    // Fire one video reel per variant — async + parallel. Cached (Coca-Cola)
    // resolve instantly; live Sora resolves when each job completes. The reel-
    // ready gate (Task 5) holds the simulator until all are ready/failed, so
    // CPC never appears before the reel.
    for (let slot = 0; slot < variantIds.length; slot++) {
      await ctx.scheduler.runAfter(0, internal.video.generateVariantVideo, {
        variantId: variantIds[slot],
        feedback: args.videoFeedback,
        week,
        slot,
        useCached,
      });
    }

    // Gate the simulator on reels being ready (Task 5), not fire-and-forget.
    await ctx.scheduler.runAfter(0, internal.simulator.awaitReelsThenRun, {
      batchId: args.batchId,
      attempt: 1,
    });
    return result;
```

- [ ] **Step 4: Push to Convex**

Run: `npx convex dev --once`
Expected: push fails ONLY on `internal.simulator.awaitReelsThenRun` not existing yet (created in Task 5). The `weeksByProduct`/`video.ts` changes must type-check. If you want a clean push now, temporarily keep the old `runCampaign` schedule line and switch it in Task 5 — but prefer doing Task 5 immediately after.

- [ ] **Step 5: Commit**

```bash
git add convex/experiments.ts convex/video.ts convex/agents.ts
git commit -m "feat: cached-vs-Sora video branch keyed by week/slot; weeksByProduct query"
```

---

### Task 5: Reel-ready gate (strict ordering) + `generating_video` phase

Hold the simulator until every reel is `ready`/`failed`, so CPC can never precede the video. Add a status phase for the UI.

**Files:**
- Modify: `convex/simulator.ts` (new `awaitReelsThenRun` action)
- Modify: `convex/experiments.ts` (`getStatus` → add `generating_video` phase)

**Interfaces:**
- Consumes: `variants.listByBatch` (each variant's `videoStatus`).
- Produces: `simulator.awaitReelsThenRun(batchId, attempt)`; `getStatus.phase` may now be `"generating_video"`.

- [ ] **Step 1: Add the gate action**

In `convex/simulator.ts`, add constants near the other config:

```ts
const REEL_GATE_INTERVAL_MS = 1500;
const REEL_GATE_MAX_ATTEMPTS = 200; // ~5 min ceiling, then proceed anyway
```

Add the action (place it just above `runCampaign`):

```ts
/**
 * Reel-ready gate. Holds the campaign until every variant's video is resolved
 * (ready or failed), enforcing the demo's order: reel first, CPC second. Cached
 * (Coca-Cola) reels are ready on the first check; live Sora reels release the
 * gate as they complete. A max-attempts ceiling guarantees a stuck Sora job
 * never deadlocks the demo — we proceed regardless once it's hit.
 */
export const awaitReelsThenRun = internalAction({
  args: { batchId: v.string(), attempt: v.number() },
  handler: async (ctx, args) => {
    const variants = await ctx.runQuery(api.variants.listByBatch, { batchId: args.batchId });
    const allResolved =
      variants.length > 0 &&
      variants.every((vr) => vr.videoStatus === "ready" || vr.videoStatus === "failed");

    if (allResolved || args.attempt >= REEL_GATE_MAX_ATTEMPTS) {
      await ctx.scheduler.runAfter(0, internal.simulator.streamDay, {
        batchId: args.batchId,
        day: 1,
      });
      return;
    }
    await ctx.scheduler.runAfter(REEL_GATE_INTERVAL_MS, internal.simulator.awaitReelsThenRun, {
      batchId: args.batchId,
      attempt: args.attempt + 1,
    });
  },
});
```

Note: `runCampaign` already just schedules `streamDay` day 1, so the gate calls `streamDay` directly. Leave `runCampaign` in place (harmless; no longer scheduled by the Generator).

- [ ] **Step 2: Add the `generating_video` phase to `getStatus`**

In `convex/experiments.ts`, update the `Phase` type:

```ts
type Phase = "strategizing" | "generating" | "simulating" | "analyzing" | "complete" | "failed";
```

to:

```ts
type Phase = "strategizing" | "generating" | "generating_video" | "simulating" | "analyzing" | "complete" | "failed";
```

In the phase-derivation chain inside `getStatus`, insert a `generating_video` branch. Change:

```ts
    } else if (metrics.length > 0) {
      phase = "simulating";
      progress = 0.3 + 0.5 * (daysInserted / TOTAL_DAYS);
    } else if (variants.length > 0) {
      phase = "generating";
      progress = 0.3;
    } else if (hypotheses.length > 0) {
```

to:

```ts
    } else if (metrics.length > 0) {
      phase = "simulating";
      progress = 0.3 + 0.5 * (daysInserted / TOTAL_DAYS);
    } else if (
      variants.length > 0 &&
      !variants.every((vr) => vr.videoStatus === "ready" || vr.videoStatus === "failed")
    ) {
      // Reels exist but at least one video is still generating — hold here so
      // the UI shows "Generating reels" and no metrics leak in early.
      phase = "generating_video";
      progress = 0.3;
    } else if (variants.length > 0) {
      phase = "generating";
      progress = 0.35;
    } else if (hypotheses.length > 0) {
```

- [ ] **Step 3: Push to Convex**

Run: `npx convex dev --once`
Expected: Clean push. `awaitReelsThenRun` now exists, resolving Task 4's reference.

- [ ] **Step 4: Manual end-to-end smoke (Coca-Cola, no cached files yet)**

Run `npm run dev` and `npx convex dev` (separate terminals). Go to `/setup`, click "Prefill with Coca-Cola sample data", submit. Because cached MP4s don't exist yet, the cache branch still patches `videoStatus: "ready"` with a path → gate releases immediately → simulation runs. On the dashboard the reels show (poster fallback for missing files), THEN metrics appear. Confirm metrics never render before the reel tiles.

- [ ] **Step 5: Commit**

```bash
git add convex/simulator.ts convex/experiments.ts
git commit -m "feat: reel-ready gate enforces reel-before-CPC ordering + generating_video phase"
```

---

### Task 6: Per-week improvement prior (CPC trends down)

Make later weeks perform better by scaling effective CTR/CVR up with the week index — lowering CPC and CAC monotonically while keeping per-variant variance and kills.

**Files:**
- Modify: `lib/simulator/runCampaign.ts` (`SimulateDayInput` + `simulateDay` gain `perfMult`)
- Modify: `convex/simulator.ts` (`streamDay` derives week → `perfMult`, passes it in)

**Interfaces:**
- Produces: `simulateDay({ ..., perfMult })` — `perfMult` defaults to `1` (back-compat for `runCampaign`).

- [ ] **Step 1: Thread `perfMult` through the pure simulator**

In `lib/simulator/runCampaign.ts`, extend `SimulateDayInput`:

```ts
export type SimulateDayInput = {
  variants: Variant[];
  /** variantId → spend allocated to that variant for THIS day. Missing/0 = dark. */
  dailySpend: Record<string, number>;
  day: number;
  /** Campaign-level seed; combined with variant id + day for the per-cell stream. */
  seed: number;
  /**
   * Per-week performance prior (>= 1). Each generation inherits the prior week's
   * winning DNA, so later weeks convert better: this multiplies effective CTR &
   * CVR, which lowers CPC and CAC. Documented demo prior — applied on top of the
   * seeded per-variant variance, not replacing it. Defaults to 1 (week 1).
   */
  perfMult?: number;
};
```

In `simulateDay`, apply the multiplier to the effective rates (clamped so a probability never exceeds 1):

```ts
export function simulateDay(input: SimulateDayInput): SimulatedMetric[] {
  const perfMult = input.perfMult ?? 1;
  return input.variants.map((variant) => {
    const rawSpend = input.dailySpend[variant._id as string] ?? 0;
    const base = effectiveRates(variant);
    const effCtr = Math.min(0.99, base.ctr * perfMult);
    const effCvr = Math.min(0.99, base.cvr * perfMult);
    const impressions = rawSpend > 0 ? Math.round((rawSpend / baseline.cpm) * 1000) : 0;
```

(The rest of the function body — `rng`, `clicks`, `conversions`, return object — is unchanged; it already uses `effCtr`/`effCvr`.)

- [ ] **Step 2: Derive the week and pass `perfMult` in `streamDay`**

In `convex/simulator.ts`, add the constant near config:

```ts
const PERF_MULT_PER_WEEK = 1.25; // week w multiplies effective CTR/CVR by 1.25^(w-1)
```

In `streamDay`, after `const productId = variants[0].productId;`, derive the week and multiplier:

```ts
    const productId = variants[0].productId;
    const weeks = await ctx.runQuery(api.experiments.weeksByProduct, { productId });
    const week = weeks.find((w) => w.batchId === args.batchId)?.week ?? 1;
    const perfMult = PERF_MULT_PER_WEEK ** (week - 1);
```

Then pass it into the `simulateDay` call:

```ts
    const todays = simulateDay({ variants, dailySpend, day: args.day, seed, perfMult });
```

- [ ] **Step 3: Typecheck + push**

Run: `npx tsc --noEmit && npx convex dev --once`
Expected: PASS / clean push.

- [ ] **Step 4: Manual verification of the downward trend**

With dev running, run Coca-Cola through **3 weeks** (use the "Run Next Week" button added in Task 12; if doing this task before Task 12, instead invoke `npx convex run experiments:startNextBatch '{"productId":"<id>","priorBatchId":"<prev>"}'` twice). Then run `npx convex run experiments:weeksByProduct '{"productId":"<id>"}'` and confirm `avgCpc` decreases week 1 → 2 → 3.

- [ ] **Step 5: Commit**

```bash
git add lib/simulator/runCampaign.ts convex/simulator.ts
git commit -m "feat: per-week performance prior so CPC/CAC trend down across weeks"
```

---

### Task 7: Analyst `hypothesisVerdict` (what part of the hypothesis was wrong)

Each week's report must say which hypothesis was confirmed/refuted. Add a structured field to the Analyst output. No schema migration — it's stored inside `agent_reasoning.data` JSON.

**Files:**
- Modify: `lib/agents/schemas.ts` (`analystSchema` + `hypothesisVerdict`)
- Modify: `lib/agents/prompts.ts` (`ANALYST_SYSTEM`, `buildAnalystPrompt` includes hypotheses)
- Modify: `convex/agents.ts` (`AnalystResult` type + pass hypotheses into the prompt)

**Interfaces:**
- Produces: `AnalystResult.hypothesisVerdict: Array<{ hypothesis: string; verdict: "confirmed" | "refuted" | "partial"; why: string }>`

- [ ] **Step 1: Extend the analyst schema**

In `lib/agents/schemas.ts`, in `analystSchema`, add `"hypothesisVerdict"` to `required`:

```ts
    required: ["winners", "losers", "perDimensionAttribution", "narrative", "nextBatchBrief", "hypothesisVerdict"],
```

And add the property inside `properties` (after `perDimensionAttribution`):

```ts
      hypothesisVerdict: {
        type: "array",
        description:
          "One entry per hypothesis tested this week: was it confirmed, refuted, or partial, and why — cite the DNA value and its CAC/CVR impact.",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["hypothesis", "verdict", "why"],
          properties: {
            hypothesis: { type: "string", description: "Echo the hypothesis text being judged." },
            verdict: { type: "string", enum: ["confirmed", "refuted", "partial"] },
            why: {
              type: "string",
              description: "Specific evidence — name the DNA value and its measured CAC/CVR effect.",
            },
          },
        },
      },
```

- [ ] **Step 2: Feed hypotheses into the analyst prompt**

In `lib/agents/prompts.ts`, change `buildAnalystPrompt`'s signature to accept hypotheses:

```ts
export function buildAnalystPrompt(input: {
  product: Product;
  variants: Variant[];
  metrics: Metric[];
  hypotheses: Array<Pick<Hypothesis, "text">>;
}): AgentMessages {
```

Add a hypotheses list before the `return`:

```ts
  const hypothesisList = input.hypotheses.map((h, i) => `${i + 1}. ${h.text}`).join("\n");
```

And insert it into the user message (before "VARIANTS AND RESULTS"):

```ts
    user: `PRODUCT TARGETS
Target CAC: $${input.product.targetCAC} | Max CPC: $${input.product.maxCPC}

HYPOTHESES TESTED THIS WEEK
${hypothesisList}

VARIANTS AND RESULTS
${perVariant}

Identify winners and losers (cite the CVR floor for any cheap-CPC kill), attribute CAC/CPC deltas to specific DNA values, render a verdict on each hypothesis above, write the narrative, and produce the next-batch brief.`,
```

Add a line to `ANALYST_SYSTEM` hard rules:

```ts
- For every hypothesis you are given, return a verdict (confirmed / refuted / partial) with specific evidence — this is how the weekly report tells the founder what was right and what was wrong.
```

- [ ] **Step 3: Update the `AnalystResult` type and the analyst call**

In `convex/agents.ts`, extend `AnalystResult`:

```ts
type AnalystResult = {
  winners: string[];
  losers: string[];
  perDimensionAttribution: Array<{
    dimension: string;
    value: string;
    cacDeltaPct: number;
    cpcDeltaPct: number;
  }>;
  hypothesisVerdict: Array<{
    hypothesis: string;
    verdict: "confirmed" | "refuted" | "partial";
    why: string;
  }>;
  narrative: string;
  nextBatchBrief: string;
};
```

In `runAnalyst`, fetch hypotheses and pass them in. Change:

```ts
    const variants = await ctx.runQuery(api.variants.listByBatch, { batchId: args.batchId });
    const metrics = await ctx.runQuery(api.metrics.liveMetrics, { batchId: args.batchId });

    const { system, user } = buildAnalystPrompt({ product, variants, metrics });
```

to:

```ts
    const variants = await ctx.runQuery(api.variants.listByBatch, { batchId: args.batchId });
    const metrics = await ctx.runQuery(api.metrics.liveMetrics, { batchId: args.batchId });
    const hypotheses = await ctx.runQuery(api.hypotheses.listByBatch, { batchId: args.batchId });

    const { system, user } = buildAnalystPrompt({ product, variants, metrics, hypotheses });
```

- [ ] **Step 4: Typecheck + push**

Run: `npx tsc --noEmit && npx convex dev --once`
Expected: PASS / clean push.

- [ ] **Step 5: Commit**

```bash
git add lib/agents/schemas.ts lib/agents/prompts.ts convex/agents.ts
git commit -m "feat: Analyst returns per-hypothesis verdict for the weekly report"
```

---

### Task 8: Add `hypothesisVerdict` to shared types

Give the frontend a typed shape for the Analyst's `data` JSON.

**Files:**
- Modify: `lib/types.ts`

**Interfaces:**
- Produces: `AnalystData` type for `JSON.parse(reasoning.data)`.

- [ ] **Step 1: Append the type**

In `lib/types.ts`, add at the end:

```ts
export type HypothesisVerdict = {
  hypothesis: string;
  verdict: "confirmed" | "refuted" | "partial";
  why: string;
};

export type AnalystData = {
  winners: string[];
  losers: string[];
  perDimensionAttribution: Array<{
    dimension: string;
    value: string;
    cacDeltaPct: number;
    cpcDeltaPct: number;
  }>;
  hypothesisVerdict: HypothesisVerdict[];
  narrative: string;
  nextBatchBrief: string;
};
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: AnalystData / HypothesisVerdict shared types"
```

---

### Task 9: ReelModal — click-to-play popup with audio

A modal that plays the reel large, **unmuted, with controls**. Works for cached files and live Sora URLs; killed reels still open (badged as cut).

**Files:**
- Create: `components/ReelModal.tsx`

**Interfaces:**
- Produces: `ReelModal({ open, onClose, videoSrc, hookType, voice, script, killed })`.

- [ ] **Step 1: Create the component**

```tsx
// components/ReelModal.tsx
"use client";

import { useEffect } from "react";

export default function ReelModal({
  open,
  onClose,
  videoSrc,
  hookType,
  voice,
  script,
  killed = false,
}: {
  open: boolean;
  onClose: () => void;
  videoSrc?: string;
  hookType: string;
  voice: string;
  script: string;
  killed?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm bg-card rounded-bento shadow-bento overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/40 text-white text-[16px] leading-none flex items-center justify-center hover:bg-black/60"
        >
          ×
        </button>

        {videoSrc ? (
          <video
            src={videoSrc}
            className={`w-full aspect-[9/16] object-cover bg-black ${killed ? "grayscale opacity-70" : ""}`}
            controls
            autoPlay
            loop
            playsInline
          />
        ) : (
          <div className="w-full aspect-[9/16] flex items-center justify-center bg-background text-[13px] text-foreground/40">
            No video available
          </div>
        )}

        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="rounded-full bg-foreground text-card px-2.5 py-0.5 text-[10px] font-bold">
              {hookType}
            </span>
            <span className="text-[11px] text-foreground/40">{voice}</span>
            {killed && (
              <span className="ml-auto rounded-full bg-red-500/10 text-red-500 px-2.5 py-0.5 text-[10px] font-bold">
                CUT
              </span>
            )}
          </div>
          <p className="text-[12px] text-foreground/60 leading-relaxed">&ldquo;{script}&rdquo;</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/ReelModal.tsx
git commit -m "feat: ReelModal popup — plays reel large with audio + controls"
```

---

### Task 10: VariantCard — killed reels visible+marked, click opens modal

Killed reels stay on screen, dimmed with a clear "CUT" overlay, and clicking any reel opens the `ReelModal` with sound. Kill state is driven by the bandit allocation status (authoritative), falling back to the existing dead-metrics heuristic.

**Files:**
- Modify: `components/VariantCard.tsx`

**Interfaces:**
- Consumes: `ReelModal` (Task 9).
- Produces: `VariantCard` accepts an optional `killedByBandit?: boolean` prop.

- [ ] **Step 1: Add imports + modal state + killed handling**

In `components/VariantCard.tsx`, change the top imports:

```ts
import type { Variant, Metric } from "@/lib/types";
import ReelPreview from "./ReelPreview";
```

to:

```ts
"use client";

import { useState } from "react";
import type { Variant, Metric } from "@/lib/types";
import ReelPreview from "./ReelPreview";
import ReelModal from "./ReelModal";
```

Change the component signature to accept `killedByBandit`:

```ts
export default function VariantCard({
  variant,
  metrics,
  revealDelay = 0,
  compact = false,
  cachedVideoPath,
  killedByBandit,
}: {
  variant: Variant;
  metrics: Metric[];
  revealDelay?: number;
  compact?: boolean;
  cachedVideoPath?: string;
  killedByBandit?: boolean;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const sorted = metrics.slice().sort((a, b) => a.day - b.day);
  const latest = sorted.length > 0 ? sorted[sorted.length - 1] : null;
  const isDead = killedByBandit || (latest !== null && latest.impressions === 0);
  const isWinning = !isDead && latest !== null && latest.cac > 0 && latest.cac < 80;
  const status = isDead ? "killed" as const : isWinning ? "winning" as const : "running" as const;
  const videoSrc = cachedVideoPath ?? (variant.videoStatus === "ready" ? variant.videoUrl : undefined);
```

- [ ] **Step 2: Make the reel block clickable + show the killed overlay**

Replace the whole reel-rendering block (the `cachedVideoPath ? ... : ReelPreview` conditional, lines ~72–103) with:

```tsx
      {/* Video reel — click to open with audio. Killed reels stay visible,
          dimmed, with a CUT overlay so the cut is obvious. */}
      <div
        className="relative mb-3 cursor-pointer group"
        onClick={() => setModalOpen(true)}
      >
        {videoSrc ? (
          <video
            src={videoSrc}
            className={`w-full rounded-[14px] aspect-[9/16] object-cover bg-background ${
              isDead ? "grayscale opacity-50" : ""
            }`}
            autoPlay
            muted
            loop
            playsInline
          />
        ) : variant.videoStatus === "pending" ? (
          <div className="w-full aspect-[9/16] rounded-[14px] bg-background animate-pulse flex items-center justify-center text-[12px] text-foreground/40">
            generating reel...
          </div>
        ) : (
          <ReelPreview
            hookType={variant.hookType}
            voice={variant.voice}
            script={variant.script}
            pacing={variant.pacing}
            status={status}
          />
        )}

        {isDead && (
          <div className="absolute inset-0 rounded-[14px] flex items-center justify-center pointer-events-none">
            <span className="rounded-full bg-red-500 text-white px-3 py-1 text-[11px] font-bold tracking-wide shadow">
              CUT
            </span>
          </div>
        )}

        <div className="absolute inset-0 rounded-[14px] bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
          <span className="rounded-full bg-white/90 text-foreground px-3 py-1 text-[11px] font-bold">▶ Play with sound</span>
        </div>
      </div>
```

- [ ] **Step 3: Render the modal at the end of the card**

Just before the component's final closing `</div>` (the outer card div), add:

```tsx
      <ReelModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        videoSrc={videoSrc}
        hookType={variant.hookType}
        voice={variant.voice}
        script={variant.script}
        killed={isDead}
      />
```

- [ ] **Step 4: Pass `killedByBandit` from CampaignTimeline**

In `components/CampaignTimeline.tsx`, the timeline already computes `killedIds` per day. In the round render loop, it currently filters `alive` and renders only `r.variants` (alive). To keep killed reels visible, render the **full** set with a killed flag. Change the reel grid in the round render (lines ~173–188):

```tsx
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-4">
              {r.variants.map((v, i) => {
                const allVm = metrics.filter(
                  (m) => (m.variantId as string) === (v._id as string) && m.day <= r.round,
                );
                return (
                  <VariantCard
                    key={v._id}
                    variant={v}
                    metrics={allVm}
                    revealDelay={i * 300}
                    compact
                  />
                );
              })}
            </div>
```

to render alive then killed (killed flagged), so cuts stay on screen:

```tsx
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-4">
              {[...r.variants, ...r.killed].map((v, i) => {
                const allVm = metrics.filter(
                  (m) => (m.variantId as string) === (v._id as string) && m.day <= r.round,
                );
                const killed = r.killed.some((k) => k._id === v._id);
                return (
                  <VariantCard
                    key={v._id}
                    variant={v}
                    metrics={allVm}
                    revealDelay={i * 300}
                    compact
                    killedByBandit={killed}
                  />
                );
              })}
            </div>
```

- [ ] **Step 5: Typecheck + lint + manual**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS. Then with dev running, open a completed batch: confirm killed reels appear dimmed with a "CUT" badge and clicking any reel opens the modal and plays with sound.

- [ ] **Step 6: Commit**

```bash
git add components/VariantCard.tsx components/CampaignTimeline.tsx
git commit -m "feat: killed reels stay visible+marked; click-to-play reel modal with audio"
```

---

### Task 11: WeeklyReport component

A self-contained weekly report: this week's hypothesis, what won / was cut, per-hypothesis verdict, CPC/CAC delta vs last week, and next week's directive.

**Files:**
- Create: `components/WeeklyReport.tsx`

**Interfaces:**
- Consumes: `AnalystData` (Task 8), `Hypothesis`, `Variant`.
- Produces: `WeeklyReport({ week, hypotheses, analystData, avgCpc, avgCac, prevCpc, prevCac, variants })`.

- [ ] **Step 1: Create the component**

```tsx
// components/WeeklyReport.tsx
"use client";

import type { AnalystData, Hypothesis, Variant } from "@/lib/types";

const VERDICT_STYLE: Record<string, string> = {
  confirmed: "bg-green-500/10 text-green-600",
  refuted: "bg-red-500/10 text-red-500",
  partial: "bg-amber-500/10 text-amber-600",
};

export default function WeeklyReport({
  week,
  hypotheses,
  analystData,
  avgCpc,
  avgCac,
  prevCpc,
  prevCac,
  variants,
}: {
  week: number;
  hypotheses: Hypothesis[];
  analystData: AnalystData | null;
  avgCpc: number;
  avgCac: number;
  prevCpc: number | null;
  prevCac: number | null;
  variants: Variant[];
}) {
  const cpcDelta = prevCpc && prevCpc > 0 ? ((avgCpc - prevCpc) / prevCpc) * 100 : null;
  const cacDelta = prevCac && prevCac > 0 ? ((avgCac - prevCac) / prevCac) * 100 : null;

  const idToVariant = new Map(variants.map((v) => [v._id as string, v]));
  const winnerLabels = (analystData?.winners ?? [])
    .map((id) => idToVariant.get(id))
    .filter((v): v is Variant => Boolean(v))
    .map((v) => `${v.hookType}/${v.voice}`);
  const loserLabels = (analystData?.losers ?? [])
    .map((id) => idToVariant.get(id))
    .filter((v): v is Variant => Boolean(v))
    .map((v) => `${v.hookType}/${v.voice}`);

  return (
    <div className="bg-card rounded-bento shadow-bento p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[16px] font-bold text-foreground">Week {week} — Report</h2>
        <div className="flex items-center gap-2">
          <DeltaPill label="CPC" value={avgCpc} delta={cpcDelta} />
          <DeltaPill label="CAC" value={avgCac} delta={cacDelta} />
        </div>
      </div>

      {/* This week's hypotheses + verdicts */}
      <div className="space-y-2">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-foreground/30">Hypotheses & Verdicts</h3>
        {hypotheses.map((h) => {
          const verdict = analystData?.hypothesisVerdict.find(
            (vd) => vd.hypothesis.trim().slice(0, 40) === h.text.trim().slice(0, 40),
          ) ?? analystData?.hypothesisVerdict[hypotheses.indexOf(h)];
          return (
            <div key={h._id} className="bg-background rounded-[12px] p-3">
              <div className="flex items-start gap-2">
                <p className="text-[13px] text-foreground/70 flex-1">{h.text}</p>
                {verdict && (
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${VERDICT_STYLE[verdict.verdict] ?? "bg-foreground/5 text-foreground/40"}`}>
                    {verdict.verdict}
                  </span>
                )}
              </div>
              {verdict && <p className="text-[11px] text-foreground/40 mt-1.5">{verdict.why}</p>}
            </div>
          );
        })}
      </div>

      {/* Winners / cuts */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-50 rounded-[12px] p-3">
          <span className="text-[10px] font-bold uppercase tracking-wide text-green-600">What won</span>
          <p className="text-[12px] text-foreground/60 mt-1">{winnerLabels.join(", ") || "—"}</p>
        </div>
        <div className="bg-red-50 rounded-[12px] p-3">
          <span className="text-[10px] font-bold uppercase tracking-wide text-red-500">What was cut</span>
          <p className="text-[12px] text-foreground/60 mt-1">{loserLabels.join(", ") || "—"}</p>
        </div>
      </div>

      {/* Directive */}
      {analystData?.nextBatchBrief && (
        <div className="bg-primary/5 rounded-[12px] p-4">
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary/50">Next week's directive</span>
          <p className="text-[13px] text-foreground/70 mt-1.5 leading-relaxed">{analystData.nextBatchBrief}</p>
        </div>
      )}
    </div>
  );
}

function DeltaPill({ label, value, delta }: { label: string; value: number; delta: number | null }) {
  return (
    <div className="text-right">
      <span className="block text-[9px] font-semibold uppercase tracking-wide text-foreground/30">{label}</span>
      <span className="text-[14px] font-bold text-foreground">${value.toFixed(2)}</span>
      {delta !== null && (
        <span className={`ml-1.5 text-[10px] font-bold ${delta < 0 ? "text-green-600" : "text-red-500"}`}>
          {delta > 0 ? "+" : ""}{delta.toFixed(0)}%
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/WeeklyReport.tsx
git commit -m "feat: WeeklyReport — hypothesis verdicts, winners/cuts, CPC/CAC delta, directive"
```

---

### Task 12: Dashboard integration — gated reveal, week hypothesis, CPC rail, Run Next Week

Wire it together: show this week's hypothesis report-style up top, gate the metrics panels until the simulation starts, render the WeeklyReport when the Analyst finishes, show a cross-week CPC rail, and a "Run Next Week ▸" button that stops after week 3.

**Files:**
- Modify: `app/dashboard/[batchId]/page.tsx`

**Interfaces:**
- Consumes: `experiments.weeksByProduct` (Task 4), `WeeklyReport` (Task 11), `AnalystData` (Task 8).

- [ ] **Step 1: Imports + new queries + derived values**

In `app/dashboard/[batchId]/page.tsx`, update imports — remove the cached-batch import, add the new ones:

```ts
import type { Hypothesis, Variant, Metric, AnalystData } from "@/lib/types";
import WeeklyReport from "@/components/WeeklyReport";
```

(Delete `import { CACHED_BATCH_ID } from "@/lib/mockData";` and the `cachedReelPaths` block that used it — the cache is now resolved server-side via `videoUrl`, so `CampaignTimeline` no longer needs `cachedReelPaths`.)

In `LiveDashboard`, after the existing `useQuery` calls, add:

```ts
  const weeks = useQuery(
    api.experiments.weeksByProduct,
    productId ? { productId } : "skip",
  );
```

Note: `productId` is derived from `variants?.[0]?.productId` a few lines down — move the `const productId = variants?.[0]?.productId;` line ABOVE this `useQuery` so it's in scope.

Add derived week values after `analystData`:

```ts
  const parsedAnalyst: AnalystData | null = analystData ? (JSON.parse(analystData) as AnalystData) : null;
  const thisWeek = weeks?.find((w) => w.batchId === batchId) ?? null;
  const weekNumber = thisWeek?.week ?? 1;
  const prevWeek = thisWeek ? weeks?.find((w) => w.week === thisWeek.week - 1) ?? null : null;
  const isLastWeek = weekNumber >= 3;
  const metricsStarted = (metrics?.length ?? 0) > 0;
```

- [ ] **Step 2: Remove the `cachedReelPaths` prop from CampaignTimeline**

In the same file, change the `<CampaignTimeline ... cachedReelPaths={cachedReelPaths} />` usage to drop that prop:

```tsx
              <CampaignTimeline
                variants={variants}
                metrics={metrics}
                allocations={allocations as Array<{ day: number; variantId: string; share: number; dailyBudget: number; status: "scale" | "explore" | "kill" }>}
                analystText={analystText}
              />
```

Then in `components/CampaignTimeline.tsx`, remove `cachedReelPaths` from the props type and the pre-data `<VariantCard cachedVideoPath={cachedReelPaths?.[v._id as string]} ... />` (just delete the `cachedVideoPath` line — VariantCard now reads `variant.videoUrl` directly). This keeps one video source of truth.

- [ ] **Step 3: Add the week hypothesis card (report-style, above Hypotheses)**

In the main column, replace the existing "Hypotheses" block:

```tsx
          {/* Hypotheses */}
          {hypotheses !== undefined && hypotheses.length > 0 && (
            <BentoCard title="Hypotheses Being Tested">
              <HypothesisList hypotheses={hypotheses} />
            </BentoCard>
          )}
```

with a prominent week-hypothesis header + the list:

```tsx
          {/* This week's hypothesis — shown report-style every week */}
          {hypotheses !== undefined && hypotheses.length > 0 && (
            <BentoCard title={`Week ${weekNumber} — Hypothesis`} accent>
              <p className="text-[13px] text-foreground/50 mb-4">
                What we believe will lower CAC this week — judged in the Week {weekNumber} report below.
              </p>
              <HypothesisList hypotheses={hypotheses} />
            </BentoCard>
          )}
```

- [ ] **Step 4: Gate the metrics panels until the simulation starts**

The sidebar panels (`BudgetAllocator`, `DNAHeatmap`, `MetricsChart`) currently render whenever `variants`/`metrics` are defined (always-defined arrays), so they show empty during reel generation. Gate them on `metricsStarted`. For each of the three sidebar `BentoCard`s, change the condition from `variants === undefined || metrics === undefined` to also require data. Example for Budget Reallocation:

```tsx
          <BentoCard title="Budget Reallocation">
            {variants === undefined || metrics === undefined || !metricsStarted ? (
              <Skeleton lines={3} />
            ) : (
              <BudgetAllocator variants={variants} metrics={metrics} banditAllocations={allocations} />
            )}
          </BentoCard>
```

Apply the same `|| !metricsStarted` to the `DNAHeatmap` and `MetricsChart` cards. This guarantees no CPC/metrics visualization appears before the reels-ready → simulation transition.

- [ ] **Step 5: Add the cross-week CPC rail + WeeklyReport to the sidebar**

At the top of the `<aside>`, before "Budget Reallocation", add the CPC trend rail:

```tsx
          {/* Cross-week CPC trend — visibly drops week to week */}
          {weeks && weeks.length > 0 && (
            <BentoCard title="CPC by Week">
              <div className="flex items-end gap-3 h-28">
                {weeks.map((w) => {
                  const maxCpc = Math.max(...weeks.map((x) => x.avgCpc), 0.01);
                  const height = w.avgCpc > 0 ? (w.avgCpc / maxCpc) * 100 : 4;
                  return (
                    <div key={w.batchId} className="flex-1 flex flex-col items-center gap-1.5">
                      <span className="text-[11px] font-bold text-foreground">
                        {w.avgCpc > 0 ? `$${w.avgCpc.toFixed(2)}` : "—"}
                      </span>
                      <div
                        className={`w-full rounded-t-[8px] transition-all duration-500 ${
                          w.batchId === batchId ? "bg-primary" : "bg-primary/30"
                        }`}
                        style={{ height: `${height}%` }}
                      />
                      <span className="text-[10px] text-foreground/40 font-semibold">Wk {w.week}</span>
                    </div>
                  );
                })}
              </div>
            </BentoCard>
          )}
```

Then, after the Analyst card (or replacing it), render the WeeklyReport once analysis is done:

```tsx
          {isComplete && parsedAnalyst && (
            <WeeklyReport
              week={weekNumber}
              hypotheses={hypotheses ?? []}
              analystData={parsedAnalyst}
              avgCpc={thisWeek?.avgCpc ?? 0}
              avgCac={thisWeek?.avgCac ?? 0}
              prevCpc={prevWeek?.avgCpc ?? null}
              prevCac={prevWeek?.avgCac ?? null}
              variants={variants ?? []}
            />
          )}
```

- [ ] **Step 6: Reframe the header button as "Run Next Week", stop after week 3**

In the header, the existing block renders a "Run Next Batch" button when `isComplete && productId`. Change its label and gate it on not being the last week:

```tsx
                {isComplete && productId && !isLastWeek && (
                  <button
                    onClick={handleNextBatch}
                    disabled={launchingNext}
                    className="rounded-full bg-primary text-white px-4 py-1.5 text-[12px] font-semibold hover:bg-primary/90 transition-all duration-200 disabled:opacity-50"
                  >
                    {launchingNext ? "Starting..." : "Run Next Week ▸"}
                  </button>
                )}
                {isComplete && isLastWeek && (
                  <span className="rounded-full bg-green-500/10 text-green-600 px-4 py-1.5 text-[12px] font-semibold">
                    Campaign complete · 3 weeks
                  </span>
                )}
```

- [ ] **Step 7: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS. (If `productId` ordering causes a "used before declaration" error, ensure the `const productId = ...` line sits above the `weeks` `useQuery`.)

- [ ] **Step 8: Full manual run-through**

With `npm run dev` + `npx convex dev` running: setup → Coca-Cola → submit. Verify the strict order on the dashboard: Week 1 hypothesis card → reels generating → reels ready → metrics panels populate → Weekly Report appears with verdicts and CPC/CAC. Click "Run Next Week ▸" → week 2 repeats with new reels; CPC rail shows week 2 lower than week 1. Repeat to week 3; button becomes "Campaign complete". Confirm killed reels are visible+marked throughout and the reel modal plays with sound.

- [ ] **Step 9: Commit**

```bash
git add app/dashboard/[batchId]/page.tsx components/CampaignTimeline.tsx
git commit -m "feat: gated weekly dashboard — week hypothesis, CPC rail, WeeklyReport, Run Next Week"
```

---

### Task 13: Generate the cached Coca-Cola reels via Sora (gated on key)

Produce the 9 evolving reels and save to `public/reels/week{w}_slot{n}.mp4`. **Prerequisite: a working `OPENAI_API_KEY` with Sora access + credits.** Until then, the demo runs with poster fallbacks (everything else works).

**Files:**
- Create: `scripts/generate-cached-reels.ts` (standalone Node generation script)
- Output: `public/reels/week1_slot0.mp4` … `public/reels/week3_slot2.mp4` (9 files)

**Interfaces:**
- Consumes: `buildVideoPrompt` (`lib/video/prompt.ts`), `createSoraProvider` (`lib/video/sora.ts`).

- [ ] **Step 1: Confirm the key is available**

Run: `node -e "console.log(!!process.env.OPENAI_API_KEY || require('fs').readFileSync('.env.local','utf8').includes('OPENAI_API_KEY='))"`
If the key is empty (it currently is in `.env.local`), STOP and obtain a working key first — set it in `.env.local` as `OPENAI_API_KEY=sk-...`. Do not proceed without it.

- [ ] **Step 2: Write the generation script**

```ts
// scripts/generate-cached-reels.ts
/**
 * One-time: generate the 9 evolving Coca-Cola demo reels (3 weeks x 3 slots)
 * via Sora, using the SAME feedback-driven prompt builder the live loop uses,
 * so the cached reels genuinely improve week to week. Saves to public/reels/.
 *
 * Run: OPENAI_API_KEY=sk-... npx tsx scripts/generate-cached-reels.ts
 * (Requires Sora access + credits. tsx: npx tsx, or compile via tsc.)
 */
import { writeFile, mkdir } from "node:fs/promises";
import { buildVideoPrompt, type VariantPromptInput } from "../lib/video/prompt";
import { createSoraProvider } from "../lib/video/sora";

// Three weeks of evolving creative. Week N's `feedback` is the directive that
// "won" in week N-1 — this is what makes the reels build on each other.
const WEEKS: Array<{
  feedback?: string;
  reels: VariantPromptInput[];
}> = [
  {
    feedback: undefined,
    reels: [
      { hookType: "pain-point", scriptType: "problem-solution", voice: "ugc", music: "none", pacing: "fast", cta: "shop-now", audience: "cold", script: "It's 2pm and you're crashing. Skip the energy drink. A cold Coca-Cola hits different — no jitters, just that feeling." },
      { hookType: "social-proof", scriptType: "story", voice: "ai-female", music: "upbeat", pacing: "medium", cta: "learn-more", audience: "cold", script: "1.9 billion Cokes are enjoyed every day. Open, pour, listen to that fizz, take the first sip." },
      { hookType: "curiosity", scriptType: "testimonial", voice: "ugc", music: "calm", pacing: "medium", cta: "shop-now", audience: "cold", script: "Everyone's on mushroom water now. I'm at a taco truck with a glass-bottle Coke having a better time than all of them." },
    ],
  },
  {
    feedback: "Contrarian, anti-wellness humor in a real customer's voice crushed it; narrator/stat reads as a corporate ad and bombed. Double down on UGC + contrarian.",
    reels: [
      { hookType: "pain-point", scriptType: "before-after", voice: "ugc", music: "none", pacing: "fast", cta: "shop-now", audience: "warm", script: "My nutritionist said cut soda. Three months of sparkling water that tasted like someone whispered 'lime' near it. Then a Coke at a barbecue. I remembered what happiness tastes like." },
      { hookType: "curiosity", scriptType: "demo", voice: "ugc", music: "none", pacing: "slow", cta: "shop-now", audience: "warm", script: "*psssht* *fizzzzz* *pour over ice* *first sip*... you heard all of that in your head, didn't you? That's Coca-Cola." },
      { hookType: "pain-point", scriptType: "testimonial", voice: "ugc", music: "upbeat", pacing: "fast", cta: "learn-more", audience: "warm", script: "Mushroom coffee, chlorophyll water, sea moss gel. None of them feel like a freezing cold Coke on a hot day." },
    ],
  },
  {
    feedback: "The 'wellness culture is exhausting' angle in a UGC voice with fast pacing is the template. Push specific real-world scenarios where Coke beats a premium wellness alternative.",
    reels: [
      { hookType: "pain-point", scriptType: "story", voice: "ugc", music: "none", pacing: "fast", cta: "shop-now", audience: "retargeting", script: "Left the gym. Trainer wants me on a $14 cold-pressed beet recovery drink. Hit 7-Eleven instead. $1.99 Coke. Same feeling. Way better." },
      { hookType: "curiosity", scriptType: "story", voice: "ugc", music: "calm", pacing: "fast", cta: "shop-now", audience: "retargeting", script: "Date night. She ordered activated charcoal lemonade. I ordered a Coke. She asked to try mine. We're married now." },
      { hookType: "social-proof", scriptType: "story", voice: "ugc", music: "none", pacing: "fast", cta: "shop-now", audience: "retargeting", script: "Office added a $400 kombucha tap. I keep a pack of Cokes in the back of the fridge. My line is always longer." },
    ],
  },
];

async function main() {
  await mkdir("public/reels", { recursive: true });
  const provider = createSoraProvider();

  for (let w = 0; w < WEEKS.length; w++) {
    const week = WEEKS[w];
    for (let slot = 0; slot < week.reels.length; slot++) {
      const prompt = buildVideoPrompt(week.reels[slot], week.feedback);
      const file = `public/reels/week${w + 1}_slot${slot}.mp4`;
      console.log(`[week ${w + 1} slot ${slot}] starting…`);
      const { jobId } = await provider.startVideo(prompt, {
        model: "sora-2",
        seconds: "4",
        size: "720x1280",
      });

      // Poll until done (5s interval, ~5 min ceiling).
      let status = "pending";
      for (let attempt = 0; attempt < 60 && status !== "completed"; attempt++) {
        await new Promise((r) => setTimeout(r, 5000));
        const res = await provider.pollVideo(jobId);
        status = res.status;
        if (res.status === "failed") throw new Error(`week${w + 1} slot${slot} failed: ${res.error}`);
      }
      if (status !== "completed") throw new Error(`week${w + 1} slot${slot} timed out`);

      const blob = await provider.fetchContent(jobId);
      const buf = Buffer.from(await blob.arrayBuffer());
      await writeFile(file, buf);
      console.log(`[week ${w + 1} slot ${slot}] saved ${file} (${buf.length} bytes)`);
    }
  }
  console.log("Done — 9 reels in public/reels/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 3: Run the generation**

Run: `npx tsx scripts/generate-cached-reels.ts` (or, if `tsx` is unavailable: `npx ts-node scripts/generate-cached-reels.ts`). Ensure `OPENAI_API_KEY` is exported/in `.env.local`.
Expected: 9 lines of `saved public/reels/weekN_slotM.mp4`, ending with "Done".

- [ ] **Step 4: Verify the files exist and play**

Run: `ls -la public/reels/week*_slot*.mp4 | wc -l`
Expected: `9`. Then in the running app, run Coca-Cola end to end and confirm each week shows different reels that visibly evolve (week 3 noticeably more refined than week 1), all playing with sound in the modal.

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-cached-reels.ts public/reels/week*_slot*.mp4
git commit -m "feat: generate 9 evolving cached Coca-Cola reels via Sora"
```

---

## Self-Review

**Spec coverage:**
- One real loop for every product → Task 2 (remove short-circuit) + Task 4 (video branch). ✓
- Cached vs Sora by name match → Task 1 (helper) + Task 4. ✓
- Strict reel-before-CPC ordering → Task 5 (gate) + Task 12 Step 4 (panel gating). ✓
- 3 reels/week → Task 3. ✓
- Presenter-advanced 3 weeks → Task 12 Step 6. ✓
- CPC decreases week to week → Task 6 (per-week prior) + Task 4 (weeksByProduct rail data). ✓
- Per-week hypothesis displayed report-style → Task 12 Step 3. ✓
- Weekly Report with hypothesis verdict → Task 7 + Task 11 + Task 12 Step 5. ✓
- Killed reels visible+marked → Task 10. ✓
- Click-to-play popup with audio → Task 9 + Task 10. ✓
- Clean UI → Tasks 9–12 (consistent bento cards, gating removes empty panels). ✓
- CAC natural number → Task 2 Step 1. ✓
- Cached reels generated via Sora → Task 13. ✓

**Placeholder scan:** No "TBD"/"handle edge cases"/"similar to Task N" — every code step shows full code or an exact old→new edit. ✓

**Type consistency:** `weeksByProduct` return shape (`batchId/week/status/startedAt/avgCpc/avgCac`) is consumed identically in Tasks 6 and 12. `AnalystData.hypothesisVerdict` (Task 8) matches the schema (Task 7) and the `WeeklyReport` consumer (Task 11). `VariantCard`'s new `killedByBandit` prop (Task 10 Step 1) matches its caller (Task 10 Step 4). `generateVariantVideo`'s new args (`week/slot/useCached`, Task 4 Step 2) match the scheduler call (Task 4 Step 3). `simulateDay`'s `perfMult` (Task 6 Step 1) matches the caller (Task 6 Step 2). ✓

**Ordering note:** Task 4 references `awaitReelsThenRun` which Task 5 creates — do Task 5 immediately after Task 4 (or temporarily keep the old `runCampaign` schedule until Task 5, as noted in Task 4 Step 4).
