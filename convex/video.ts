/**
 * Async per-variant video reels via Sora 2.
 *
 * Pipeline (all non-blocking — the loop never waits on video):
 *   generateVariantVideo → start Sora job, mark "pending"
 *   pollVariantVideo (self-reschedules every 5s) → on "completed" download the
 *     MP4 into Convex file storage and patch videoUrl="ready"; on failure/timeout
 *     patch "failed". Per-variant errors never touch the run-level status.
 *
 * Feedback loop: `feedback` (the prior batch's Analyst nextBatchBrief) is woven
 * into the prompt so reels improve each loop. See lib/video/prompt.ts.
 */

import { action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { createSoraProvider } from "../lib/video/sora";
import { buildVideoPrompt } from "../lib/video/prompt";
import type { VideoProvider } from "../lib/video/provider";
import { cachedReelPath } from "../lib/sampleProduct";

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
      const prompt = buildVideoPrompt(variant, args.feedback);
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
