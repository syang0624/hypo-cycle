import type { Id } from "../convex/_generated/dataModel";

// ---------------------------------------------------------------------------
// HypoCycle target domain model (PRD §11–§12).
//
// These are the frontend's shapes for the generic experiment loop. They track
// the Convex contract Nori is landing in Phase 0/1 — refine here first, then
// tell Nori in chat (Steven owns the shape, Nori reads). The legacy HookLoop
// shapes below stay until each screen migrates off the old queries; the two
// sections are deleted together with the legacy backend functions.
// ---------------------------------------------------------------------------

export type CycleState =
  | "draft"
  | "ready"
  | "provisioning"
  | "running"
  | "evaluating"
  | "decision_ready"
  | "awaiting_review"
  | "awaiting_approval"
  | "adopted"
  | "rejected"
  | "inconclusive"
  | "failed"
  | "cancelled"
  | "invalid"
  | "budget_exhausted"
  | "guardrail_stopped";

export type FindingResult = "supported" | "refuted" | "inconclusive" | "invalid";

export type Program = {
  _id: string;
  _creationTime: number;
  orgId: string;
  projectId: string;
  name: string;
  objective: string;
  primaryMetric: string;
  guardrails: Array<{ metric: string; threshold: number; direction: "min" | "max" }>;
  maxCycleCost: number;
  maxCycleDurationMs: number;
  baselineVersion: string;
  approvalPolicy: string;
};

export type Cycle = {
  _id: string;
  _creationTime: number;
  orgId: string;
  programId: string;
  index: number;
  state: CycleState;
  phase?: string;
  progress?: number;
  error?: string;
  budgetSpent: number;
  startedAt: number;
};

// A falsifiable hypothesis (PRD §9.2). Named to avoid colliding with the
// legacy ad `Hypothesis` until that shape is deleted.
export type FalsifiableHypothesis = {
  _id: string;
  _creationTime: number;
  orgId: string;
  cycleId: string;
  claim: string;
  supportingObservation: string;
  proposedIntervention: string;
  expectedEffect: string;
  falsificationCondition: string;
  risks: string[];
  estimatedCost: number;
  confidence: number;
  status: "proposed" | "locked" | "rejected";
  citesCycleIds: string[];
};

export type ExperimentPlan = {
  _id: string;
  _creationTime: number;
  orgId: string;
  cycleId: string;
  version: number;
  hypothesisId: string;
  repetitions: number;
  concurrency: number;
  timeoutMs: number;
  seed?: number;
  evaluators: Array<{ name: string; version: string; threshold?: number }>;
  stopRules: string[];
  adoptionCriteria: string;
  estimatedCost: number;
};

// Ad-creative template config — the old creative DNA lives inside the generic
// variant as its config payload (PRD §19.1), not as top-level columns.
export type AdCreativeConfig = {
  template: "ad_creative";
  hookType: string;
  scriptType: string;
  voice: string;
  music: string;
  pacing: string;
  cta: string;
  audience: string;
  script: string;
};

export type VariantConfig = AdCreativeConfig | { template: string; [key: string]: unknown };

export type ExperimentVariant = {
  _id: string;
  _creationTime: number;
  orgId: string;
  planId: string;
  role: "control" | "treatment";
  label: string;
  config: VariantConfig;
  budget?: number;
};

export type ExecutionState =
  | "queued"
  | "provisioning"
  | "running"
  | "evaluating"
  | "awaiting_approval"
  | "complete"
  | "failed"
  | "cancelled";

export type Execution = {
  _id: string;
  _creationTime: number;
  orgId: string;
  cycleId: string;
  variantId: string;
  state: ExecutionState;
  sandboxId?: string;
  traceId?: string;
  cost: number;
  startedAt?: number;
  finishedAt?: number;
  error?: string;
};

export type Evaluation = {
  _id: string;
  _creationTime: number;
  orgId: string;
  executionId: string;
  evaluator: string;
  evaluatorVersion: string;
  score: number;
  passed: boolean;
  kind: "deterministic" | "model" | "human" | "composite";
  simulated: boolean;
  details?: string;
};

export type Finding = {
  _id: string;
  _creationTime: number;
  orgId: string;
  cycleId: string;
  result: FindingResult;
  summary: string;
  guardrailsPassed: boolean;
  winnerVariantId?: string;
  uncertainty?: string;
  evidenceRefs: string[];
};

export type Approval = {
  _id: string;
  _creationTime: number;
  orgId: string;
  cycleId: string;
  policy: string;
  status: "pending" | "approved" | "rejected" | "changes_requested" | "rerun_required";
  decidedBy?: string;
  decidedAt?: number;
};

export type AuditEvent = {
  _id: string;
  _creationTime: number;
  orgId: string;
  actor: string;
  action: string;
  resource: string;
  result: string;
  at: number;
};

// ---------------------------------------------------------------------------
// LEGACY — HookLoop ad-loop shapes. Still returned by the legacy Convex
// functions the current screens call. Do not extend; migrate screens to the
// domain model above, then delete each shape together with its backend query.
// ---------------------------------------------------------------------------

export type Product = {
  _id: Id<"products">;
  _creationTime: number;
  name: string;
  landingUrl: string;
  valueProp: string;
  targetCustomer: string;
  pricing: string;
  painPoint: string;
  dailyBudget: number;
  totalBudget: number;
  maxCPC: number;
  targetCAC: number;
  goal: string;
};

export type Hypothesis = {
  _id: Id<"hypotheses">;
  _creationTime: number;
  productId: Id<"products">;
  batchId: string;
  text: string;
  reasoning: string;
};

export type Variant = {
  _id: Id<"ad_variants">;
  _creationTime: number;
  productId: Id<"products">;
  batchId: string;
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
  videoStatus?: "pending" | "ready" | "failed";
  videoUrl?: string;
  videoJobId?: string;
  videoError?: string;
};

export type Metric = {
  _id: Id<"campaign_metrics">;
  _creationTime: number;
  variantId: Id<"ad_variants">;
  batchId: string;
  day: number;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  cpc: number;
  ctr: number;
  cac: number;
  cvr: number;
};

export type ExperimentRun = {
  _id: Id<"experiment_runs">;
  _creationTime: number;
  productId: Id<"products">;
  batchId: string;
  status: "running" | "complete";
  startedAt: number;
};

export type ProductInput = Omit<Product, "_id" | "_creationTime">;

export type HypothesisVerdict = {
  hypothesis: string;
  verdict: "confirmed" | "refuted" | "partial";
  why: string;
};

export type AnalystData = {
  winners: string[];
  losers: string[];
  perDimensionAttribution: Array<{
    dimension: string;
    value: string;
    cacDeltaPct: number;
    cpcDeltaPct: number;
  }>;
  hypothesisVerdict: HypothesisVerdict[];
  narrative: string;
  nextBatchBrief: string;
};
