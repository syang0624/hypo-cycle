export type SponsorStageState = "complete" | "ready" | "external";

export interface SponsorStage {
  provider: "fireworks" | "daytona" | "braintrust" | "coderabbit";
  label: string;
  state: SponsorStageState;
  detail: string;
  reference?: string;
}

export interface SandboxCandidate {
  name: string;
  hypothesis: string;
  prediction: string;
  falsifier: string;
  score: number;
}

export interface SponsorCycleResult {
  runId: string;
  product: SandboxProductInput;
  objective: string;
  model: string;
  sandboxId: string;
  durationMs: number;
  candidates: SandboxCandidate[];
  winner: SandboxCandidate;
  sandboxOutput: string;
  stages: SponsorStage[];
}

export interface SandboxProductInput {
  name: string;
  landingUrl: string;
  valueProp: string;
  targetCustomer: string;
  pricing: string;
  painPoint: string;
}

export interface SponsorConfiguration {
  daytona: boolean;
  fireworks: boolean;
  braintrust: boolean;
  ready: boolean;
}
