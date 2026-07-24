"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Variant, Metric } from "@/lib/types";
import WeekSection from "@/components/WeekSection";
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
  const [launchingNext, setLaunchingNext] = useState(false);

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

  const thisWeek = weeks?.find((w) => w.batchId === batchId) ?? null;
  const weekNumber = thisWeek?.week ?? 1;
  const isLastWeek = weekNumber >= 3;
  const metricsStarted = (metrics?.length ?? 0) > 0;

  async function handleNextBatch() {
    if (!productId || launchingNext) return;
    setLaunchingNext(true);
    try {
      const newBatchId = await startNextBatch({ productId, priorBatchId: batchId });
      // Route straight to the new week's dashboard so its live generation shows
      // in-place; the page re-renders with the new week appended to the stack.
      router.push(`/cycles/${newBatchId}`);
    } finally {
      setLaunchingNext(false);
    }
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

          {status === undefined || status === null ? (
            <span className="font-mono text-[11px] text-muted">loading…</span>
          ) : (
            <div className="flex items-center gap-3">
              {status.status === "running" && status.progress != null && (
                <div className="hidden md:block w-28 h-1 bg-inset rounded-full overflow-hidden">
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

      {/* Error banner */}
      {isFailed && status?.error && (
        <div className="mx-auto max-w-[1400px] px-5 mt-5">
          <div className="border border-bad/40 bg-bad/10 rounded-bento p-5 flex items-start gap-3">
            <span className="font-mono text-bad text-[14px] flex-shrink-0">✕</span>
            <div>
              <p className="text-[13px] font-semibold text-bad">Cycle failed</p>
              <p className="font-mono text-[12px] text-bad/70 mt-1">{status.error}</p>
            </div>
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
                  />
                );
              })
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
