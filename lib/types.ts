import type { Id } from "../convex/_generated/dataModel";

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
