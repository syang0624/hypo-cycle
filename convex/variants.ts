import { query } from "./_generated/server";
import { v } from "convex/values";

export const listByBatch = query({
  args: { batchId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("ad_variants")
      .withIndex("by_batch", (q) => q.eq("batchId", args.batchId))
      .collect();
  },
});
