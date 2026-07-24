/**
 * Loop orchestration + status.
 *
 * startBatch is the single trigger Steven calls to run the whole pipeline. It
 * does NOT spin up a fresh batch on top of the one products.create already
 * opened — it reuses the product's running experiment_run (creating one only as
 * a fallback) so the batchId the form received stays the batchId everything
 * streams into. From there it kicks off runStrategist; each agent/simulator step
 * schedules the next, so this mutation returns immediately.
 *
 * getStatus reports BOTH `status` (CLAUDE.md contract) and `phase` (NORI.md
 * contract) so neither side breaks — the two specs disagreed on the field name.
 */

import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

const TOTAL_DAYS = 7;

type Phase = "strategizing" | "generating" | "generating_video" | "simulating" | "analyzing" | "complete" | "failed";

export const startBatch = mutation({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    // Reuse the running run opened by products.create; fall back to creating one.
    const existing = await ctx.db
      .query("experiment_runs")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .filter((q) => q.eq(q.field("status"), "running"))
      .order("desc")
      .first();

    let batchId = existing?.batchId;
    if (!batchId) {
      batchId = `batch_${crypto.randomUUID()}`;
      await ctx.db.insert("experiment_runs", {
        productId: args.productId,
        batchId,
        status: "running",
        startedAt: Date.now(),
      });
    }

    // Fire the loop. Strategist → Generator → Simulator → Analyst self-chain.
    await ctx.scheduler.runAfter(0, internal.agents.runStrategist, {
      productId: args.productId,
      batchId,
    });

    return batchId;
  },
});

/**
 * Kick off the NEXT batch, seeded from a completed prior batch. Creates a fresh
 * batchId + experiment_run and passes priorBatchId to the Strategist, which
 * pulls the prior batch's performance AND its Analyst nextBatchBrief (N3). This
 * is the loop closing on itself — batch N+1 learns from batch N.
 *
 * TODO(steven): add a "Run Next Batch" trigger on the dashboard that appears
 * once getStatus.phase === "complete", calling
 *   startNextBatch({ productId, priorBatchId: currentBatchId })
 * then routing to the returned new batchId.
 */
export const startNextBatch = mutation({
  args: { productId: v.id("products"), priorBatchId: v.string() },
  handler: async (ctx, args) => {
    const batchId = `batch_${crypto.randomUUID()}`;
    await ctx.db.insert("experiment_runs", {
      productId: args.productId,
      batchId,
      status: "running",
      startedAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.agents.runStrategist, {
      productId: args.productId,
      batchId,
      priorBatchId: args.priorBatchId,
    });

    return batchId;
  },
});

export const getStatus = query({
  args: { batchId: v.string() },
  handler: async (ctx, args) => {
    const run = await ctx.db
      .query("experiment_runs")
      .withIndex("by_batch", (q) => q.eq("batchId", args.batchId))
      .first();
    if (!run) return null;

    // Derive the phase from what the pipeline has produced so far.
    const hypotheses = await ctx.db
      .query("hypotheses")
      .withIndex("by_batch", (q) => q.eq("batchId", args.batchId))
      .collect();
    const variants = await ctx.db
      .query("ad_variants")
      .withIndex("by_batch", (q) => q.eq("batchId", args.batchId))
      .collect();
    const metrics = await ctx.db
      .query("campaign_metrics")
      .withIndex("by_batch", (q) => q.eq("batchId", args.batchId))
      .collect();

    const daysInserted = new Set(metrics.map((m) => m.day)).size;
    const allDaysIn = daysInserted >= TOTAL_DAYS;

    // Phase derivation. Because the Analyst is now what marks the run complete
    // (N2), a "complete" status always implies analysis is done; the window
    // where all days are simulated but the Analyst is still working shows as
    // "analyzing".
    let phase: Phase;
    let progress: number;
    if (run.status === "failed") {
      phase = "failed";
      progress = 0;
    } else if (run.status === "complete") {
      phase = "complete";
      progress = 1;
    } else if (allDaysIn) {
      phase = "analyzing";
      progress = 0.9;
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
      phase = "generating";
      progress = 0.2;
    } else {
      phase = "strategizing";
      progress = 0.1;
    }

    // productId is returned so the dashboard can resolve the campaign's other
    // weeks immediately — without waiting for this batch's variants to exist.
    return { status: run.status, phase, progress, error: run.error ?? null, productId: run.productId };
  },
});

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
        status: run.status as "running" | "complete" | "failed",
        startedAt: run.startedAt,
        avgCpc: clicks > 0 ? Math.round((spend / clicks) * 100) / 100 : 0,
        avgCac: conversions > 0 ? Math.round((spend / conversions) * 100) / 100 : 0,
      });
    }
    return out;
  },
});
