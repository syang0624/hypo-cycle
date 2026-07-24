"use client";

import { FormEvent, useEffect, useState } from "react";
import { Chip } from "./ui";
import type {
  SandboxProductInput,
  SponsorConfiguration,
  SponsorCycleResult,
} from "@/lib/sandbox/types";

const DEFAULT_OBJECTIVE =
  "Reduce customer-support response time by at least 20% without lowering answer accuracy.";

const EMPTY_PRODUCT: SandboxProductInput = {
  name: "",
  landingUrl: "",
  valueProp: "",
  targetCustomer: "",
  pricing: "",
  painPoint: "",
};

const SAMPLE_PRODUCT: SandboxProductInput = {
  name: "Relay Support Copilot",
  landingUrl: "https://example.com/relay",
  valueProp: "An AI copilot that drafts accurate support replies from company knowledge.",
  targetCustomer: "Support leaders at growing B2B software companies",
  pricing: "$49 per agent each month",
  painPoint: "Response times increase as ticket volume grows, while rushed answers reduce accuracy.",
};

const CYCLE_STAGES = [
  ["01", "Hypothesize", "Generate falsifiable candidates"],
  ["02", "Execute", "Run evaluation in isolation"],
  ["03", "Evaluate", "Score evidence and select a winner"],
] as const;

