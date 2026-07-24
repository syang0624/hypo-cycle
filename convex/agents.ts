/**
 * The three agents as Convex actions: Strategist → Generator → Analyst.
 *
 * Convex actions can't touch the DB directly, so each action reads inputs via
 * ctx.runQuery (existing public queries) and writes via internal mutations
 * defined at the bottom of this file. Each action also SCHEDULES the next step
 * of the loop, so the pipeline self-drives:
 *
 *   runStrategist → runGenerator → simulator.runCampaign → (… days …) → runAnalyst
 *
 * OpenAI is called with strict structured outputs (response_format json_schema)
 * so the JSON is reliably parseable. The SDK retries 429/5xx automatically
 * (maxRetries), satisfying the rate-limit requirement; anything else surfaces.
 */

import { query, internalAction, internalMutation, type ActionCtx } from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import OpenAI from "openai";
import {
  strategistSchema,
  generatorSchema,
  analystSchema,
} from "../lib/agents/schemas";
import {
  buildStrategistPrompt,
  buildGeneratorPrompt,
  buildAnalystPrompt,
} from "../lib/agents/prompts";
import { usesCachedReels } from "../lib/sampleProduct";

/** gpt-4o (2024-08-06+) is the first model with strict json_schema support. */
const AGENT_MODEL = "gpt-4o-2024-08-06";

// Shapes we expect back from each strict schema (kept in lockstep with schemas.ts).
type StrategistResult = {
  audienceAnalysis: string;
  hypotheses: Array<{ text: string; reasoning: string; dimension: string }>;
  experimentPlan: {
    totalBudget: number;
    perVariantBudget: number;
    killRules: string[];
    scaleRules: string[];
  };
};
type GeneratorVariant = {
  hookType: string;
  scriptType: string;
  voice: string;
  music: string;
  pacing: string;
  cta: string;
  audience: string;
  script: string;
  hypothesis: string;
  budget: number;
  killRule: string;
  scaleRule: string;
};
type GeneratorResult = { variants: GeneratorVariant[] };
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

type JsonSchema = { name: string; strict: boolean; schema: Record<string, unknown> };

/**
 * One structured-output call. Returns parsed JSON of type T.
 *
 * If the OpenAI call fails after the SDK's automatic retries (or returns junk),
 * we mark the run "failed" with the error message so the UI can stop spinning
 * (N4), then RE-THROW so the failure still surfaces in logs and halts the loop
 * chain (the next step is only scheduled on success). We record-and-rethrow
 * rather than swallow — consistent with CLAUDE.md.
 */
async function callStructured<T>(
  ctx: ActionCtx,
  batchId: string,
  system: string,
  user: string,
  schema: JsonSchema,
): Promise<T> {
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 4 });
    const resp = await client.chat.completions.create({
      model: AGENT_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_schema", json_schema: schema },
    });
    const content = resp.choices[0]?.message?.content;
    if (!content) throw new Error("OpenAI returned empty content");
    return JSON.parse(content) as T;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await ctx.runMutation(internal.simulator.markFailed, { batchId, error: message });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Strategist
// ---------------------------------------------------------------------------

export const runStrategist = internalAction({
  args: {
    productId: v.id("products"),
    batchId: v.string(),
    priorBatchId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const product = await ctx.runQuery(api.products.getById, { productId: args.productId });
    if (!product) throw new Error(`Strategist: product ${args.productId} not found`);

    // Prior performance seeds the prompt with real numbers. Empty on batch 1.
    const pastVariants = args.priorBatchId
      ? await ctx.runQuery(api.variants.listByBatch, { batchId: args.priorBatchId })
      : [];
    const pastMetrics = args.priorBatchId
      ? await ctx.runQuery(api.metrics.liveMetrics, { batchId: args.priorBatchId })
      : [];

    // Batch 2+: pull the prior Analyst's nextBatchBrief so it steers this batch.
    let priorBrief: string | undefined;
    if (args.priorBatchId) {
      const reasoning = await ctx.runQuery(api.agents.reasoningByBatch, {
        batchId: args.priorBatchId,
      });
      const analyst = reasoning.find((r) => r.agent === "analyst");
      if (analyst) {
        priorBrief = (JSON.parse(analyst.data) as AnalystResult).nextBatchBrief;
      }
    }

    const { system, user } = buildStrategistPrompt({
      product,
      pastVariants,
      pastMetrics,
      goal: product.goal,
      priorBrief,
    });
    const result = await callStructured<StrategistResult>(
      ctx,
      args.batchId,
      system,
      user,
      strategistSchema,
    );

    await ctx.runMutation(internal.agents.insertHypotheses, {
      productId: args.productId,
      batchId: args.batchId,
      hypotheses: result.hypotheses.map((h) => ({
        text: h.text,
        reasoning: `${h.reasoning} [dimension: ${h.dimension}]`,
      })),
    });
    await ctx.runMutation(internal.agents.insertReasoning, {
      batchId: args.batchId,
      agent: "strategist",
      content: result.audienceAnalysis,
      data: JSON.stringify(result),
    });

    // Hand off to the Generator with the budget the plan called for. priorBrief
    // (prior batch's nextBatchBrief, undefined on batch 1) rides along so the
    // video reels can be directed by what won last loop.
    await ctx.scheduler.runAfter(0, internal.agents.runGenerator, {
      productId: args.productId,
      batchId: args.batchId,
      perVariantBudget: result.experimentPlan.perVariantBudget,
      videoFeedback: priorBrief,
    });
    return result;
  },
});

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

