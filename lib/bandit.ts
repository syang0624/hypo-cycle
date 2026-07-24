/**
 * Thompson-sampling budget allocator, gated on a CVR floor.
 *
 * Each variant is an arm with a Beta(alpha, beta) posterior over its TRUE
 * CONVERSION RATE (not click rate — this is the whole design point). We sample
 * each arm's posterior and hand more of the next budget slice to the arms that
 * sampled high. Posteriors update as real conversions stream in.
 *
 * THE GATE (CLAUDE.md / NORI.md non-negotiable): bandit score alone is not
 * allowed to scale a variant. A variant with a juicy CTR but a CVR below the
 * floor is buying garbage clicks — it gets KILLED (share = 0), even if its
 * Thompson draw is the highest. This is what stops the system from optimizing
 * CPC into the ground. CAC over CPC, enforced in code.
 *
 * Reproducible: all sampling runs through a seeded PRNG.
 */

export type BanditArm = {
  variantId: string;
  /** Beta posterior on conversion rate. Start uniform: alpha = beta = 1. */
  alpha: number;
  beta: number;
  /** Observed totals so far, used for the CVR-floor gate. */
  clicks: number;
  conversions: number;
};

export type AllocationStatus = "scale" | "explore" | "kill";

export type Allocation = {
  variantId: string;
  sample: number; // Thompson draw from the posterior (latent CVR)
  share: number; // fraction of the next budget slice, sums to 1 across survivors
  status: AllocationStatus;
};

export type AllocateOptions = {
  /**
   * Absolute conversion-rate floor. Any arm with enough evidence whose observed
   * CVR sits below this is killed regardless of its Thompson sample. Defaults to
   * 0.5% — the "0.5% floor" from NORI.md. Pass a fraction of the product's
   * target CVR if you want it product-relative.
   */
  cvrFloor?: number;
  /** Minimum clicks before we trust a low CVR enough to kill (avoid early noise). */
  minClicksToKill?: number;
  /** Seed for reproducible allocation. */
  seed?: number;
};

// --- seeded PRNG (local copy so the bandit has no cross-module coupling) ----

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

// --- Beta sampling via two Gamma draws (Marsaglia–Tsang) --------------------

function sampleGamma(shape: number, rng: () => number): number {
  // Boost shape < 1 into the >= 1 regime, then correct (Marsaglia–Tsang).
  if (shape < 1) {
    const u = Math.max(rng(), 1e-9);
    return sampleGamma(1 + shape, rng) * Math.pow(u, 1 / shape);
  }
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let x = 0;
    let v = 0;
    do {
      x = gaussian(rng);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = Math.max(rng(), 1e-9);
    if (u < 1 - 0.0331 * x * x * x * x) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

function gaussian(rng: () => number): number {
  const u1 = Math.max(rng(), 1e-9);
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/** Beta(a, b) = G(a) / (G(a) + G(b)). */
function sampleBeta(a: number, b: number, rng: () => number): number {
  const ga = sampleGamma(a, rng);
  const gb = sampleGamma(b, rng);
  return ga / (ga + gb);
}

// --- public API -------------------------------------------------------------

/** Fresh arm with a uniform Beta(1, 1) prior (no opinion until data arrives). */
export function initArm(variantId: string): BanditArm {
  return { variantId, alpha: 1, beta: 1, clicks: 0, conversions: 0 };
}

/**
 * Fold one period's observations into an arm's posterior. Conversions are
 * successes (alpha), non-converting clicks are failures (beta).
 */
export function updateArm(arm: BanditArm, clicks: number, conversions: number): BanditArm {
  const conv = Math.min(conversions, clicks);
  return {
    ...arm,
    alpha: arm.alpha + conv,
    beta: arm.beta + (clicks - conv),
    clicks: arm.clicks + clicks,
    conversions: arm.conversions + conv,
  };
}

/**
 * Allocate the next budget slice across arms via Thompson sampling, with the
 * CVR-floor kill gate applied first. Returns a share per arm (killed arms get 0)
 * plus a status the dashboard can render ("scale" = top survivor, "kill" =
 * gated out, "explore" = everyone else).
 */
export function allocate(arms: BanditArm[], options: AllocateOptions = {}): Allocation[] {
  const cvrFloor = options.cvrFloor ?? 0.005;
  const minClicksToKill = options.minClicksToKill ?? 30;
  const rng = mulberry32((options.seed ?? 4242) >>> 0);

  // 1. Sample every posterior + decide who the floor kills.
  const scored = arms.map((arm) => {
    const sample = sampleBeta(arm.alpha, arm.beta, rng);
    const observedCvr = arm.clicks > 0 ? arm.conversions / arm.clicks : 0;
    const killed = arm.clicks >= minClicksToKill && observedCvr < cvrFloor;
    return { arm, sample, killed };
  });

  // 2. Survivors split the budget proportional to their Thompson draw.
  const survivors = scored.filter((s) => !s.killed);
  const sampleTotal = survivors.reduce((acc, s) => acc + s.sample, 0);
  const topVariantId =
    survivors.length > 0
      ? survivors.reduce((best, s) => (s.sample > best.sample ? s : best)).arm.variantId
      : null;

  return scored.map(({ arm, sample, killed }) => {
    const share = killed || sampleTotal === 0 ? 0 : sample / sampleTotal;
    const status: AllocationStatus = killed
      ? "kill"
      : arm.variantId === topVariantId
        ? "scale"
        : "explore";
    return { variantId: arm.variantId, sample, share, status };
  });
}
