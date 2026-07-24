import { Daytona, type Sandbox } from "@daytona/sdk";
import { initLogger } from "braintrust";
import OpenAI from "openai";
import type {
  SandboxCandidate,
  SandboxProductInput,
  SponsorCycleResult,
  SponsorStage,
} from "./types";

const FIREWORKS_BASE_URL = "https://api.fireworks.ai/inference/v1";
const DEFAULT_FIREWORKS_MODEL = "accounts/fireworks/models/kimi-k2p6";
const DEFAULT_BRAINTRUST_PROJECT = "hypocycle-sandbox";

type GeneratedCandidate = Omit<SandboxCandidate, "score">;

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured on the server.`);
  return value;
}

function parseCandidateResponse(content: string): GeneratedCandidate[] {
  const normalized = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  const parsed = JSON.parse(normalized) as { candidates?: unknown };
  if (!Array.isArray(parsed.candidates) || parsed.candidates.length !== 3) {
    throw new Error("Fireworks did not return exactly three candidates.");
  }

  return parsed.candidates.map((candidate, index) => {
    if (candidate === null || typeof candidate !== "object") {
      throw new Error(`Fireworks candidate ${index + 1} is invalid.`);
    }
    const value = candidate as Record<string, unknown>;
    const fields = ["name", "hypothesis", "prediction", "falsifier"] as const;
    for (const field of fields) {
      if (typeof value[field] !== "string" || value[field].trim().length === 0) {
        throw new Error(`Fireworks candidate ${index + 1} is missing ${field}.`);
      }
    }
    return {
      name: (value.name as string).trim(),
      hypothesis: (value.hypothesis as string).trim(),
      prediction: (value.prediction as string).trim(),
      falsifier: (value.falsifier as string).trim(),
    };
  });
}

function buildEvaluatorCode(
  objective: string,
  product: SandboxProductInput,
  candidates: GeneratedCandidate[],
): string {
  const input = JSON.stringify({ objective, product, candidates });
  return `
const input = ${input};
const evidenceWords = /\\b(by|within|at least|less than|greater than|increase|decrease|percent|%|seconds?|minutes?|hours?|days?)\\b/i;
const falsifierWords = /\\b(fail|refut|reject|disprov|not|below|above|worse|no change)\\b/i;

const scored = input.candidates.map((candidate) => {
  const combined = [
    candidate.hypothesis,
    candidate.prediction,
    candidate.falsifier,
  ].join(" ");
  const testability = evidenceWords.test(combined) ? 35 : 15;
  const falsifiability = falsifierWords.test(candidate.falsifier) ? 35 : 12;
  const specificity = Math.min(20, Math.round(new Set(
    combined.toLowerCase().match(/[a-z0-9]+/g) || []
  ).size / 3));
  const concision = combined.length <= 520 ? 10 : 5;

  return {
    ...candidate,
    score: testability + falsifiability + specificity + concision,
  };
}).sort((left, right) => right.score - left.score);

