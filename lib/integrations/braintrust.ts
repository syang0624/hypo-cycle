import {
  createStubAdapter,
  type IntegrationAdapter,
  type JsonValue,
  type ProviderMetadata,
  type StubAdapterOptions,
} from "./types";

export interface BraintrustEvaluation {
  name: string;
  evaluatorVersion: string;
  score?: number;
  passed?: boolean;
  metadata?: ProviderMetadata;
}

export interface BraintrustTraceRequest {
  projectId: string;
  experimentId: string;
  runId: string;
  variantId: string;
  traceId: string;
  hypothesisVersion: string;
  environmentVersion: string;
  datasetItemVersion?: string;
  artifactVersions?: string[];
  input: JsonValue;
  output?: JsonValue;
  evaluations: BraintrustEvaluation[];
}

export interface BraintrustTraceOutput {
  traceId: string;
  traceUrl?: string;
  evaluations: BraintrustEvaluation[];
}

export interface BraintrustProviderMetadata extends ProviderMetadata {
  projectId: string;
  experimentId: string;
  runId: string;
  variantId: string;
  traceId: string;
}

export interface BraintrustAdapter
  extends IntegrationAdapter<
    BraintrustTraceRequest,
    BraintrustTraceOutput,
    BraintrustProviderMetadata,
    "braintrust"
  > {
  readonly provider: "braintrust";
}

export function createBraintrustStub(options?: StubAdapterOptions): BraintrustAdapter {
  return createStubAdapter<
    BraintrustTraceRequest,
    BraintrustTraceOutput,
    BraintrustProviderMetadata,
    "braintrust"
  >(
    "braintrust",
    (request) => ({
      projectId: request.projectId,
      experimentId: request.experimentId,
      runId: request.runId,
      variantId: request.variantId,
      traceId: request.traceId,
    }),
    options,
  );
}
