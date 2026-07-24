# Video Reels — Handoff for Steven

Nori shipped real per-variant **video reels** (Sora 2), generated async as part of
the loop. This is the frontend piece left for you: rendering the clip in
`VariantCard`. No new query — the data rides on the variants you already fetch.

## What changed on the backend

- Each `ad_variants` row now carries video fields (all optional):
  | field | type | meaning |
  |---|---|---|
  | `videoStatus` | `"pending" \| "ready" \| "failed"` \| `undefined` | generation state |
  | `videoUrl` | `string` \| `undefined` | playable MP4 (Convex storage URL) when `ready` |
  | `videoError` | `string` \| `undefined` | message when `failed` |
  | `videoJobId` | `string` \| `undefined` | provider job id (debug only) |

- These stream in via the **existing** `variants.listByBatch(batchId)` query —
  Convex reactivity updates the card the moment a clip is ready. **No new query
  to wire.**
- Generation is **non-blocking**: the loop (metrics, analyst, bandit) completes
  on its own; videos fill in over the following ~30s–few min, one per variant.
- Reels are **vertical 720x1280** MP4s (`content-type: video/mp4`), ~4s.
- They **improve each loop**: batch 2+ reels are directed by the prior batch's
  Analyst `nextBatchBrief`, so the visual creative gets better as the loop learns.

## What you need to do — `components/VariantCard.tsx`

`lib/types.ts` is yours; add the optional fields to the `Variant` type, then
render based on `videoStatus`:

```tsx
{variant.videoStatus === "ready" && variant.videoUrl ? (
  <video
    src={variant.videoUrl}
    className="w-full rounded-[14px] mb-3 aspect-[9/16] object-cover bg-background"
    autoPlay
    muted
    loop
    playsInline
  />
) : variant.videoStatus === "pending" ? (
  <div className="w-full aspect-[9/16] rounded-[14px] mb-3 bg-background animate-pulse
                  flex items-center justify-center text-[12px] text-foreground/40">
    generating reel…
  </div>
) : variant.videoStatus === "failed" ? (
  <div className="w-full aspect-[9/16] rounded-[14px] mb-3 bg-background
                  flex items-center justify-center text-[12px] text-foreground/30">
    reel unavailable
  </div>
) : null}
```

Notes:
- `muted` is required for `autoPlay` to work in browsers.
- The card already handles `undefined` variants (loading). A variant with no
  `videoStatus` yet just renders no media — fine.
- Portrait `aspect-[9/16]` matches the generated clips; adjust to taste.

## Types

Add to your `Variant` type in `lib/types.ts`:

```ts
videoStatus?: "pending" | "ready" | "failed";
videoUrl?: string;
videoJobId?: string;
videoError?: string;
```

## Demoing it

A finished batch with 9 ready reels already exists in the dev deployment
(product "FocusFlow"). Open its dashboard and the variant cards have playable
clips. To generate a fresh one: submit the product form (your existing flow) and
watch the reels stream into the cards a little after the metrics do.

Questions → ping Nori.
