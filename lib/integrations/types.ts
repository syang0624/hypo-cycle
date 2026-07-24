export const INTEGRATION_JOB_STATES = [
  "queued",
  "provisioning",
  "running",
  "evaluating",
  "complete",
  "failed",
  "cancelled",
] as const;

export type IntegrationJobState = (typeof INTEGRATION_JOB_STATES)[number];

export type IntegrationProvider =
  | "daytona"
  | "braintrust"
  | "fireworks"
  | "voice"
  | "coderabbit";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type ProviderMetadata = Record<string, JsonValue>;

export interface IntegrationUsage {
  readonly requests?: number;
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly totalTokens?: number;
  readonly computeMilliseconds?: number;
  readonly wallTimeMilliseconds?: number;
  readonly storageBytes?: number;
  readonly networkBytes?: number;
  readonly provider?: ProviderMetadata;
}

export interface CostComponent {
  readonly name: string;
  readonly amount: number;
  readonly unit?: string;
  readonly quantity?: number;
  readonly unitPrice?: number;
}

export interface IntegrationCost {
  readonly amount: number;
  readonly currency: string;
  readonly estimated: boolean;
  readonly components?: readonly CostComponent[];
  readonly provider?: ProviderMetadata;
}

export interface IntegrationProvenance {
  readonly provider: IntegrationProvider;
  readonly providerJobId?: string;
  readonly model?: string;
  readonly modelVersion?: string;
  readonly configurationVersion?: string;
  readonly environmentVersion?: string;
  readonly sourceRevision?: string;
  readonly inputVersion?: string;
  readonly idempotencyKey?: string;
  readonly createdAt: string;
  readonly providerMetadata?: ProviderMetadata;
}

export interface IntegrationError {
  readonly code: string;
  readonly message: string;
  readonly retryable: boolean;
  readonly providerCode?: string;
  readonly details?: ProviderMetadata;
}

export interface RetrySummary {
  readonly attempt: number;
  readonly maxAttempts: number;
  readonly nextRetryAt?: string;
  readonly lastAttemptAt?: string;
}

export interface CancellationSummary {
  readonly requestedAt: string;
  readonly reason?: string;
}

export interface IntegrationJob<
  TOutput,
  TProviderMetadata extends ProviderMetadata = ProviderMetadata,
> {
  readonly id: string;
  readonly state: IntegrationJobState;
  readonly submittedAt: string;
  readonly updatedAt: string;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly usage: IntegrationUsage;
  readonly cost: IntegrationCost;
  readonly provenance: IntegrationProvenance;
  readonly retry: RetrySummary;
  readonly cancellation?: CancellationSummary;
  readonly providerMetadata: TProviderMetadata;
  readonly output?: TOutput;
  readonly error?: IntegrationError;
}

export interface SubmitOptions {
  readonly idempotencyKey?: string;
}

export interface IntegrationAdapter<
  TRequest,
  TOutput,
  TProviderMetadata extends ProviderMetadata = ProviderMetadata,
  TProvider extends IntegrationProvider = IntegrationProvider,
> {
  readonly provider: TProvider;
  readonly adapterMode: "stub" | "live";
  submit(
    request: TRequest,
    options?: SubmitOptions,
  ): Promise<IntegrationJob<TOutput, TProviderMetadata>>;
  getJob(id: string): Promise<IntegrationJob<TOutput, TProviderMetadata>>;
  cancel(id: string, reason?: string): Promise<IntegrationJob<TOutput, TProviderMetadata>>;
}

export interface StubAdapterOptions {
  readonly now?: () => Date;
  readonly currency?: string;
}

function stableFingerprint(value: unknown): string {
  if (value === undefined) return '"[undefined]"';
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableFingerprint).join(",")}]`;
  return `{${Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableFingerprint(entry)}`)
    .join(",")}}`;
}

export function createStubAdapter<
  TRequest,
  TOutput,
  TProviderMetadata extends ProviderMetadata,
  TProvider extends IntegrationProvider,
>(
  provider: TProvider,
  createMetadata: (request: TRequest) => TProviderMetadata,
  options: StubAdapterOptions = {},
): IntegrationAdapter<TRequest, TOutput, TProviderMetadata, TProvider> {
  const jobs = new Map<string, IntegrationJob<TOutput, TProviderMetadata>>();
  const idempotencyIndex = new Map<string, { jobId: string; requestFingerprint: string }>();
  const now = options.now ?? (() => new Date());
  const currency = options.currency ?? "USD";
  let nextId = 1;

  const requireJob = (id: string): IntegrationJob<TOutput, TProviderMetadata> => {
    const job = jobs.get(id);
    if (!job) throw new Error(`Unknown ${provider} integration job: ${id}`);
    return job;
  };

  const snapshot = (
    job: IntegrationJob<TOutput, TProviderMetadata>,
  ): IntegrationJob<TOutput, TProviderMetadata> => structuredClone(job);

  return {
    provider,
    adapterMode: "stub",

    async submit(request, submitOptions) {
      const idempotencyKey = submitOptions?.idempotencyKey;
      const requestFingerprint = stableFingerprint(request);
      if (idempotencyKey) {
        const existing = idempotencyIndex.get(idempotencyKey);
        if (existing) {
          if (existing.requestFingerprint !== requestFingerprint) {
            throw new Error(
              `Idempotency key ${idempotencyKey} was already used for a different ${provider} request`,
            );
          }
          return snapshot(requireJob(existing.jobId));
        }
      }

      const submittedAt = now().toISOString();
      const id = `${provider}-stub-${nextId++}`;
      const job: IntegrationJob<TOutput, TProviderMetadata> = {
        id,
        state: "queued",
        submittedAt,
        updatedAt: submittedAt,
        usage: { requests: 0, provider: { stub: true } },
        cost: { amount: 0, currency, estimated: true, provider: { stub: true } },
        provenance: {
          provider,
          providerJobId: id,
          idempotencyKey,
          createdAt: submittedAt,
          providerMetadata: { stub: true },
        },
        retry: { attempt: 0, maxAttempts: 0 },
        providerMetadata: createMetadata(request),
      };
      jobs.set(id, job);
      if (idempotencyKey) {
        idempotencyIndex.set(idempotencyKey, { jobId: id, requestFingerprint });
      }
      return snapshot(job);
    },

    async getJob(id) {
      return snapshot(requireJob(id));
    },

    async cancel(id, reason) {
      const job = requireJob(id);
      if (job.state === "complete" || job.state === "failed" || job.state === "cancelled") {
        return snapshot(job);
      }

      const completedAt = now().toISOString();
      const cancelled: IntegrationJob<TOutput, TProviderMetadata> = {
        ...job,
        state: "cancelled",
        updatedAt: completedAt,
        completedAt,
        cancellation: {
          requestedAt: completedAt,
          ...(reason === undefined ? {} : { reason }),
        },
      };
      jobs.set(id, cancelled);
      return snapshot(cancelled);
    },
  };
}