console.log(JSON.stringify({
  runtime: process.version,
  isolated: true,
  networkPolicy: "deny_all",
  objective: input.objective,
  candidates: scored,
}));
`;
}

function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unknown sponsor workflow error.";
}

export async function runSponsorCycle(
  objective: string,
  product: SandboxProductInput,
): Promise<SponsorCycleResult> {
  const daytonaApiKey = requiredEnvironment("DAYTONA_API_KEY");
  const fireworksApiKey = requiredEnvironment("FIREWORKS_API_KEY");
  const braintrustApiKey = requiredEnvironment("BRAINTRUST_API_KEY");
  const model = process.env.FIREWORKS_MODEL?.trim() || DEFAULT_FIREWORKS_MODEL;
  const runId = crypto.randomUUID();
  const startedAt = Date.now();
  const stages: SponsorStage[] = [];
  let sandbox: Sandbox | undefined;

  const logger = initLogger({
    apiKey: braintrustApiKey,
    projectName:
      process.env.BRAINTRUST_PROJECT_NAME?.trim() || DEFAULT_BRAINTRUST_PROJECT,
    setCurrent: false,
  });

  return logger.traced(
    async (span) => {
      span.log({
        input: { objective, product },
        metadata: { runId, workflow: "sponsor-sandbox-cycle" },
        tags: ["live", "daytona", "fireworks"],
      });

      try {
        const fireworks = new OpenAI({
          apiKey: fireworksApiKey,
          baseURL: FIREWORKS_BASE_URL,
        });
        const completion = await fireworks.chat.completions.create({
          model,
          temperature: 0.4,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "Design exactly three concise, falsifiable experiment candidates. Return JSON only with a candidates array. Every candidate must have string fields: name, hypothesis, prediction, falsifier. Predictions must contain a measurable threshold and falsifiers must state a clear rejection condition.",
            },
            {
              role: "user",
              content: [
                "Product context:",
                `Name: ${product.name}`,
                `Landing page: ${product.landingUrl}`,
                `Value proposition: ${product.valueProp}`,
                `Target customer: ${product.targetCustomer}`,
                `Pricing: ${product.pricing}`,
                `Customer pain point: ${product.painPoint}`,
                "",
                `Experiment objective: ${objective}`,
              ].join("\n"),
            },
          ],
        });
        const content = completion.choices[0]?.message.content;
        if (!content) throw new Error("Fireworks returned an empty response.");
        const generatedCandidates = parseCandidateResponse(content);
        stages.push({
          provider: "fireworks",
          label: "Hypothesis generation",
          state: "complete",
          detail: `${generatedCandidates.length} candidates generated with ${model}.`,
        });

        const daytona = new Daytona({ apiKey: daytonaApiKey });
        sandbox = await daytona.create(
          {
            language: "javascript",
            ephemeral: true,
            ttlMinutes: 10,
            networkBlockAll: true,
            labels: {
              app: "hypocycle",
              runId,
            },
          },
          { timeout: 90 },
        );

        const execution = await sandbox.process.codeRun(
          buildEvaluatorCode(objective, product, generatedCandidates),
          undefined,
          30,
        );
        if (execution.exitCode !== 0) {
          throw new Error(
            `Daytona evaluator exited with code ${execution.exitCode}: ${execution.result}`,
          );
        }

        const sandboxResult = JSON.parse(execution.result.trim()) as {
          candidates?: SandboxCandidate[];
        };
        if (!Array.isArray(sandboxResult.candidates) || sandboxResult.candidates.length !== 3) {
          throw new Error("Daytona returned an invalid evaluation result.");
        }
        const candidates = sandboxResult.candidates;
        const winner = candidates[0];
        stages.push({
          provider: "daytona",
          label: "Isolated evaluation",
          state: "complete",
          detail: `Sandbox ${sandbox.id} ran with outbound networking blocked.`,
          reference: sandbox.id,
        });

        const durationMs = Date.now() - startedAt;
        span.log({
          output: { winner, candidates },
          scores: { winner_quality: winner.score / 100 },
          metrics: { duration: durationMs / 1000 },
          metadata: { sandboxId: sandbox.id, model },
        });
        await logger.flush();
        stages.push({
          provider: "braintrust",
          label: "Trace and evaluation",
          state: "complete",
          detail: `Run ${runId} was flushed to Braintrust.`,
          reference: span.id,
        });
        stages.push({
          provider: "coderabbit",
          label: "Adoption review",
          state: "external",
          detail:
            "Ready when this experiment produces a pull request; CodeRabbit reviews the repository diff at that boundary.",
        });

        return {
          runId,
          product,
          objective,
          model,
          sandboxId: sandbox.id,
          durationMs,
          candidates,
          winner,
          sandboxOutput: execution.result.trim(),
          stages,
        };
      } catch (error) {
        span.log({ error: safeErrorMessage(error), metadata: { runId } });
        throw error;
      } finally {
        if (sandbox) {
          const daytona = new Daytona({ apiKey: daytonaApiKey });
          await daytona.delete(sandbox, 60, true).catch(() => undefined);
        }
        await logger.flush().catch(() => undefined);
      }
    },
    { name: "run-sponsor-sandbox-cycle" },
  );
}
