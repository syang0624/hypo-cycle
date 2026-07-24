import {
  createStubAdapter,
  type IntegrationAdapter,
  type JsonValue,
  type ProviderMetadata,
  type StubAdapterOptions,
} from "./types";

export interface FireworksInferenceRequest {
  executionId: string;
  variantId: string;
  model: string;
  modelVersion?: string;
  input: JsonValue;
  parameters?: ProviderMetadata;
  seed?: number;
  syntheticAudience?: {
    personasVersion: string;
    cohortSize: number;
  };
}

export interface FireworksInferenceOutput {
  content: JsonValue;
  synthetic: boolean;
}

export interface FireworksProviderMetadata extends ProviderMetadata {
  model: string;
  modelVersion: string | null;
  seed: number | null;
  synthetic: boolean;
  personasVersion: string | null;
}

export interface FireworksAdapter
  extends IntegrationAdapter<
    FireworksInferenceRequest,
    FireworksInferenceOutput,
    FireworksProviderMetadata,
    "fireworks"
  > {
  readonly provider: "fireworks";
}

export function createFireworksStub(options?: StubAdapterOptions): FireworksAdapter {
  return createStubAdapter<
    FireworksInferenceRequest,
    FireworksInferenceOutput,
    FireworksProviderMetadata,
    "fireworks"
  >(
    "fireworks",
    (request) => ({
      model: request.model,
      modelVersion: request.modelVersion ?? null,
      seed: request.seed ?? null,
      synthetic: request.syntheticAudience !== undefined,
      personasVersion: request.syntheticAudience?.personasVersion ?? null,
    }),
    options,
  );
}
