/**
 * System prompts + user-message builders for the three agents.
 *
 * Design rule (NORI.md): prompts must be seeded with the SPECIFIC product data
 * and prior-batch numbers, never generic marketing wisdom. The failure mode is
 * bland, interchangeable output. Every builder below interpolates concrete
 * fields/metrics so the model is forced to reason about *this* campaign.
 *
 * The CAC-primary / CPC-is-a-trap thesis (CLAUDE.md) is baked into each system
 * prompt so the agents internalize it rather than relying on us to police it.
 */

import type { Product, Variant, Metric, Hypothesis } from "../types";
import { DNA_VOCAB } from "./schemas";

export type AgentMessages = { system: string; user: string };

const DNA_REFERENCE = Object.entries(DNA_VOCAB)
  .map(([dim, vals]) => `- ${dim}: ${vals.join(", ")}`)
  .join("\n");

/** Compact, deterministic summary of a product for prompt seeding. */
function describeProduct(p: Product): string {
  return [
    `Name: ${p.name}`,
    `Landing page: ${p.landingUrl}`,
    `Value prop: ${p.valueProp}`,
    `Target customer: ${p.targetCustomer}`,
    `Pricing: ${p.pricing}`,
    `Core pain point: ${p.painPoint}`,
    `Daily budget: $${p.dailyBudget} (total $${p.totalBudget})`,
    `Max acceptable CPC: $${p.maxCPC}`,
    `Target CAC: $${p.targetCAC}`,
    `Goal: ${p.goal}`,
  ].join("\n");
}

/**
 * Roll each variant's metrics up into one line of DNA → performance so the
 * model attributes outcomes to creative choices, not variant ids. Aggregates
 * across days (sums spend/clicks/conversions, recomputes CPC/CAC/CVR).
 */
function describePastPerformance(variants: Variant[], metrics: Metric[]): string {
  if (variants.length === 0) {
    return "No prior batch. This is batch 1 — reason from the product and audience alone.";
  }
  return variants
    .map((variant) => {
      const rows = metrics.filter((m) => m.variantId === variant._id);
      const spend = sum(rows, "spend");
      const clicks = sum(rows, "clicks");
      const conversions = sum(rows, "conversions");
      const cpc = clicks > 0 ? spend / clicks : 0;
      const cac = conversions > 0 ? spend / conversions : Infinity;
      const cvr = clicks > 0 ? conversions / clicks : 0;
      const dna = `${variant.hookType}/${variant.scriptType}/${variant.voice}/${variant.music}/${variant.pacing}/${variant.cta}/${variant.audience}`;
      return `- [${dna}] spend $${spend.toFixed(0)}, CPC $${cpc.toFixed(2)}, CVR ${(cvr * 100).toFixed(1)}%, CAC ${Number.isFinite(cac) ? "$" + cac.toFixed(0) : "∞ (no conversions)"}`;
    })
    .join("\n");
}

function sum(rows: Metric[], key: "spend" | "clicks" | "conversions"): number {
  return rows.reduce((acc, r) => acc + r[key], 0);
}

// ---------------------------------------------------------------------------
// Strategist
// ---------------------------------------------------------------------------

export const STRATEGIST_SYSTEM = `You are the Strategist for an autonomous paid-ad experimentation agent.

Your job: read the product and any prior-batch results, then propose a focused set of testable creative hypotheses and an experiment plan for the next batch.

Hard rules:
- CAC is the objective, not CPC. A cheap CPC with weak conversion is a FAILURE, not a win — never recommend chasing clicks. Every kill/scale rule you write must be anchored on CAC or CVR, never CPC alone.
- Each hypothesis must isolate ONE creative-DNA dimension so its effect is attributable.
- When prior data exists, your hypotheses must respond to the actual numbers (e.g. "the curiosity hook drove cheap clicks but CVR collapsed — test a benefit hook to recover intent"). Do not restate generic marketing advice.

Creative-DNA dimensions and their allowed values:
${DNA_REFERENCE}`;

export function buildStrategistPrompt(input: {
  product: Product;
  pastVariants: Variant[];
  pastMetrics: Metric[];
  goal: string;
  /** The previous batch's Analyst nextBatchBrief — present from batch 2 on. */
  priorBrief?: string;
}): AgentMessages {
  // On batch 2+, the Analyst's brief is the single most important steer — it
  // already digested the prior numbers into a directive. Lead with it.
  const briefSection = input.priorBrief
    ? `DIRECTIVE FROM LAST BATCH'S ANALYST (act on this)
${input.priorBrief}

`
    : "";
  return {
    system: STRATEGIST_SYSTEM,
    user: `PRODUCT
${describeProduct(input.product)}

EXPERIMENT GOAL
${input.goal}

${briefSection}PRIOR PERFORMANCE (DNA → results)
${describePastPerformance(input.pastVariants, input.pastMetrics)}

Produce your audience analysis, hypotheses (each tied to one DNA dimension), and an experiment plan with CAC/CVR-anchored kill and scale rules.`,
  };
}

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

