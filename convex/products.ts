import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * products.getById — reactive query Steven consumes via useQuery.
 * Returns the full product row, or null if the id no longer resolves.
 */
export const getById = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.productId);
  },
});

/**
 * products.create — the mutation Steven's product form submits to.
 *
 * Does two things atomically so the loop has somewhere to hang off of:
 *   1. Inserts the product row.
 *   2. Opens an experiment_runs row (status "running") under a fresh batchId.
 *
 * Returns { productId, batchId } so the frontend can immediately route to the
 * batch dashboard and start subscribing to live queries. The actual loop
 * (strategist → generator → simulator → analyst) is kicked off separately by
 * experiments.startBatch (Task 8) — create only establishes the records.
 */
export const create = mutation({
  args: {
    name: v.string(),
    landingUrl: v.string(),
    valueProp: v.string(),
    targetCustomer: v.string(),
    pricing: v.string(),
    painPoint: v.string(),
    dailyBudget: v.number(),
    totalBudget: v.number(),
    maxCPC: v.number(),
    targetCAC: v.number(),
    goal: v.string(),
  },
  handler: async (ctx, args) => {
    const productId = await ctx.db.insert("products", args);

    // Fresh, collision-free batch id. Randomness is fine here (unlike the
    // simulator, which must stay seeded) — batch ids only need to be unique.
    const batchId = `batch_${crypto.randomUUID()}`;

    await ctx.db.insert("experiment_runs", {
      productId,
      batchId,
      status: "running",
      startedAt: Date.now(),
    });

    return { productId, batchId };
  },
});
