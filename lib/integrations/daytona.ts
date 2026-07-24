import {
  createStubAdapter,
  type IntegrationAdapter,
  type ProviderMetadata,
  type StubAdapterOptions,
} from "./types";

export interface DaytonaExecutionRequest {
  executionId: string;
  repositoryUrl: string;
  sourceRevision: string;
  environmentImage: string;
  dependencyLockVersion?: string;
  inputSnapshotVersion: string;
  command: string[];
  nonSecretEnvironment?: Record<string, string>;
  secretReferences?: string[];
  resources?: {
    cpu?: number;
    memoryMb?: number;
    storageMb?: number;
    timeoutSeconds?: number;
  };
  networkPolicy?:
    | { mode: "deny_all" }
    | { mode: "allowlist"; allowedHosts: [string, ...string[]] }
    | { mode: "unrestricted" };
}

export interface DaytonaExecutionOutput {
  exitCode: number;
  artifactReferences: string[];
  logReference?: string;
}

export interface DaytonaProviderMetadata extends ProviderMetadata {
  sandboxId: string | null;
  environmentImage: string;
  sourceRevision: string;
  inputSnapshotVersion: string;
}

export interface DaytonaAdapter
  extends IntegrationAdapter<
    DaytonaExecutionRequest,
    DaytonaExecutionOutput,
    DaytonaProviderMetadata,
    "daytona"
  > {
  readonly provider: "daytona";
}

export function createDaytonaStub(options?: StubAdapterOptions): DaytonaAdapter {
  return createStubAdapter<
    DaytonaExecutionRequest,
    DaytonaExecutionOutput,
    DaytonaProviderMetadata,
    "daytona"
  >(
    "daytona",
    (request) => ({
      sandboxId: null,
      environmentImage: request.environmentImage,
      sourceRevision: request.sourceRevision,
      inputSnapshotVersion: request.inputSnapshotVersion,
    }),
    options,
  );
}
