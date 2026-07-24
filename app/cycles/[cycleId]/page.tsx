"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Variant, Metric } from "@/lib/types";
import WeekSection from "@/components/WeekSection";
import CycleTimeline from "@/components/CycleTimeline";
import BudgetAllocator from "@/components/BudgetAllocator";
import DNAHeatmap from "@/components/DNAHeatmap";
import MetricsChart from "@/components/MetricsChart";
import { Logo, Panel, Chip, SimBadge, Skeleton } from "@/components/ui";

const PHASE_LABELS: Record<string, string> = {
  strategizing: "Hypothesizing",
  generating: "Building variants",
  generating_video: "Producing reels",
  simulating: "Simulating",
  analyzing: "Evaluating",
  complete: "Complete",
  failed: "Failed",
};

export default function CyclePage({
  params,
}: {
  params: { cycleId: string };
}) {
  // A cycle is the HypoCycle name for a batch (PRD §19); the legacy backend
  // still keys everything by batchId, so the ids are interchangeable until
  // Nori lands the generic cycle model.
  const { cycleId } = params;
  return <LiveDashboard batchId={cycleId} />;
}

/**
 * The campaign accumulates one WEEK (= one batch) at a time. The page renders a
 * stack of WeekSections for every batch the product has run so far — newest on
 * top, each newly-generated week appended with its own distinct reels. Past
 * weeks are frozen; the active week (the batchId in the URL) streams live.
 * "Run Next Week" generates the next batch and routes here under its id.
 */
