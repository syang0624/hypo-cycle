/**
 * Campaign simulator as a Convex action layer over the pure simulator, with the
 * Thompson-sampling bandit driving budget day-over-day (demo surface #3).
 *
 * The demo can't wait three real days, so we fake the passage of time: day 1 is
 * inserted immediately, then a self-scheduling action drops day 2 and day 3 two
 * seconds apart. Crucially, BEFORE simulating each day after the first, we run
 * the bandit over everything observed so far and let it set that day's budget
 * split. Killed variants get 0 spend → 0 impressions → they go dark, and the
 * winners visibly soak up the freed budget. Because campaign_metrics (and
 * bandit_allocations) are reactive, Steven's dashboard animates the shift with
 * no polling — the "Best Use of Convex" surface.
 *
 * Determinism: seeded off the batchId, so every day's numbers and every bandit
 * draw are stable and the whole campaign is reproducible.
 */

import { query, internalAction, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import { simulateDay } from "../lib/simulator/runCampaign";
import { allocate, initArm, updateArm } from "../lib/bandit";

const TOTAL_DAYS = 7;
const DAY_DELAY_MS = 2000;
const PERF_MULT_PER_WEEK = 1.25; // week w multiplies effective CTR/CVR by 1.25^(w-1)
const REEL_GATE_INTERVAL_MS = 1500;
const REEL_GATE_MAX_ATTEMPTS = 200; // ~5 min ceiling, then proceed anyway

// Bandit kill policy. The DNA weights produce CVRs roughly in the 1.5–4% band,
// all above a flat 0.5% floor — so a flat floor would never kill anything.
// Instead the floor is BATCH-RELATIVE: cut any creative converting below 55% of
// the best performer's rate. This guarantees both kills AND survivors (the best
// arm's CVR is by definition >= the floor, so it can never be killed), which is
// what keeps the demo honest and the allocation non-degenerate.
const MIN_CLICKS_TO_KILL = 30;
const KILL_FRACTION = 0.55;
const ABS_CVR_FLOOR = 0.005;

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Stable numeric seed from a batchId so each batch differs but is repeatable. */
function seedFromBatch(batchId: string): number {
  let h = 2166136261;
  for (let i = 0; i < batchId.length; i++) {
    h ^= batchId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

type AllocRecord = {
  variantId: import("./_generated/dataModel").Id<"ad_variants">;
  share: number;
  dailyBudget: number;
  status: "scale" | "explore" | "kill";
};

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

/**
 * Entry point (scheduled by the Generator). Kicks off the day-by-day stream.
 */
export const runCampaign = internalAction({
  args: { batchId: v.string() },
  handler: async (ctx, args) => {
    await ctx.scheduler.runAfter(0, internal.simulator.streamDay, {
      batchId: args.batchId,
      day: 1,
    });
  },
});

/**
 * Simulate one day — with the bandit deciding this day's budget split from all
 * prior days — insert its metrics + allocation, then schedule the next day or,
 * on the last day, close the run and hand off to the Analyst.
 */
export const streamDay = internalAction({
  args: { batchId: v.string(), day: v.number() },
  handler: async (ctx, args) => {
    const variants = await ctx.runQuery(api.variants.listByBatch, { batchId: args.batchId });
    if (variants.length === 0) {
      throw new Error(`Simulator: no variants for batch ${args.batchId}`);
    }
    const productId = variants[0].productId;
    const weeks = await ctx.runQuery(api.experiments.weeksByProduct, { productId });
    const week = weeks.find((w) => w.batchId === args.batchId)?.week ?? 1;
    const perfMult = PERF_MULT_PER_WEEK ** (week - 1);
    const seed = seedFromBatch(args.batchId);
    const totalDailyPot = variants.reduce((acc, vr) => acc + vr.budget, 0) / TOTAL_DAYS;

    const dailySpend: Record<string, number> = {};
    const allocRecords: AllocRecord[] = [];

    if (args.day === 1) {
      // Day 1: start from the Generator's per-variant budgets (no data yet).
      for (const vr of variants) {
        const spend = vr.budget / TOTAL_DAYS;
        dailySpend[vr._id as string] = spend;
        allocRecords.push({
          variantId: vr._id,
          share: totalDailyPot > 0 ? spend / totalDailyPot : 0,
          dailyBudget: round2(spend),
          status: "explore",
        });
      }
    } else {
      // Day 2+: let the bandit reallocate from everything observed so far.
      const prior = await ctx.runQuery(api.metrics.liveMetrics, { batchId: args.batchId });
      const arms = variants.map((vr) => {
        let arm = initArm(vr._id as string);
        for (const m of prior) {
          if ((m.variantId as string) === (vr._id as string)) {
            arm = updateArm(arm, m.clicks, m.conversions);
          }
        }
        return arm;
      });

      const observedCvrs = arms
        .filter((a) => a.clicks >= MIN_CLICKS_TO_KILL)
        .map((a) => a.conversions / a.clicks);
      const bestCvr = observedCvrs.length > 0 ? Math.max(...observedCvrs) : 0;
      const cvrFloor = Math.max(ABS_CVR_FLOOR, KILL_FRACTION * bestCvr);

      // allocate() preserves arm order, and arms == variants order, so we can
      // zip allocations back to variants by index to recover the typed Id.
      const allocations = allocate(arms, {
        cvrFloor,
        minClicksToKill: MIN_CLICKS_TO_KILL,
        seed: seed + args.day,
      });
      allocations.forEach((a, i) => {
        const vr = variants[i];
        const spend = a.status === "kill" ? 0 : a.share * totalDailyPot;
        dailySpend[vr._id as string] = spend;
        allocRecords.push({
          variantId: vr._id,
          share: a.share,
          dailyBudget: round2(spend),
          status: a.status,
        });
      });
    }

    await ctx.runMutation(internal.simulator.insertAllocations, {
      batchId: args.batchId,
      day: args.day,
      allocations: allocRecords,
    });

    const todays = simulateDay({ variants, dailySpend, day: args.day, seed, perfMult });
    await ctx.runMutation(internal.simulator.insertDayMetrics, {
      batchId: args.batchId,
      metrics: todays,
    });

    if (args.day < TOTAL_DAYS) {
      await ctx.scheduler.runAfter(DAY_DELAY_MS, internal.simulator.streamDay, {
        batchId: args.batchId,
        day: args.day + 1,
      });
    } else {
      // Final day in. Hand off to the Analyst — it is the one that marks the
      // run complete, once its reasoning is written (N2). The run stays
      // "running" through analysis so the UI shows an "analyzing" phase.
      await ctx.scheduler.runAfter(0, internal.agents.runAnalyst, {
        productId,
        batchId: args.batchId,
      });
    }
  },
});

export const insertDayMetrics = internalMutation({
  args: {
    batchId: v.string(),
    metrics: v.array(
      v.object({
        variantId: v.id("ad_variants"),
        day: v.number(),
        impressions: v.number(),
        clicks: v.number(),
        conversions: v.number(),
        spend: v.number(),
        cpc: v.number(),
        ctr: v.number(),
        cac: v.number(),
        cvr: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    for (const m of args.metrics) {
      await ctx.db.insert("campaign_metrics", { batchId: args.batchId, ...m });
    }
  },
});

export const insertAllocations = internalMutation({
  args: {
    batchId: v.string(),
    day: v.number(),
    allocations: v.array(
      v.object({
        variantId: v.id("ad_variants"),
        share: v.number(),
        dailyBudget: v.number(),
        status: v.union(v.literal("scale"), v.literal("explore"), v.literal("kill")),
      }),
    ),
  },
  handler: async (ctx, args) => {
    for (const a of args.allocations) {
      await ctx.db.insert("bandit_allocations", { batchId: args.batchId, day: args.day, ...a });
    }
  },
});

/** Public read of the bandit's per-day budget decisions for the demo. */
export const allocationsByBatch = query({
  args: { batchId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bandit_allocations")
      .withIndex("by_batch", (q) => q.eq("batchId", args.batchId))
      .collect();
  },
});

export const markComplete = internalMutation({
  args: { batchId: v.string() },
  handler: async (ctx, args) => {
    const run = await ctx.db
      .query("experiment_runs")
      .withIndex("by_batch", (q) => q.eq("batchId", args.batchId))
      .first();
    if (run) await ctx.db.patch(run._id, { status: "complete" });
  },
});

/** Mark a run failed and record the error (N4) so the UI can stop spinning. */
export const markFailed = internalMutation({
  args: { batchId: v.string(), error: v.string() },
  handler: async (ctx, args) => {
    const run = await ctx.db
      .query("experiment_runs")
      .withIndex("by_batch", (q) => q.eq("batchId", args.batchId))
      .first();
    if (run) await ctx.db.patch(run._id, { status: "failed", error: args.error });
  },
});
