import { query } from "./_generated/server";
import { v } from "convex/values";

export const liveMetrics = query({
  args: { batchId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("campaign_metrics")
      .withIndex("by_batch", (q) => q.eq("batchId", args.batchId))
      .collect();
  },
});
