# Design: Real video reels per ad variant

Date: 2026-06-27
Owner: Nori (backend + AI)
Status: Approved (pending spec review)

## Goal

Generate an actual short video reel for each ad variant, so HookLoop produces
real visual creative — not a placeholder — as one step in its loop. The
dashboard fills each variant card with its clip as soon as it's ready.

## Scope change vs CLAUDE.md (intentional)

CLAUDE.md currently lists "Live Veo / Sora video generation" and "Real video
assembly" as out of scope and says "use a placeholder video player" / "not an AI
reel generator." The owner has decided to change this. As part of this work we
update those CLAUDE.md lines to reflect the new decision. The thesis is
preserved: video is **one asynchronous step in the loop**, not the point — the
self-improving loop (strategist → generator → simulator → analyst → bandit) still
leads the demo, and video generation never blocks or gates it.

## Key decisions

- **Provider: OpenAI Sora 2** (`POST /videos` → poll `GET /videos/{id}` → download
  `GET /videos/{id}/content`). Reuses the existing `OPENAI_API_KEY` / credits — no
  new provider or key. Model `sora-2` (fast tier), short clips (~4s) to keep
  latency and cost low.
- **Provider-agnostic adapter.** A small interface isolates Sora behind
  `startVideo` / `pollVideo` / `fetchContent`, so swapping to a free model (HF
  Inference Providers → LTX-Video) or fal/Replicate later is a config change, not
  a rewrite.
- **Async, non-blocking.** Generation runs in parallel with the rest of the loop
  and fills the UI reactively. A failed/timed-out clip degrades gracefully.

## Feedback-driven improvement (each loop)

The video generation is part of the self-improving loop, not a one-off render.
On batch 2+, the prior batch's Analyst `nextBatchBrief` (which already steers the
Strategist via N3) is **also threaded into each variant's video prompt** as
explicit creative direction. So the *visual creative* — not just the variant
metadata — improves every loop: batch 1 reels are baseline; each later batch's
reels are directed by what actually won (e.g. "lean into the UGC/testimonial
visual style that beat CAC last batch").

Threading: `runStrategist` (already fetches the brief) → passes `videoFeedback`
to `runGenerator` → passes `feedback` to each `generateVariantVideo` →
`buildVideoPrompt(variant, feedback)` appends a creative-direction clause.

## Architecture

```
Generator inserts 8 variants
   ├─ schedule simulator.runCampaign        (unchanged — loop proceeds now)
   └─ for each variant: schedule video.generateVariantVideo(variantId)   (parallel, non-blocking)

video.generateVariantVideo(variantId):
   1. read variant, build a visual prompt from script + DNA
   2. provider.startVideo(prompt) → jobId
   3. patch variant: videoStatus="pending", videoJobId=jobId
   4. schedule video.pollVariantVideo(variantId, jobId, attempt=1) after POLL_INTERVAL_MS

video.pollVariantVideo(variantId, jobId, attempt):
   - provider.pollVideo(jobId)
     • completed → fetchContent() → ctx.storage.store(blob) → getUrl()
                 → patch videoStatus="ready", videoUrl=url
     • failed    → patch videoStatus="failed", videoError=msg
     • pending   → if attempt < MAX_POLLS: reschedule self after POLL_INTERVAL_MS
                   else: patch videoStatus="failed", videoError="timeout"
```

Convex reactivity: `variants.listByBatch` already streams variant rows, so each
card's `videoUrl` appears the moment its job completes — no new query needed.

## Components & ownership

All backend pieces are in Nori's zone (`convex/**`, `lib/**` except
`types.ts`/`mockData.ts`). Rendering is Steven's.

| Unit | Path | Purpose |
|---|---|---|
| Provider interface | `lib/video/provider.ts` | `VideoProvider` type: `startVideo`, `pollVideo`, `fetchContent` + result types |
| Sora adapter | `lib/video/sora.ts` | Implements the interface against the OpenAI Videos API (SDK if `openai` exposes `videos`, else `fetch`) |
| Prompt builder | `lib/video/prompt.ts` | Variant (script + hook/pacing/voice/music/audience) → a concrete Sora visual prompt |
| Video actions | `convex/video.ts` (new) | `generateVariantVideo`, `pollVariantVideo` internalActions + an internal mutation to patch variant video fields |
| Generator hook | `convex/agents.ts` | After `insertVariants` (now returns ids), schedule a video job per variant. Still schedules the simulator as today. |
| Schema fields | `convex/schema.ts` | `ad_variants` gains video fields (below) |
| Render (Steven) | `components/VariantCard.tsx` | `<video>` when ready, spinner on pending, fallback on failed. `TODO(steven)` + contract note. |

### Schema additions (ad_variants)

```ts
videoStatus: v.optional(v.union(v.literal("pending"), v.literal("ready"), v.literal("failed"))),
videoUrl: v.optional(v.string()),       // Convex storage serving URL
videoJobId: v.optional(v.string()),     // provider job id (for polling/debug)
videoError: v.optional(v.string()),     // set on failure/timeout
```

All optional, so existing inserts and the rest of the loop are unaffected.

### Config (convex/video.ts)

```ts
VIDEO_ENABLED = true        // master switch; false => skip generation entirely
VIDEO_MODEL   = "sora-2"
VIDEO_SECONDS = 4           // short clips: faster + cheaper
POLL_INTERVAL_MS = 5000
MAX_POLLS = 60              // ~5 min ceiling, then "failed: timeout"
```

## Error handling

- Any provider error, bad response, or timeout sets `videoStatus="failed"` +
  `videoError`; the variant, simulator, bandit, and analyst all run normally.
- Generation failures are isolated per-variant — one bad clip doesn't affect the
  other seven or the loop.
- `markFailed` (the run-level failure path from N4) is **not** triggered by video
  failures — video is non-critical.

## Preflight / fallback

Sora API access can be gated per key. First implementation step is a one-shot
preflight (a tiny `video.preflight` action or manual `npx convex run`) that
confirms the key can create a video job. If it can't, we either (a) flip
`VIDEO_ENABLED=false` (loop runs without video), or (b) point the adapter at a
fallback provider — no architectural change thanks to the interface.

## Cost

~8 short `sora-2` clips per batch on existing OpenAI credits. Short
`VIDEO_SECONDS` keeps per-clip cost/latency down. `VIDEO_ENABLED` is the kill
switch if credits run low.

## Verification

1. Preflight: confirm the key has Sora access.
2. Single variant: one job start → poll → store → `videoUrl` set, MP4 plays.
3. Full batch: 8 cards fill in reactively; the loop (metrics streaming, analyst)
   completes independently and is **not** delayed by video.
4. Forced failure (bad prompt / disabled): variant shows `failed`, loop unaffected.

## Out of scope

- Editing, captions, music, voiceover, multi-shot assembly (raw Sora clip only).
- Regeneration UI / manual re-roll.
- Storage cleanup / retention of old clips.
- Video for the simulator or analyst — variants only.

## Frontend contract for Steven

`ad_variants` rows now carry `videoStatus`, `videoUrl`, `videoError`.
`VariantCard` should: render an autoplay-muted-loop `<video src={variant.videoUrl}>`
when `videoStatus === "ready"`; a spinner/"generating reel…" on `"pending"`; and
the current text-only card as fallback on `"failed"` or absent. Left as
`TODO(steven)`; communicated in chat.