function LiveDashboard({ batchId }: { batchId: string }) {
  const router = useRouter();
  const variants = useQuery(api.variants.listByBatch, { batchId }) as Variant[] | undefined;
  const metrics = useQuery(api.metrics.liveMetrics, { batchId }) as Metric[] | undefined;
  const status = useQuery(api.experiments.getStatus, { batchId });
  const rationale = useQuery(api.agents.reasoningByBatch, { batchId });
  const allocations = useQuery(api.simulator.allocationsByBatch, { batchId });
  const startNextBatch = useMutation(api.experiments.startNextBatch);
  const startBatch = useMutation(api.experiments.startBatch);
  const [launchingNext, setLaunchingNext] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Remember the most recent valid cycle so the landing page can offer
  // "Resume campaign" after a closed tab.
  useEffect(() => {
    if (status) {
      try {
        localStorage.setItem(
          "hypocycle:lastCycle",
          JSON.stringify({ id: batchId, at: new Date().toISOString() }),
        );
      } catch {
        // Private mode or blocked storage — resume is best-effort.
      }
    }
  }, [status, batchId]);

  // analystData (raw JSON string) feeds the DNA heatmap for the active week.
  const analystData = rationale?.find((r) => r.agent === "analyst")?.data;

  const phase = status?.phase ?? (status?.status === "complete" ? "complete" : undefined);
  const phaseLabel = phase ? PHASE_LABELS[phase] ?? phase : undefined;
  const isFailed = status?.status === "failed";
  const isComplete = phase === "complete";
  // Prefer the run's productId (available immediately) so the week stack shows
  // even before this batch has generated any variants. Fall back to variants.
  const productId = status?.productId ?? variants?.[0]?.productId;

  const weeks = useQuery(
    api.experiments.weeksByProduct,
    productId ? { productId } : "skip",
  );
  // Product row supplies the guardrail limits (target CAC, max CPC) for the
  // evidence reports.
  const product = useQuery(
    api.products.getById,
    productId ? { productId } : "skip",
  );

  const thisWeek = weeks?.find((w) => w.batchId === batchId) ?? null;
  const weekNumber = thisWeek?.week ?? 1;
  const isLastWeek = weekNumber >= 3;
  const metricsStarted = (metrics?.length ?? 0) > 0;

  async function handleNextBatch() {
    if (!productId || launchingNext) return;
    setLaunchingNext(true);
    setActionError(null);
    try {
      const newBatchId = await startNextBatch({ productId, priorBatchId: batchId });
      // Route straight to the new week's dashboard so its live generation shows
      // in-place; the page re-renders with the new week appended to the stack.
      router.push(`/cycles/${newBatchId}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not start the next week.");
    } finally {
      setLaunchingNext(false);
    }
  }

  // Retry a failed cycle: week 1 restarts the campaign from the product; later
  // weeks re-derive from the last good week so prior evidence is kept.
  async function handleRetry() {
    if (!productId || retrying) return;
    setRetrying(true);
    try {
      const priorBatchId = weekNumber > 1 ? weeks?.[weekNumber - 2]?.batchId : undefined;
      const newBatchId = priorBatchId
        ? await startNextBatch({ productId, priorBatchId })
        : await startBatch({ productId });
      router.push(`/launch/${newBatchId}`);
    } finally {
      setRetrying(false);
    }
  }

  // The backend answered and doesn't know this cycle — dead link or stale id.
  if (status === null) {
    return (
      <div className="min-h-screen bg-background bg-grid flex items-center justify-center p-6">
        <div className="border border-line rounded-bento bg-panel p-8 max-w-md text-center">
          <p className="font-mono text-[13px] text-muted mb-2">404 · cycle not found</p>
          <p className="text-[14px] text-foreground/80 mb-6">
            This cycle id doesn&apos;t exist — it may belong to a cleared deployment.
          </p>
          <Link
            href="/programs/new"
            className="inline-block rounded-lg bg-primary text-white px-5 py-2.5 text-[13px] font-semibold hover:bg-primary/90 transition-colors"
          >
            Start a new program
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Command bar */}
      <header className="sticky top-0 z-40 border-b border-line bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-[1400px] px-5 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Logo />
            <span className="hidden sm:block font-mono text-[11px] text-muted truncate">
              program/ad-creative · week {weekNumber}
            </span>
            <SimBadge />
          </div>

          {status === undefined ? (
            <span className="font-mono text-[11px] text-muted">loading…</span>
          ) : (
            <div className="flex items-center gap-3" aria-live="polite">
              {status.status === "running" && status.progress != null && (
                <div
                  className="hidden md:block w-28 h-1 bg-inset rounded-full overflow-hidden"
                  role="progressbar"
                  aria-valuenow={Math.round((status.progress as number) * 100)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Cycle progress"
                >
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${Math.round((status.progress as number) * 100)}%` }}
                  />
                </div>
              )}
              <Chip
                tone={isFailed ? "bad" : status.status === "running" ? "info" : "good"}
                pulse={status.status === "running"}
              >
                {phaseLabel ?? (status.status === "running" ? "Running" : "Complete")}
              </Chip>
              {isComplete && productId && !isLastWeek && (
                <button
                  onClick={handleNextBatch}
                  disabled={launchingNext}
                  className="rounded-lg bg-primary text-white px-4 py-2 text-[12px] font-semibold hover:bg-primary/90 shadow-glow transition-all disabled:opacity-50"
                >
                  {launchingNext ? "Starting…" : "Run next week →"}
                </button>
              )}
              {isComplete && isLastWeek && (
                <Chip tone="good">Campaign complete · 3 weeks</Chip>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Action error (e.g. "Run next week" rejected) */}
      {actionError && (
        <div className="mx-auto max-w-[1400px] px-5 mt-5">
          <div className="border border-bad/40 bg-bad/10 rounded-bento px-5 py-3 flex items-center justify-between gap-3">
            <p className="font-mono text-[12px] text-bad truncate">{actionError}</p>
            <button
              onClick={() => setActionError(null)}
              aria-label="Dismiss error"
              className="text-bad/60 hover:text-bad font-mono text-[14px]"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Error banner */}
      {isFailed && (
        <div className="mx-auto max-w-[1400px] px-5 mt-5">
          <div className="border border-bad/40 bg-bad/10 rounded-bento p-5 flex items-start gap-3">
            <span className="font-mono text-bad text-[14px] flex-shrink-0">✕</span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-bad">
                Week {weekNumber} failed
              </p>
              <p className="font-mono text-[12px] text-bad/70 mt-1">
                {status?.error ?? "The cycle stopped unexpectedly."}
              </p>
            </div>
            {productId && (
              <button
                onClick={handleRetry}
                disabled={retrying}
                className="flex-shrink-0 rounded-lg border border-bad/50 px-4 py-2 text-[12px] font-semibold text-bad hover:bg-bad/10 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bad/50"
              >
                {retrying ? "Restarting…" : "Retry week →"}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="mx-auto max-w-[1400px] grid grid-cols-12 gap-5 px-5 py-6">
        {/* Main — one section per week, stacked as the campaign progresses */}
        <main className="col-span-12 lg:col-span-8 space-y-5">
          {weeks === undefined ? (
            <Panel title="Campaign">
              <Skeleton lines={5} />
            </Panel>
          ) : (
            // Newest week on top. `weeks` is chronological (week = index+1), so
            // each week's delta still references its chronological predecessor.
            weeks
              .slice()
              .reverse()
              .map((w) => {
                const prev = w.week > 1 ? weeks[w.week - 2] : null;
                return (
                  <WeekSection
                    key={w.batchId}
                    batchId={w.batchId}
                    week={w.week}
                    prevCpc={prev?.avgCpc ?? null}
                    prevCac={prev?.avgCac ?? null}
                    isActive={w.batchId === batchId}
                    targetCac={product?.targetCAC}
                    maxCpc={product?.maxCPC}
                  />
                );
              })
          )}

          {/* Cycle timeline — the loop's lineage, hypothesis → evidence →
              directive → next hypothesis (PRD §17.9) */}
          {weeks && weeks.length > 0 && (
            <Panel title="Cycle timeline" tone="primary">
              <CycleTimeline weeks={weeks} activeBatchId={batchId} />
            </Panel>
          )}
        </main>

        {/* Sidebar — cross-week trend + this week's live analytics */}
        <aside className="col-span-12 lg:col-span-4 space-y-5">
          {weeks && weeks.length > 0 && (
            <Panel title="CPC by week" tone="primary">
              <div className="flex items-end gap-3 h-28">
                {(() => {
                  const maxCpc = Math.max(...weeks.map((x) => x.avgCpc), 0.01);
                  return weeks.map((w) => {
                    const height = w.avgCpc > 0 ? (w.avgCpc / maxCpc) * 100 : 4;
                    return (
                      <div key={w.batchId} className="flex-1 flex flex-col items-center gap-1.5">
                        <span className="font-mono text-[11px] font-bold text-foreground">
                          {w.avgCpc > 0 ? `$${w.avgCpc.toFixed(2)}` : "—"}
                        </span>
                        <div
                          className={`w-full rounded-t-[4px] transition-all duration-500 ${
                            w.batchId === batchId ? "bg-primary" : "bg-primary/25"
                          }`}
                          style={{ height: `${height}%` }}
                        />
                        <span className="font-mono text-[10px] text-muted">wk{w.week}</span>
                      </div>
                    );
                  });
                })()}
              </div>
              <p className="font-mono text-[10px] text-muted/70 text-center mt-3">
                hunting the lowest-CPC reel · simulated data
              </p>
            </Panel>
          )}

          <Panel title={`Week ${weekNumber} · Budget allocation`}>
            {variants === undefined || metrics === undefined || !metricsStarted ? (
              <Skeleton lines={3} />
            ) : (
              <BudgetAllocator variants={variants} metrics={metrics} banditAllocations={allocations} />
            )}
          </Panel>

          <Panel title={`Week ${weekNumber} · Creative DNA`}>
            {variants === undefined || metrics === undefined || !metricsStarted ? (
              <Skeleton lines={4} />
            ) : (
              <DNAHeatmap variants={variants} metrics={metrics} analystData={analystData} />
            )}
          </Panel>

          <Panel title={`Week ${weekNumber} · Performance`}>
            {metrics === undefined || variants === undefined || !metricsStarted ? (
              <Skeleton lines={5} />
            ) : (
              <MetricsChart metrics={metrics} variants={variants} />
            )}
          </Panel>
        </aside>
      </div>
    </div>
  );
}
