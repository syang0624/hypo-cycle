/**
 * Pure campaign simulator (Mode A — heuristic, no live ad APIs).
 *
 * Two entry points:
 *   - simulateDay: simulates ONE day given an explicit per-variant budget. This
 *     is what the day-over-day bandit loop uses — each day's spend per variant
 *     is decided by the allocator, and a variant given 0 budget gets 0
 *     impressions (i.e. a killed variant goes dark). See convex/simulator.ts.
 *   - runCampaign: simulates a whole campaign with a fixed per-variant split.
 *     Kept for tests / non-bandit callers; it just loops simulateDay.
 *
 * Metrics are internally consistent (CPC = spend/clicks, CAC = spend/conversions)
 * and REPRODUCIBLE: all randomness flows through a seeded PRNG keyed by
 * (seed, variant, day), so the same inputs always yield the same demo.
 *
 * The lever: because CAC = spend / conversions, only cvr lowers CAC. A
 * high-ctr / low-cvr variant gets cheap clicks and a low CPC, yet its CAC stays
 * high — which is the whole point.
 */

import type { Variant } from "../types";
import { baseline, effectiveRates } from "./dnaWeights";

export type SimulatedMetric = {
  variantId: Variant["_id"];
  day: number;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  cpc: number;
  ctr: number;
  cac: number; // spend / conversions; 0 is the sentinel for "no conversions yet"
  cvr: number;
};

/** mulberry32 — tiny, fast, deterministic PRNG. Same seed ⇒ same stream. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic string → 32-bit seed so each variant+day has its own stream. */
function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Standard normal via Box–Muller, drawn from the seeded uniform. */
function gaussian(rng: () => number): number {
  const u1 = Math.max(rng(), 1e-9);
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Binomial(n, p) via normal approximation: mean np, sd sqrt(np(1-p)).
 * Cheap, smooth, and good enough at the impression/click counts we deal with.
 * Clamped to [0, n] and rounded to whole events.
 */
function sampleBinomial(n: number, p: number, rng: () => number): number {
  if (n <= 0 || p <= 0) return 0;
  const mean = n * p;
  const sd = Math.sqrt(n * p * (1 - p));
  const draw = Math.round(mean + sd * gaussian(rng));
  return Math.max(0, Math.min(n, draw));
}

export type SimulateDayInput = {
  variants: Variant[];
  /** variantId → spend allocated to that variant for THIS day. Missing/0 = dark. */
  dailySpend: Record<string, number>;
  day: number;
  /** Campaign-level seed; combined with variant id + day for the per-cell stream. */
  seed: number;
  /**
   * Per-week performance prior (>= 1). Each generation inherits the prior week's
   * winning DNA, so later weeks convert better: this multiplies effective CTR &
   * CVR, which lowers CPC and CAC. Documented demo prior — applied on top of the
   * seeded per-variant variance, not replacing it. Defaults to 1 (week 1).
   */
  perfMult?: number;
};

/**
 * Simulate a single day. A variant with 0 (or missing) spend produces a fully
 * zeroed row (0 impressions) — that's how a bandit-killed variant goes dark and
 * the dashboard shows budget reallocating away from it.
 */
export function simulateDay(input: SimulateDayInput): SimulatedMetric[] {
  const perfMult = input.perfMult ?? 1;
  return input.variants.map((variant) => {
    const rawSpend = input.dailySpend[variant._id as string] ?? 0;
    const base = effectiveRates(variant);
    const effCtr = Math.min(0.99, base.ctr * perfMult);
    const effCvr = Math.min(0.99, base.cvr * perfMult);
    const impressions = rawSpend > 0 ? Math.round((rawSpend / baseline.cpm) * 1000) : 0;

    const rng = mulberry32(hashSeed(`${input.seed}:${variant._id}:${input.day}`));
    const clicks = sampleBinomial(impressions, effCtr, rng);
    const conversions = sampleBinomial(clicks, effCvr, rng);
    const spend = round2(rawSpend);

    return {
      variantId: variant._id,
      day: input.day,
      impressions,
      clicks,
      conversions,
      spend,
      cpc: clicks > 0 ? round2(spend / clicks) : 0,
      ctr: impressions > 0 ? round4(clicks / impressions) : 0,
      cac: conversions > 0 ? round2(spend / conversions) : 0,
      cvr: clicks > 0 ? round4(conversions / clicks) : 0,
    };
  });
}

export type RunCampaignInput = {
  variants: Variant[];
  totalBudget: number;
  days: number;
  /** Campaign-level seed; vary it to get a different (still reproducible) run. */
  seed?: number;
};

/**
 * Simulate a whole campaign with a fixed per-variant budget split (each
 * variant's own budget, evenly spread across days). Returns a flat list of
 * per-variant, per-day rows. Used by tests and any non-bandit caller.
 */
export function runCampaign(input: RunCampaignInput): SimulatedMetric[] {
  const { variants, totalBudget, days } = input;
  const seed = input.seed ?? 1337;
  const evenShare = variants.length > 0 ? totalBudget / variants.length : 0;

  const dailySpend: Record<string, number> = {};
  for (const variant of variants) {
    const variantTotal = variant.budget > 0 ? variant.budget : evenShare;
    dailySpend[variant._id as string] = days > 0 ? variantTotal / days : 0;
  }

  const out: SimulatedMetric[] = [];
  for (let day = 1; day <= days; day++) {
    out.push(...simulateDay({ variants, dailySpend, day, seed }));
  }
  return out;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;
const round4 = (n: number): number => Math.round(n * 10000) / 10000;