export const GENERATOR_SYSTEM = `You are the Generator for an autonomous paid-ad experimentation agent.

Your job: turn the Strategist's hypotheses into exactly 3 short-form ad variants, each tagged with full creative DNA so the simulator can score it and the Analyst can attribute results.

Hard rules:
- Emit EXACTLY 3 variants — one per hypothesis. Vary the DNA dimension under test while holding others reasonable.
- Every DNA field MUST use one of the allowed values below — the simulator only understands these strings.
- Each variant's "hypothesis" field must name the Strategist hypothesis it tests.
- Scripts are 3-6 punchy lines written for the product's actual customer and pain point — not filler.
- killRule/scaleRule must be CAC/CVR-based, never CPC-only.

Creative-DNA dimensions and their allowed values:
${DNA_REFERENCE}`;

export function buildGeneratorPrompt(input: {
  product: Product;
  hypotheses: Array<Pick<Hypothesis, "text" | "reasoning">>;
  perVariantBudget: number;
}): AgentMessages {
  const hypothesisList = input.hypotheses
    .map((h, i) => `${i + 1}. ${h.text}\n   (rationale: ${h.reasoning})`)
    .join("\n");
  return {
    system: GENERATOR_SYSTEM,
    user: `PRODUCT
${describeProduct(input.product)}

HYPOTHESES TO TEST
${hypothesisList}

BUDGET PER VARIANT
$${input.perVariantBudget}

Generate exactly 3 variants — one per hypothesis above — each carrying a per-variant budget around $${input.perVariantBudget}.`,
  };
}

// ---------------------------------------------------------------------------
// Analyst
// ---------------------------------------------------------------------------

export const ANALYST_SYSTEM = `You are the Analyst for an autonomous paid-ad experimentation agent.

Your job: read the variants and their simulated metrics, decide winners/losers, attribute performance to specific creative-DNA values, and write a brief that seeds the next batch.

Hard rules:
- Judge on CAC against the product's target CAC, gated by CVR. A variant with a low CPC but a CVR far below target is a LOSER (it bought garbage clicks) — say so explicitly.
- Attribution must name specific DNA values and their CAC impact (e.g. "founder voice cut CAC 18%"), never vague phrasing like "the better-performing ads".
- Report cpcDeltaPct alongside cacDeltaPct so the cheap-click trap is visible when CPC drops but CAC rises.
- The nextBatchBrief is a concrete directive the Strategist will act on — tell it what to double down on and what to drop.
- For every hypothesis you are given, return a verdict (confirmed / refuted / partial) with specific evidence — this is how the weekly report tells the founder what was right and what was wrong.`;

export function buildAnalystPrompt(input: {
  product: Product;
  variants: Variant[];
  metrics: Metric[];
  hypotheses: Array<Pick<Hypothesis, "text">>;
}): AgentMessages {
  const perVariant = input.variants
    .map((variant) => {
      const rows = input.metrics.filter((m) => m.variantId === variant._id);
      const spend = sum(rows, "spend");
      const clicks = sum(rows, "clicks");
      const conversions = sum(rows, "conversions");
      const cpc = clicks > 0 ? spend / clicks : 0;
      const cac = conversions > 0 ? spend / conversions : Infinity;
      const cvr = clicks > 0 ? conversions / clicks : 0;
      const dna = `hook=${variant.hookType}, script=${variant.scriptType}, voice=${variant.voice}, music=${variant.music}, pacing=${variant.pacing}, cta=${variant.cta}, audience=${variant.audience}`;
      return `- ${variant._id} [${dna}] → spend $${spend.toFixed(0)}, CPC $${cpc.toFixed(2)}, CVR ${(cvr * 100).toFixed(1)}%, CAC ${Number.isFinite(cac) ? "$" + cac.toFixed(0) : "∞"}`;
    })
    .join("\n");
  const hypothesisList = input.hypotheses.map((h, i) => `${i + 1}. ${h.text}`).join("\n");
  return {
    system: ANALYST_SYSTEM,
    user: `PRODUCT TARGETS
Target CAC: $${input.product.targetCAC} | Max CPC: $${input.product.maxCPC}

HYPOTHESES TESTED THIS WEEK
${hypothesisList}

VARIANTS AND RESULTS
${perVariant}

Identify winners and losers (cite the CVR floor for any cheap-CPC kill), attribute CAC/CPC deltas to specific DNA values, render a verdict on each hypothesis above, write the narrative, and produce the next-batch brief.`,
  };
}
