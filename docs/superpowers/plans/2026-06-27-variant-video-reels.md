# Variant Video Reels — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate a short Sora-2 video reel per ad variant, asynchronously, and fill it into the dashboard reactively without blocking the loop.

**Architecture:** After the Generator inserts the 8 variants it schedules (a) the simulator as today and (b) one parallel video job per variant. Each job builds a prompt from the variant's script + DNA, starts a Sora job, self-reschedules a poll every 5s, and on completion downloads the MP4 into Convex file storage and patches the variant's `videoUrl`. A provider-agnostic adapter isolates Sora so a free model can drop in later. All failures are per-variant and never affect the loop.

**Tech Stack:** Convex (actions + scheduler + file storage), `openai@6.45.0` `client.videos` (Sora 2), TypeScript strict, Next.js (Steven renders).

## Global Constraints

- TypeScript strict; no `any` without a `// FIXME` (CLAUDE.md).
- Nori owns `convex/**`, `lib/agents/**`, `lib/simulator/**`, `lib/bandit.ts`, and new `lib/video/**`. **Do NOT edit** `app/**`, `components/**`, `lib/types.ts`, `lib/mockData.ts` (Steven's). Rendering is a `TODO(steven)`.
- No unit-test framework exists. Verification convention (matches the rest of this repo): pure logic via an ephemeral `npx --yes tsx <script>` in the scratchpad; backend via `npx convex dev --once` (deploy + typecheck + codegen) and `npx convex run <module>:<fn> '<jsonArgs>'`.
- Commit after each task locally. **Do NOT push** — the user manages `main`.
- OpenAI key is already set in the Convex deployment env (`OPENAI_API_KEY`); the Sora adapter reads `process.env.OPENAI_API_KEY` inside the action.
- Sora API (verified): `client.videos.create({ prompt, model, seconds, size })` → `Video{ id, status }`; `client.videos.retrieve(id)` → `Video`; `client.videos.downloadContent(id)` → `Response`. `Video.status: "queued" | "in_progress" | "completed" | "failed"`. `Video.error: { code, message } | null`. `seconds: "4"|"8"|"12"`, `size: "720x1280"|"1280x720"|"1024x1792"|"1792x1024"` (default portrait `720x1280`), `model: "sora-2"|"sora-2-pro"`.

---

### Task 1: Visual prompt builder (`lib/video/prompt.ts`)

Pure function: variant DNA + script → a concrete Sora prompt. Deterministic.

**Files:**
- Create: `lib/video/prompt.ts`
- Test: ephemeral `scratchpad/verify_prompt.ts` (run with tsx, then delete)

**Interfaces:**
- Produces: `buildVideoPrompt(variant: VariantPromptInput): string` where
  `VariantPromptInput = Pick<Variant, "hookType"|"scriptType"|"voice"|"music"|"pacing"|"cta"|"audience"|"script">`

- [ ] **Step 1: Write the implementation**

```ts
// lib/video/prompt.ts
import type { Variant } from "../types";

export type VariantPromptInput = Pick<
  Variant,
  "hookType" | "scriptType" | "voice" | "music" | "pacing" | "cta" | "audience" | "script"
>;

const PACING_HINT: Record<string, string> = {
  fast: "rapid, punchy cuts",
  medium: "steady, clear pacing",
  slow: "slow, deliberate, cinematic pacing",
};

const MUSIC_HINT: Record<string, string> = {
  upbeat: "energetic upbeat soundtrack feel",
  calm: "calm, minimal ambient feel",
  cinematic: "cinematic, dramatic score feel",
  none: "natural ambience, no music",
};

/**
 * Turn a variant's script + creative DNA into a concrete Sora prompt for a
 * short vertical ad reel. Deterministic: same variant => same prompt.
 */
export function buildVideoPrompt(variant: VariantPromptInput): string {
  const pacing = PACING_HINT[variant.pacing] ?? variant.pacing;
  const music = MUSIC_HINT[variant.music] ?? variant.music;
  return [
    `A ${variant.pacing}-paced vertical short-form video advertisement.`,
    `Hook style: ${variant.hookType}. Narrative structure: ${variant.scriptType}.`,
    `On-screen talent/voice: ${variant.voice}. ${pacing}. ${music}.`,
    `Aimed at a ${variant.audience} audience.`,
    `Visualize this script/voiceover: "${variant.script}"`,
    `End on a clear call to action: ${variant.cta}.`,
    `Modern, scroll-stopping social-media ad aesthetic. No on-screen watermarks.`,
  ].join(" ");
}
```

- [ ] **Step 2: Write the failing test**

```ts
// scratchpad/verify_prompt.ts  (path is the session scratchpad dir)
import { buildVideoPrompt } from "../lib/video/prompt"; // adjust relative path to repo
const a = { hookType: "curiosity", scriptType: "story", voice: "ugc", music: "upbeat", pacing: "fast", cta: "learn-more", audience: "cold", script: "Ever lose 2 hours in your inbox?" };
const b = { ...a, hookType: "social-proof", pacing: "slow", script: "Join 10,000 founders who reclaimed their mornings." };
const pa = buildVideoPrompt(a as any), pb = buildVideoPrompt(b as any);
let fail = 0; const ok = (n: string, c: boolean) => { console.log((c?"PASS":"FAIL")+"  "+n); if(!c) fail++; };
ok("non-empty", pa.length > 50);
ok("includes script", pa.includes(a.script));
ok("includes hookType", pa.includes("curiosity"));
ok("includes cta", pa.includes("learn-more"));
ok("differs by DNA", pa !== pb);
ok("deterministic", buildVideoPrompt(a as any) === pa);
process.exit(fail ? 1 : 0);
```

> NOTE: write the script into the session scratchpad dir and fix the import to an absolute or correct-relative path to `lib/video/prompt.ts` (same approach used for prior verify scripts in this repo).

- [ ] **Step 3: Run the test**

Run: `npx --yes tsx scratchpad/verify_prompt.ts`
Expected: all 6 lines `PASS`, exit 0. Then delete the script.

- [ ] **Step 4: Typecheck + commit**

```bash
node_modules/.bin/tsc --noEmit -p tsconfig.json   # expect exit 0
git add lib/video/prompt.ts
git commit -m "video: prompt builder (variant DNA -> Sora prompt)"
```

---

### Task 2: Provider interface + Sora adapter (`lib/video/provider.ts`, `lib/video/sora.ts`)

Isolate the video provider behind a small interface; implement Sora via the OpenAI SDK.

**Files:**
- Create: `lib/video/provider.ts`, `lib/video/sora.ts`

**Interfaces:**
- Produces: `VideoProvider` (`startVideo`, `pollVideo`, `fetchContent`), `StartVideoOptions`, `PollResult`, and `createSoraProvider(): VideoProvider`.

- [ ] **Step 1: Write the interface**

```ts
// lib/video/provider.ts
export type StartVideoOptions = {
  model: "sora-2" | "sora-2-pro";
  seconds: "4" | "8" | "12";
  size: "720x1280" | "1280x720" | "1024x1792" | "1792x1024";
};

export type PollResult =
  | { status: "pending" }
  | { status: "completed" }
  | { status: "failed"; error: string };

export interface VideoProvider {
  startVideo(prompt: string, opts: StartVideoOptions): Promise<{ jobId: string }>;
  pollVideo(jobId: string): Promise<PollResult>;
  /** Download the finished clip as a Blob (only valid once completed). */
  fetchContent(jobId: string): Promise<Blob>;
}
```

- [ ] **Step 2: Write the Sora adapter**

```ts
// lib/video/sora.ts
import OpenAI from "openai";
import type { VideoProvider } from "./provider";

/** Sora 2 implementation. The single swap point for free/other providers. */
export function createSoraProvider(): VideoProvider {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 2 });
  return {
    async startVideo(prompt, opts) {
      const video = await client.videos.create({
        prompt,
        model: opts.model,
        seconds: opts.seconds,
        size: opts.size,
      });
      return { jobId: video.id };
    },
    async pollVideo(jobId) {
      const v = await client.videos.retrieve(jobId);
      if (v.status === "completed") return { status: "completed" as const };
      if (v.status === "failed") {
        return { status: "failed" as const, error: v.error?.message ?? "Sora generation failed" };
      }
      return { status: "pending" as const }; // queued | in_progress
    },
    async fetchContent(jobId) {
      const res = await client.videos.downloadContent(jobId);
      return await res.blob();
    },
  };
}
```

- [ ] **Step 3: Typecheck + commit**

```bash
node_modules/.bin/tsc --noEmit -p tsconfig.json   # expect exit 0
git add lib/video/provider.ts lib/video/sora.ts
git commit -m "video: provider interface + Sora adapter"
```

---

### Task 3: Schema video fields (`convex/schema.ts`)

Add optional video fields to `ad_variants`. All optional — existing inserts unaffected.

**Files:**
- Modify: `convex/schema.ts` (the `ad_variants` table)

- [ ] **Step 1: Add the fields**

In the `ad_variants` `defineTable({ ... })`, after `scaleRule: v.string(),` add:

```ts
    // Video reel (generated async by convex/video.ts). All optional.
    videoStatus: v.optional(
      v.union(v.literal("pending"), v.literal("ready"), v.literal("failed")),
    ),
    videoUrl: v.optional(v.string()),
    videoJobId: v.optional(v.string()),
    videoError: v.optional(v.string()),
```

- [ ] **Step 2: Deploy (validates schema + regenerates types)**

Run: `npx convex dev --once`
Expected: `Convex functions ready!`, no schema errors (optional fields require no migration).

- [ ] **Step 3: Commit**

```bash
git add convex/schema.ts
git commit -m "video: ad_variants video fields (status/url/jobId/error)"
```

---

### Task 4: Video Convex actions (`convex/video.ts`)

The async pipeline: start → self-rescheduling poll → store → patch, plus a preflight.

**Files:**
- Create: `convex/video.ts`

**Interfaces:**
- Consumes: `buildVideoPrompt` (Task 1), `createSoraProvider` (Task 2), `ad_variants` video fields (Task 3).
- Produces: `internal.video.generateVariantVideo({ variantId })`, `internal.video.pollVariantVideo({ variantId, jobId, attempt })`, `internal.video.patchVariantVideo`, `internal.video.getVariant`, and public `video.preflight`.

- [ ] **Step 1: Write the module**

```ts
// convex/video.ts
import { action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { createSoraProvider } from "../lib/video/sora";
import { buildVideoPrompt } from "../lib/video/prompt";
import type { VideoProvider } from "../lib/video/provider";

// Config. VIDEO_ENABLED is the kill switch if credits run low.
const VIDEO_ENABLED = true;
const VIDEO_MODEL = "sora-2" as const;
const VIDEO_SECONDS = "4" as const; // short => faster + cheaper
const VIDEO_SIZE = "720x1280" as const; // vertical reel
const POLL_INTERVAL_MS = 5000;
const MAX_POLLS = 60; // ~5 min ceiling

/** Single swap point for the provider (Sora today; free model later). */
function getProvider(): VideoProvider {
  return createSoraProvider();
}

export const getVariant = internalQuery({
  args: { variantId: v.id("ad_variants") },
  handler: async (ctx, args) => ctx.db.get(args.variantId),
});

export const patchVariantVideo = internalMutation({
  args: {
    variantId: v.id("ad_variants"),
    videoStatus: v.union(v.literal("pending"), v.literal("ready"), v.literal("failed")),
    videoUrl: v.optional(v.string()),
    videoJobId: v.optional(v.string()),
    videoError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updates: {
      videoStatus: "pending" | "ready" | "failed";
      videoUrl?: string;
      videoJobId?: string;
      videoError?: string;
    } = { videoStatus: args.videoStatus };
    if (args.videoUrl !== undefined) updates.videoUrl = args.videoUrl;
    if (args.videoJobId !== undefined) updates.videoJobId = args.videoJobId;
    if (args.videoError !== undefined) updates.videoError = args.videoError;
    await ctx.db.patch(args.variantId, updates);
  },
});

export const generateVariantVideo = internalAction({
  args: { variantId: v.id("ad_variants") },
  handler: async (ctx, args) => {
    if (!VIDEO_ENABLED) return;
    const variant = await ctx.runQuery(internal.video.getVariant, { variantId: args.variantId });
    if (!variant) return;
    try {
      const prompt = buildVideoPrompt(variant);
      const { jobId } = await getProvider().startVideo(prompt, {
        model: VIDEO_MODEL,
        seconds: VIDEO_SECONDS,
        size: VIDEO_SIZE,
      });
      await ctx.runMutation(internal.video.patchVariantVideo, {
        variantId: args.variantId,
        videoStatus: "pending",
        videoJobId: jobId,
      });
      await ctx.scheduler.runAfter(POLL_INTERVAL_MS, internal.video.pollVariantVideo, {
        variantId: args.variantId,
        jobId,
        attempt: 1,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await ctx.runMutation(internal.video.patchVariantVideo, {
        variantId: args.variantId,
        videoStatus: "failed",
        videoError: message,
      });
    }
  },
});

export const pollVariantVideo = internalAction({
  args: { variantId: v.id("ad_variants"), jobId: v.string(), attempt: v.number() },
  handler: async (ctx, args) => {
    try {
      const provider = getProvider();
      const res = await provider.pollVideo(args.jobId);

      if (res.status === "completed") {
        const blob = await provider.fetchContent(args.jobId);
        const storageId = await ctx.storage.store(blob);
        const url = await ctx.storage.getUrl(storageId);
        await ctx.runMutation(internal.video.patchVariantVideo, {
          variantId: args.variantId,
          videoStatus: "ready",
          videoUrl: url ?? undefined,
        });
        return;
      }
      if (res.status === "failed") {
        await ctx.runMutation(internal.video.patchVariantVideo, {
          variantId: args.variantId,
          videoStatus: "failed",
          videoError: res.error,
        });
        return;
      }
      // pending → reschedule until the ceiling
      if (args.attempt >= MAX_POLLS) {
        await ctx.runMutation(internal.video.patchVariantVideo, {
          variantId: args.variantId,
          videoStatus: "failed",
          videoError: "Sora timed out",
        });
        return;
      }
      await ctx.scheduler.runAfter(POLL_INTERVAL_MS, internal.video.pollVariantVideo, {
        variantId: args.variantId,
        jobId: args.jobId,
        attempt: args.attempt + 1,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await ctx.runMutation(internal.video.patchVariantVideo, {
        variantId: args.variantId,
        videoStatus: "failed",
        videoError: message,
      });
    }
  },
});

/** One-shot check that the OpenAI key can create a Sora job. */
export const preflight = action({
  args: {},
  handler: async () => {
    const { jobId } = await getProvider().startVideo(
      "A 4-second test clip: a sleek smartphone on a desk under soft studio light.",
      { model: VIDEO_MODEL, seconds: VIDEO_SECONDS, size: VIDEO_SIZE },
    );
    return { ok: true, jobId };
  },
});
```

- [ ] **Step 2: Deploy (typecheck + codegen)**

Run: `npx convex dev --once`
Expected: `Convex functions ready!`, no type errors. (`internal.video.*` now resolves.)

- [ ] **Step 3: Commit**

```bash
git add convex/video.ts
git commit -m "video: async Sora pipeline (generate/poll/store/patch + preflight)"
```

---

### Task 5: Generator schedules video jobs (`convex/agents.ts`)

`insertVariants` returns the new ids; `runGenerator` fires one video job per variant — parallel, non-blocking — and still kicks off the simulator.

**Files:**
- Modify: `convex/agents.ts` (`insertVariants` handler return; `runGenerator` after-insert block; add `Id` import)

**Interfaces:**
- Consumes: `internal.video.generateVariantVideo` (Task 4).

- [ ] **Step 1: Make `insertVariants` return ids**

Add at the top of `convex/agents.ts` imports:

```ts
import type { Id } from "./_generated/dataModel";
```

Replace the `insertVariants` handler body with:

```ts
  handler: async (ctx, args) => {
    const ids: Array<Id<"ad_variants">> = [];
    for (const variant of args.variants) {
      ids.push(
        await ctx.db.insert("ad_variants", {
          productId: args.productId,
          batchId: args.batchId,
          ...variant,
        }),
      );
    }
    return ids;
  },
```

- [ ] **Step 2: Schedule video jobs in `runGenerator`**

In `runGenerator`, replace this existing block:

```ts
    await ctx.runMutation(internal.agents.insertVariants, {
      productId: args.productId,
      batchId: args.batchId,
      variants: result.variants,
    });

    // Variants exist — kick off the simulated campaign.
    await ctx.scheduler.runAfter(0, internal.simulator.runCampaign, { batchId: args.batchId });
    return result;
```

with:

```ts
    const variantIds = await ctx.runMutation(internal.agents.insertVariants, {
      productId: args.productId,
      batchId: args.batchId,
      variants: result.variants,
    });

    // Fire one video reel per variant — async, parallel, and NON-BLOCKING:
    // the loop proceeds to the simulator immediately regardless of video status.
    for (const variantId of variantIds) {
      await ctx.scheduler.runAfter(0, internal.video.generateVariantVideo, { variantId });
    }

    // Variants exist — kick off the simulated campaign.
    await ctx.scheduler.runAfter(0, internal.simulator.runCampaign, { batchId: args.batchId });
    return result;
```

- [ ] **Step 3: Deploy + commit**

```bash
npx convex dev --once          # expect Convex functions ready!
git add convex/agents.ts
git commit -m "video: generator schedules per-variant reels (non-blocking)"
```

---

### Task 6: Live validation (preflight + full batch)

No code — confirm it works against the live deployment.

- [ ] **Step 1: Preflight (key has Sora access?)**

Run: `npx convex run video:preflight '{}'`
Expected: `{ "ok": true, "jobId": "video_..." }`.
If it errors with access/permission: STOP. Either set `VIDEO_ENABLED=false` (loop runs without video) or point `getProvider()` at a fallback provider, then re-deploy. Report to the user.

- [ ] **Step 2: Run a batch and watch videos fill in**

```bash
# create a product + start a batch (reuse the pattern from prior runs)
npx convex run products:create '{"name":"FocusFlow","landingUrl":"https://focusflow.app","valueProp":"AI deep-work timer","targetCustomer":"Remote devs","pricing":"$12/mo","painPoint":"Context-switching kills focus","dailyBudget":200,"totalBudget":2400,"maxCPC":2.5,"targetCAC":40,"goal":"Trial signups under $40 CAC"}'
# => note productId; then:
npx convex run experiments:startBatch '{"productId":"<id>"}'
```

Then poll the variants a few times over ~1-3 min:

Run: `npx convex run variants:listByBatch '{"batchId":"<batchId>"}'`
Expected over time: each variant's `videoStatus` goes `pending` → `ready` with a `videoUrl` (a Convex storage URL). At least most of the 8 reach `ready`.

- [ ] **Step 3: Confirm the loop was NOT blocked**

Run: `npx convex run experiments:getStatus '{"batchId":"<batchId>"}'`
Expected: the loop reaches `phase: "complete"` independently of video status (metrics/analyst do not wait on videos).

- [ ] **Step 4: (Optional) open a videoUrl in a browser** to confirm the MP4 plays. No commit (validation only).

---

### Task 7: Scope + contract docs (`CLAUDE.md`)

Reflect the decision and hand the render contract to Steven.

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Flip the out-of-scope lines**

In the "What we are NOT building" list, change:
- `- Live Meta / TikTok API integration (architected for, never called)` → leave as is.
- `- Live Veo / Sora video generation` → **remove** (now in scope).
- `- Real video assembly (FFmpeg) — use a placeholder video player` → replace with:
  `- Real video assembly (FFmpeg / editing / captions / music). Sora produces finished raw clips; no manual assembly.`

- [ ] **Step 2: Document the schema + contract for Steven**

In the `ad_variants` schema block (source of truth), add the four video fields. Append a note under the Contracts section:

```
### Video reels (Nori → Steven)
ad_variants rows now carry: videoStatus ("pending"|"ready"|"failed"), videoUrl, videoError.
Generated async after the Generator; they stream in via the existing variants.listByBatch.
TODO(steven): VariantCard renders <video src={variant.videoUrl} autoPlay muted loop playsInline>
when videoStatus==="ready"; a "generating reel…" spinner on "pending"; the current text-only
card as fallback on "failed"/absent.
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "video: update scope + document video reel contract for Steven"
```

---

## Addendum: feedback-driven video (each loop)

Threads the prior batch's Analyst `nextBatchBrief` into the video prompt so reels
improve every loop. Deltas to the tasks above:

- **Task 1 — `buildVideoPrompt`** gains an optional second param:
  `buildVideoPrompt(variant: VariantPromptInput, feedback?: string): string`.
  When `feedback` is non-empty, append:
  `` `Creative direction from what performed best in the previous batch — lean the visual style and message into this: "${feedback}".` ``
  (Add a test case: a prompt built with feedback differs from one without and contains the feedback text.)

- **Task 4 — `generateVariantVideo`** args gain `feedback: v.optional(v.string())`;
  pass it through: `buildVideoPrompt(variant, args.feedback)`.

- **Task 5 — threading:**
  - `runStrategist` already computes `priorBrief` (the prior `nextBatchBrief`). Pass it to the generator:
    add `videoFeedback: priorBrief` to the `internal.agents.runGenerator` schedule call.
  - `runGenerator` args gain `videoFeedback: v.optional(v.string())`; forward it to each job:
    `ctx.scheduler.runAfter(0, internal.video.generateVariantVideo, { variantId, feedback: args.videoFeedback })`.

Batch 1 has no prior brief (`feedback` undefined → baseline prompt); batch 2+ reels are feedback-directed.

## Self-Review

**Spec coverage:** provider+adapter (T2), async flow / scheduler / poll / storage (T4), generator hook non-blocking (T5), schema fields (T3), prompt builder (T1), preflight + fallback (T4/T6), error handling per-variant (T4), cost kill switch `VIDEO_ENABLED` (T4), Steven contract + CLAUDE.md scope flip (T7), verification (T6). All spec sections map to a task.

**Placeholder scan:** none — every code step has full code; verification steps have exact commands + expected output.

**Type consistency:** `VideoProvider`/`StartVideoOptions`/`PollResult` defined in T2 used verbatim in T4; `buildVideoPrompt(VariantPromptInput)` from T1 receives the `getVariant` doc (structurally satisfies the `Pick<Variant,…>`); `patchVariantVideo` arg shape matches the T3 schema fields; `generateVariantVideo({variantId})` signature matches T5's scheduler call; Sora method names/params match the verified SDK surface.
