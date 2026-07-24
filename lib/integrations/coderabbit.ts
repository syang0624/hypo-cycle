import {
  createStubAdapter,
  type IntegrationAdapter,
  type ProviderMetadata,
  type StubAdapterOptions,
} from "./types";

export type CodeRabbitFindingSeverity = "info" | "warning" | "blocking";

export interface CodeRabbitReviewRequest {
  executionId: string;
  repository: string;
  baseRevision: string;
  headRevision: string;
  diffArtifactReference: string;
  policyVersion?: string;
}

export interface CodeRabbitFinding {
  externalId: string;
  severity: CodeRabbitFindingSeverity;
  message: string;
  file?: string;
  line?: number;
  resolved: boolean;
}

export interface CodeRabbitReviewOutput {
  reviewId: string;
  reviewUrl?: string;
  findings: CodeRabbitFinding[];
  hasBlockingFindings: boolean;
}

export interface CodeRabbitProviderMetadata extends ProviderMetadata {
  repository: string;
  baseRevision: string;
  headRevision: string;
  reviewId: string | null;
}

export interface CodeRabbitAdapter
  extends IntegrationAdapter<
    CodeRabbitReviewRequest,
    CodeRabbitReviewOutput,
    CodeRabbitProviderMetadata,
    "coderabbit"
  > {
  readonly provider: "coderabbit";
}

export function createCodeRabbitStub(options?: StubAdapterOptions): CodeRabbitAdapter {
  return createStubAdapter<
    CodeRabbitReviewRequest,
    CodeRabbitReviewOutput,
    CodeRabbitProviderMetadata,
    "coderabbit"
  >(
    "coderabbit",
    (request) => ({
      repository: request.repository,
      baseRevision: request.baseRevision,
      headRevision: request.headRevision,
      reviewId: null,
    }),
    options,
  );
}