export default function SandboxRunner() {
  const [product, setProduct] = useState<SandboxProductInput>(EMPTY_PRODUCT);
  const [objective, setObjective] = useState(DEFAULT_OBJECTIVE);
  const [configuration, setConfiguration] = useState<SponsorConfiguration | null>(null);
  const [result, setResult] = useState<SponsorCycleResult | null>(null);
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);

  useEffect(() => {
    fetch("/api/sandbox/run")
      .then((response) => response.json())
      .then((value: SponsorConfiguration) => setConfiguration(value))
      .catch(() =>
        setConfiguration({
          daytona: false,
          fireworks: false,
          braintrust: false,
          ready: false,
        }),
      );
  }, []);

  async function run(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!productComplete) return;
    setRunning(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/sandbox/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objective, product }),
      });
      const value = (await response.json()) as SponsorCycleResult | { error?: string };
      if (!response.ok) {
        throw new Error("error" in value ? value.error : "The live run failed.");
      }
      setResult(value as SponsorCycleResult);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "The live run failed.");
    } finally {
      setRunning(false);
    }
  }

  const configuredCount = configuration
    ? [configuration.daytona, configuration.fireworks, configuration.braintrust].filter(Boolean)
        .length
    : 0;
  const productComplete = Object.values(product).every(
    (value) => value.trim().length > 0,
  );

  function updateProduct(field: keyof SandboxProductInput, value: string) {
    setProduct((current) => ({ ...current, [field]: value }));
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 pb-0 lg:p-6 lg:pb-0">
        <header className="rounded-bento bg-card px-6 py-4 shadow-bento">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
                Hypo<span className="text-primary">Cycle</span>
              </h1>
              <span className="text-foreground/20">|</span>
              <span className="text-[13px] font-medium text-foreground/50">
                Live Experiment Sandbox
              </span>
            </div>
            <Chip
              tone={
                configuration === null
                  ? "muted"
                  : configuration.ready
                    ? "good"
                    : "warn"
              }
              pulse={running || configuration?.ready === true}
            >
              {running
                ? "Experiment running"
                : configuration === null
                  ? "Checking providers"
                  : configuration.ready
                    ? "Ready to run"
                    : "Setup required"}
            </Chip>
          </div>
        </header>
      </div>

      <div className="p-4 lg:p-6">
        <div className="grid grid-cols-12 gap-5">
          <main className="col-span-12 space-y-5 lg:col-span-8">
            <section className="rounded-bento bg-card p-6 shadow-bento">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-[13px] font-bold text-white">
                  1
                </div>
                <div>
                  <h2 className="font-display text-[16px] font-bold text-foreground">
                    Define the product and experiment
                  </h2>
                  <p className="text-[12px] text-foreground/40">
                    Product context · measurable objective · evidence-backed decision
                  </p>
                </div>
              </div>

              <form onSubmit={run} className="space-y-5">
                <div className="rounded-[14px] bg-background p-4">
                  <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-widest text-primary/60">
                        Product details
                      </span>
                      <p className="mt-1 text-[11px] text-foreground/35">
                        Used as context for live hypothesis generation.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setProduct(SAMPLE_PRODUCT)}
                      className="self-start rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/10 sm:self-auto"
                    >
                      Use sample product
                    </button>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <ProductField
                      label="Product name"
                      value={product.name}
                      placeholder="e.g. Relay Support Copilot"
                      onChange={(value) => updateProduct("name", value)}
                    />
                    <ProductField
                      label="Landing page URL"
                      value={product.landingUrl}
                      placeholder="https://..."
                      type="url"
                      onChange={(value) => updateProduct("landingUrl", value)}
                    />
                    <ProductField
                      label="Value proposition"
                      value={product.valueProp}
                      placeholder="What does the product do?"
                      multiline
                      onChange={(value) => updateProduct("valueProp", value)}
                    />
                    <ProductField
                      label="Target customer"
                      value={product.targetCustomer}
                      placeholder="Who is it for?"
                      multiline
                      onChange={(value) => updateProduct("targetCustomer", value)}
                    />
                    <ProductField
                      label="Pricing"
                      value={product.pricing}
                      placeholder="e.g. $49/month"
                      onChange={(value) => updateProduct("pricing", value)}
                    />
                    <ProductField
                      label="Customer pain point"
                      value={product.painPoint}
                      placeholder="What problem needs solving?"
                      multiline
                      onChange={(value) => updateProduct("painPoint", value)}
                    />
                  </div>
                </div>

                <label className="block rounded-[14px] bg-background p-4">
                  <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-primary/60">
                    Optimization objective
                  </span>
                  <textarea
                    value={objective}
                    onChange={(event) => setObjective(event.target.value)}
                    maxLength={500}
                    rows={4}
                    className="w-full resize-none border-0 bg-transparent text-[14px] leading-relaxed text-foreground outline-none placeholder:text-foreground/25"
                  />
                  <span className="mt-2 block text-right font-mono text-[9px] text-foreground/25">
                    {objective.length}/500
                  </span>
                </label>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button
                    type="submit"
                    disabled={
                      running ||
                      configuration?.ready !== true ||
                      !productComplete ||
                      objective.trim().length < 12
                    }
                    className="rounded-lg bg-primary px-6 py-3 text-[13px] font-semibold text-white shadow-glow transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {running ? "Running experiment…" : "Run live experiment →"}
                  </button>
                  <p className="max-w-sm font-mono text-[10px] leading-relaxed text-foreground/35">
                    {!productComplete
                      ? "Complete every product field to enable the live run."
                      : "Uses paid provider calls and deletes the ephemeral runtime after execution."}
                  </p>
                </div>
              </form>
            </section>

            <section className="rounded-bento bg-card p-6 shadow-bento">
              <div className="mb-5 flex items-center justify-between gap-3">
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-foreground/30">
                  Experiment evidence
                </h2>
                {result && <Chip tone="good">Run complete</Chip>}
                {error && <Chip tone="bad">Run failed</Chip>}
              </div>

              {running ? (
                <RunningState />
              ) : error ? (
                <div className="rounded-[14px] border border-bad/20 bg-bad/5 p-5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-bad/70">
                    Execution error
                  </p>
                  <p className="mt-2 font-mono text-[12px] leading-relaxed text-bad">
                    {error}
                  </p>
                </div>
              ) : result ? (
                <ResultView result={result} />
              ) : (
                <EmptyEvidence />
              )}
            </section>

            {result && (
              <section className="rounded-bento bg-primary/5 p-6">
                <p className="text-[11px] font-bold uppercase tracking-widest text-primary/50">
                  Final conclusion
                </p>
                <h2 className="mt-3 font-display text-[18px] font-bold text-foreground">
                  {result.winner.name}
                </h2>
                <p className="mt-2 text-[14px] leading-relaxed text-foreground/70">
                  {result.winner.hypothesis}
                </p>
                <p className="mt-3 font-mono text-[11px] leading-relaxed text-muted">
                  Reject if: {result.winner.falsifier}
                </p>
              </section>
            )}
          </main>

          <aside className="col-span-12 space-y-5 lg:col-span-4">
            <section className="rounded-bento bg-card p-6 shadow-bento">
              <h2 className="mb-4 text-[11px] font-bold uppercase tracking-widest text-foreground/30">
                Provider readiness
              </h2>
              <div className="space-y-3">
                <ReadinessRow label="Daytona" role="Isolated execution" ready={configuration?.daytona} />
                <ReadinessRow label="Fireworks AI" role="Hypothesis generation" ready={configuration?.fireworks} />
                <ReadinessRow label="Braintrust" role="Evidence tracing" ready={configuration?.braintrust} />
                <div className="flex items-center justify-between border-t border-foreground/5 pt-3">
                  <div>
                    <p className="text-[12px] font-semibold text-foreground/60">CodeRabbit</p>
                    <p className="text-[10px] text-foreground/30">PR review boundary</p>
                  </div>
                  <Chip tone="info">External</Chip>
                </div>
              </div>
              <div
                className={`mt-5 rounded-[12px] p-3 text-center ${
                  configuration?.ready ? "bg-good/10" : "bg-warn/10"
                }`}
              >
                <span
                  className={`text-[11px] font-semibold ${
                    configuration?.ready ? "text-good" : "text-warn"
                  }`}
                >
                  {configuration === null
                    ? "Checking server configuration…"
                    : `${configuredCount}/3 runtime providers configured`}
                </span>
              </div>
            </section>

            {productComplete && (
              <section className="rounded-bento bg-card p-6 shadow-bento">
                <h2 className="mb-4 text-[11px] font-bold uppercase tracking-widest text-foreground/30">
                  Product context
                </h2>
                <p className="font-display text-[16px] font-bold text-foreground">
                  {product.name}
                </p>
                <p className="mt-2 text-[12px] leading-relaxed text-foreground/45">
                  {product.valueProp}
                </p>
                <div className="mt-4 space-y-2 border-t border-foreground/5 pt-4">
                  <ContextRow label="Customer" value={product.targetCustomer} />
                  <ContextRow label="Pricing" value={product.pricing} />
                </div>
              </section>
            )}

            <section className="rounded-bento bg-card p-6 shadow-bento">
              <h2 className="mb-4 text-[11px] font-bold uppercase tracking-widest text-foreground/30">
                Experiment cycle
              </h2>
              <div className="space-y-4">
                {CYCLE_STAGES.map(([number, label, detail], index) => (
                  <div key={number} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full font-mono text-[9px] font-bold ${
                          result
                            ? "bg-good text-background"
                            : running && index === 0
                              ? "bg-primary text-white"
                              : "bg-background text-foreground/35"
                        }`}
                      >
                        {result ? "✓" : number}
                      </span>
                      {index < CYCLE_STAGES.length - 1 && (
                        <span className="mt-1 h-5 w-px bg-foreground/10" />
                      )}
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-foreground/70">
                        {label}
                      </p>
                      <p className="mt-0.5 text-[10px] leading-relaxed text-foreground/30">
                        {detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-bento bg-card p-6 shadow-bento">
              <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-foreground/30">
                Safety boundary
              </h2>
              <p className="text-[12px] leading-relaxed text-foreground/45">
                Credentials stay server-side. Every runtime is temporary and deleted
                after the experiment finishes.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

function ProductField({
  label,
  value,
  placeholder,
  type = "text",
  multiline = false,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  type?: "text" | "url";
  multiline?: boolean;
  onChange: (value: string) => void;
}) {
  const className =
    "mt-1.5 w-full rounded-lg border border-foreground/10 bg-card px-3 py-2.5 text-[12px] leading-relaxed text-foreground outline-none transition-colors placeholder:text-foreground/20 focus:border-primary/60";

  return (
    <label className="block">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-foreground/35">
        {label}
      </span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          maxLength={300}
          rows={2}
          required
          className={`${className} resize-none`}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          maxLength={300}
          required
          className={className}
        />
      )}
    </label>
  );
}

function ContextRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-[11px] text-foreground/30">{label}</span>
      <span className="text-right text-[11px] font-semibold text-foreground/60">
        {value}
      </span>
    </div>
  );
}

function EmptyEvidence() {
  return (
    <div className="flex min-h-[300px] items-center justify-center rounded-[14px] border border-dashed border-foreground/10 bg-background/50 p-8 text-center">
      <div>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-xl text-primary">
          ◇
        </div>
        <p className="mt-4 font-display text-[16px] font-bold text-foreground">
          Evidence will appear here
        </p>
        <p className="mx-auto mt-2 max-w-sm text-[12px] leading-relaxed text-foreground/35">
          Submit an objective to generate hypotheses, evaluate them in an isolated
          sandbox, and select a winner.
        </p>
      </div>
    </div>
  );
}

function RunningState() {
  const labels = [
    "Generating candidates with Fireworks",
    "Provisioning isolated Daytona runtime",
    "Evaluating falsifiability",
    "Flushing evidence to Braintrust",
  ];

  return (
    <div className="space-y-3 py-5">
      {labels.map((label, index) => (
        <div
          key={label}
          className="flex items-center gap-3 rounded-[12px] bg-background p-3 font-mono text-[11px] text-muted"
          style={{ animationDelay: `${index * 180}ms` }}
        >
          <span className="animate-blink text-primary">▸</span>
          {label}
        </div>
      ))}
    </div>
  );
}

function ReadinessRow({
  label,
  role,
  ready,
}: {
  label: string;
  role: string;
  ready?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-[12px] font-semibold text-foreground/60">{label}</p>
        <p className="text-[10px] text-foreground/30">{role}</p>
      </div>
      {ready === undefined ? (
        <Chip tone="muted">Checking</Chip>
      ) : (
        <Chip tone={ready ? "good" : "bad"}>{ready ? "Ready" : "Missing"}</Chip>
      )}
    </div>
  );
}

function ResultView({ result }: { result: SponsorCycleResult }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <ResultStat label="Run" value={result.runId.slice(0, 8)} />
        <ResultStat label="Sandbox" value={result.sandboxId.slice(0, 8)} />
        <ResultStat label="Duration" value={`${(result.durationMs / 1000).toFixed(1)}s`} />
        <ResultStat label="Winner" value={`${result.winner.score}/100`} good />
      </div>

      <div className="rounded-[14px] bg-good/5 p-5 ring-1 ring-good/20">
        <Chip tone="good">Selected hypothesis</Chip>
        <h3 className="mt-3 font-display text-[16px] font-bold text-foreground">
          {result.winner.name}
        </h3>
        <p className="mt-2 text-[13px] leading-relaxed text-foreground/70">
          {result.winner.hypothesis}
        </p>
      </div>

      <div>
        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-foreground/25">
          Provider trace
        </p>
        <div className="space-y-2.5">
          {result.stages.map((stage) => (
            <div
              key={stage.provider}
              className="flex gap-3 rounded-[12px] bg-background p-3"
            >
              <span
                className={`mt-1 h-2 w-2 flex-none rounded-full ${
                  stage.state === "complete" ? "bg-good" : "bg-info"
                }`}
              />
              <div className="min-w-0">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-foreground">
                  {stage.provider} · {stage.label}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted">
                  {stage.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <details className="rounded-[12px] bg-background p-4">
        <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-wider text-muted">
          Raw sandbox output
        </summary>
        <pre className="mt-3 max-h-44 overflow-auto whitespace-pre-wrap break-all font-mono text-[10px] leading-relaxed text-good/80">
          {result.sandboxOutput}
        </pre>
      </details>
    </div>
  );
}

function ResultStat({
  label,
  value,
  good = false,
}: {
  label: string;
  value: string;
  good?: boolean;
}) {
  return (
    <div className="rounded-[12px] bg-background p-3">
      <span className="block text-[9px] font-semibold uppercase tracking-wide text-foreground/30">
        {label}
      </span>
      <span className={`text-[16px] font-bold ${good ? "text-good" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}
