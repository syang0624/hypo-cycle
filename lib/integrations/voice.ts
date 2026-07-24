import {
  createStubAdapter,
  type IntegrationAdapter,
  type ProviderMetadata,
  type StubAdapterOptions,
} from "./types";

export interface VoiceConsent {
  subjectId: string;
  consentRecordId: string;
  consentVersion: string;
  authorizedUses: string[];
}

export interface VoiceGenerationRequest {
  executionId: string;
  script: string;
  scriptVersion: string;
  voiceId: string;
  voiceConfiguration: ProviderMetadata;
  provider?: string;
  model?: string;
  modelVersion?: string;
  consent: VoiceConsent;
}

export interface VoiceGenerationOutput {
  audioArtifactReference: string;
  durationMilliseconds?: number;
  contentType: string;
}

export interface VoiceProviderMetadata extends ProviderMetadata {
  providerName: string | null;
  model: string | null;
  modelVersion: string | null;
  voiceId: string;
  scriptVersion: string;
  consentRecordId: string;
  consentVersion: string;
}

export interface VoiceAdapter
  extends IntegrationAdapter<
    VoiceGenerationRequest,
    VoiceGenerationOutput,
    VoiceProviderMetadata,
    "voice"
  > {
  readonly provider: "voice";
}

export function createVoiceStub(options?: StubAdapterOptions): VoiceAdapter {
  return createStubAdapter<
    VoiceGenerationRequest,
    VoiceGenerationOutput,
    VoiceProviderMetadata,
    "voice"
  >(
    "voice",
    (request) => ({
      providerName: request.provider ?? null,
      model: request.model ?? null,
      modelVersion: request.modelVersion ?? null,
      voiceId: request.voiceId,
      scriptVersion: request.scriptVersion,
      consentRecordId: request.consent.consentRecordId,
      consentVersion: request.consent.consentVersion,
    }),
    options,
  );
}