export const runGenerator = internalAction({
  args: {
    productId: v.id("products"),
    batchId: v.string(),
    perVariantBudget: v.number(),
    videoFeedback: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const product = await ctx.runQuery(api.products.getById, { productId: args.productId });
    if (!product) throw new Error(`Generator: product ${args.productId} not found`);
    const hypotheses = await ctx.runQuery(api.hypotheses.listByBatch, { batchId: args.batchId });

    const { system, user } = buildGeneratorPrompt({
      product,
      hypotheses,
      perVariantBudget: args.perVariantBudget,
    });
    const result = await callStructured<GeneratorResult>(
      ctx,
      args.batchId,
      system,
      user,
      generatorSchema,
    );

    const variantIds = await ctx.runMutation(internal.agents.insertVariants, {
      productId: args.productId,
      batchId: args.batchId,
      variants: result.variants,
    });

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
  },
});

// ---------------------------------------------------------------------------
// Analyst (scheduled by the simulator once the final day's metrics are in)
// ---------------------------------------------------------------------------

export const runAnalyst = internalAction({
  args: { productId: v.id("products"), batchId: v.string() },
  handler: async (ctx, args) => {
    const product = await ctx.runQuery(api.products.getById, { productId: args.productId });
    if (!product) throw new Error(`Analyst: product ${args.productId} not found`);
    const variants = await ctx.runQuery(api.variants.listByBatch, { batchId: args.batchId });
    const metrics = await ctx.runQuery(api.metrics.liveMetrics, { batchId: args.batchId });
    const hypotheses = await ctx.runQuery(api.hypotheses.listByBatch, { batchId: args.batchId });

    const { system, user } = buildAnalystPrompt({ product, variants, metrics, hypotheses });
    const result = await callStructured<AnalystResult>(
      ctx,
      args.batchId,
      system,
      user,
      analystSchema,
    );

    await ctx.runMutation(internal.agents.insertReasoning, {
      batchId: args.batchId,
      agent: "analyst",
      content: result.narrative,
      data: JSON.stringify(result),
    });

    // The Analyst is the final step of the loop — only now is the run complete
    // (N2). Marking it here, after the reasoning is persisted, means a
    // "complete" status always implies the analysis is available.
    await ctx.runMutation(internal.simulator.markComplete, { batchId: args.batchId });
    return result;
  },
});

// ---------------------------------------------------------------------------
// Internal DB helpers (actions can't touch ctx.db directly)
// ---------------------------------------------------------------------------

export const insertHypotheses = internalMutation({
  args: {
    productId: v.id("products"),
    batchId: v.string(),
    hypotheses: v.array(v.object({ text: v.string(), reasoning: v.string() })),
  },
  handler: async (ctx, args) => {
    for (const h of args.hypotheses) {
      await ctx.db.insert("hypotheses", {
        productId: args.productId,
        batchId: args.batchId,
        text: h.text,
        reasoning: h.reasoning,
      });
    }
  },
});

export const insertVariants = internalMutation({
  args: {
    productId: v.id("products"),
    batchId: v.string(),
    variants: v.array(
      v.object({
        hookType: v.string(),
        scriptType: v.string(),
        voice: v.string(),
        music: v.string(),
        pacing: v.string(),
        cta: v.string(),
        audience: v.string(),
        script: v.string(),
        hypothesis: v.string(),
        budget: v.number(),
        killRule: v.string(),
        scaleRule: v.string(),
      }),
    ),
  },
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
});

export const insertReasoning = internalMutation({
  args: {
    batchId: v.string(),
    agent: v.union(v.literal("strategist"), v.literal("generator"), v.literal("analyst")),
    content: v.string(),
    data: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("agent_reasoning", {
      batchId: args.batchId,
      agent: args.agent,
      content: args.content,
      data: args.data,
      createdAt: Date.now(),
    });
  },
});

/**
 * Public read for the live agent-reasoning panel (demo-critical surface #1).
 * NOTE(steven): this query + the agent_reasoning table are a contract ADDITION
 * not in the original CLAUDE.md list — added because the reasoning panel needs a
 * reactive data source. Shape: { batchId, agent, content, data(JSON), createdAt }.
 */
export const reasoningByBatch = query({
  args: { batchId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agent_reasoning")
      .withIndex("by_batch", (q) => q.eq("batchId", args.batchId))
      .collect();
  },
});
