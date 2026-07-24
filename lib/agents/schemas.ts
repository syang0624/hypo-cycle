/**
 * Structured-output schemas for the three agents.
 *
 * These are plain JSON Schema objects (no Zod dependency) ready to drop into
 * OpenAI's `response_format: { type: "json_schema", json_schema: <export> }`.
 * Every object sets `additionalProperties: false` and lists all keys in
 * `required` because OpenAI strict mode demands a closed shape — that strictness
 * is exactly what makes the output reliably parseable in the demo.
 */

/**
 * Canonical creative-DNA vocabulary. THIS IS THE SINGLE SOURCE OF TRUTH for the
 * dimension values the Generator may emit. The simulator's weight table
 * (lib/simulator/dnaWeights.ts, Task 4) is keyed off these exact strings — if a
 * value isn't here, the simulator can't score it. Keep the two in lockstep.
 */
export const DNA_VOCAB = {
  hookType: ["pain-point", "benefit", "curiosity", "social-proof", "shock-stat"],
  scriptType: ["problem-solution", "testimonial", "demo", "story", "listicle"],
  voice: ["founder", "ai-male", "ai-female", "ugc"],
  music: ["upbeat", "calm", "cinematic", "none"],
  pacing: ["fast", "medium", "slow"],
  cta: ["shop-now", "learn-more", "sign-up", "get-demo"],
  audience: ["cold", "warm", "lookalike", "retargeting"],
} as const;

export type DnaDimension = keyof typeof DNA_VOCAB;

// ---------------------------------------------------------------------------
// Strategist
// ---------------------------------------------------------------------------

export const strategistSchema = {
  name: "strategist_output",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["audienceAnalysis", "hypotheses", "experimentPlan"],
    properties: {
      audienceAnalysis: {
        type: "string",
        description:
          "Concrete read of who this product is for and what objection the next batch must overcome. Reference the product's stated customer and pain point.",
      },
      hypotheses: {
        type: "array",
        description: "Exactly 3 testable creative hypotheses, each tied to one DNA dimension.",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["text", "reasoning", "dimension"],
          properties: {
            text: { type: "string", description: "The hypothesis as a falsifiable claim." },
            reasoning: {
              type: "string",
              description:
                "Why this is worth spending budget to test — cite prior-batch numbers when available.",
            },
            dimension: {
              type: "string",
              description: "The single DNA dimension this hypothesis isolates.",
              enum: Object.keys(DNA_VOCAB),
            },
          },
        },
      },
      experimentPlan: {
        type: "object",
        additionalProperties: false,
        required: ["totalBudget", "perVariantBudget", "killRules", "scaleRules"],
        properties: {
          totalBudget: { type: "number" },
          perVariantBudget: { type: "number" },
          killRules: {
            type: "array",
            items: { type: "string" },
            description:
              "When to cut a variant. Must be CAC/CVR-based, not CPC-only (cheap clicks that don't convert are not a win).",
          },
          scaleRules: {
            type: "array",
            items: { type: "string" },
            description: "When to pour more budget into a variant — gated on a CVR floor, not CTR.",
          },
        },
      },
    },
  },
} as const;

// ---------------------------------------------------------------------------
// Generator — emits exactly 3 variants matching the ad_variants DNA columns.
// productId / batchId are stamped on by the action, not the model.
// ---------------------------------------------------------------------------

export const generatorSchema = {
  name: "generator_output",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["variants"],
    properties: {
      variants: {
        type: "array",
        description: "Exactly 3 ad variants spanning the hypotheses (one per hypothesis).",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "hookType",
            "scriptType",
            "voice",
            "music",
            "pacing",
            "cta",
            "audience",
            "script",
            "hypothesis",
            "budget",
            "killRule",
            "scaleRule",
          ],
          properties: {
            hookType: { type: "string", enum: DNA_VOCAB.hookType },
            scriptType: { type: "string", enum: DNA_VOCAB.scriptType },
            voice: { type: "string", enum: DNA_VOCAB.voice },
            music: { type: "string", enum: DNA_VOCAB.music },
            pacing: { type: "string", enum: DNA_VOCAB.pacing },
            cta: { type: "string", enum: DNA_VOCAB.cta },
            audience: { type: "string", enum: DNA_VOCAB.audience },
            script: { type: "string", description: "The actual short-form script (3-6 lines)." },
            hypothesis: {
              type: "string",
              description: "Which Strategist hypothesis this variant tests (echo its text).",
            },
            budget: { type: "number", description: "Allocated spend for this variant." },
            killRule: { type: "string", description: "CAC/CVR threshold that kills this variant." },
            scaleRule: { type: "string", description: "CVR-gated threshold that scales it." },
          },
        },
      },
    },
  },
} as const;

// ---------------------------------------------------------------------------
// Analyst
//
// perDimensionAttribution is modeled as an ARRAY of entries rather than the
// open `{ hookType: { "pain-point": -23% } }` map sketched in NORI.md. Reason:
// OpenAI strict mode can't express arbitrary-key objects, and an array of
// explicit { dimension, value, cacDeltaPct } rows is both strict-safe and a
// direct feed for the DNA heatmap (hook_type × voice colored by CAC). Same
// information, demo-friendlier shape. (Flagged for Steven via the contract list.)
// ---------------------------------------------------------------------------

export const analystSchema = {
  name: "analyst_output",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["winners", "losers", "perDimensionAttribution", "narrative", "nextBatchBrief", "hypothesisVerdict"],
    properties: {
      winners: {
        type: "array",
        items: { type: "string" },
        description: "variantIds that beat target CAC and cleared the CVR floor.",
      },
      losers: {
        type: "array",
        items: { type: "string" },
        description: "variantIds to kill — includes cheap-CPC/low-CVR traps.",
      },
      perDimensionAttribution: {
        type: "array",
        description:
          "Per-DNA-value performance deltas vs. the batch baseline. Drives the heatmap.",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["dimension", "value", "cacDeltaPct", "cpcDeltaPct"],
          properties: {
            dimension: { type: "string", enum: Object.keys(DNA_VOCAB) },
            value: { type: "string", description: "The specific DNA value, e.g. 'pain-point'." },
            cacDeltaPct: {
              type: "number",
              description: "% change in CAC attributed to this value (negative = better).",
            },
            cpcDeltaPct: {
              type: "number",
              description: "% change in CPC — shown alongside CAC to expose cheap-click traps.",
            },
          },
        },
      },
      hypothesisVerdict: {
        type: "array",
        description:
          "One entry per hypothesis tested this week: was it confirmed, refuted, or partial, and why — cite the DNA value and its CAC/CVR impact.",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["hypothesis", "verdict", "why"],
          properties: {
            hypothesis: { type: "string", description: "Echo the hypothesis text being judged." },
            verdict: { type: "string", enum: ["confirmed", "refuted", "partial"] },
            why: {
              type: "string",
              description: "Specific evidence — name the DNA value and its measured CAC/CVR effect.",
            },
          },
        },
      },
      narrative: {
        type: "string",
        description:
          "Plain-language story of what happened, naming specific DNA values and their CAC impact — never 'the ads with the better hook'.",
      },
      nextBatchBrief: {
        type: "string",
        description: "Directive fed straight back into the Strategist for the next batch.",
      },
    },
  },
} as const;
