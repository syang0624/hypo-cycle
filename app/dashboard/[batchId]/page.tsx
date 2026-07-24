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

const PHASE_LABELS: Record<string, string> = {
  strategizing: "Strategizing...",
  generating: "Generating variants...",
  generating_video: "Generating reels...",
  simulating: "Simulating campaign...",
  analyzing: "Analyzing results...",
  complete: "Complete",
  failed: "Failed",
};

export default function DashboardPage({
  params,
}: {
  params: { batchId: string };
}) {
  const { batchId } = params;
  return <LiveDashboard batchId={batchId} />;
}

/**
 * The campaign accumulates one WEEK (= one batch) at a time. The page renders a
 * stack of WeekSections for every batch the product has run so far — Week 1 on
 * top, each newly-generated week appended below with its own distinct reels.
 * Past weeks are frozen; the active week (the batchId in the URL) streams live.
 * "Run Next Week" generates the next batch and routes here under its id, so the
 * new week appears at the bottom while the earlier weeks stay put.
 */
function LiveDashboard({ batchId }: { batchId: string }) {
  const router = useRouter();
  const variants = useQuery(api.variants.listByBatch, { batchId }) as Variant[] | undefined;
  const metrics = useQuery(api.metrics.liveMetrics, { batchId }) as Metric[] | undefined;
  const status = useQuery(api.experiments.getStatus, { batchId });
  const reasoning = useQuery(api.agents.reasoningByBatch, { batchId });
  const allocations = useQuery(api.simulator.allocationsByBatch, { batchId });
  const startNextBatch = useMutation(api.experiments.startNextBatch);
  const [launchingNext, setLaunchingNext] = useState(false);

  // analystData (raw JSON string) feeds the DNA heatmap for the active week.
  const analystData = reasoning?.find((r) => r.agent === "analyst")?.data;

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
      router.push(`/dashboard/${newBatchId}`);
    } finally {
      setLaunchingNext(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="p-4 lg:p-6 pb-0">
        <header className="bg-card rounded-bento shadow-bento px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
                Hook<span className="text-primary">Loop</span>
              </h1>
              <span className="text-[13px] text-foreground/40 font-medium">
                Campaign · Week {weekNumber}
              </span>
            </div>
            {status === undefined || status === null ? (
              <span className="text-[13px] text-foreground/30">Loading...</span>
            ) : (
              <div className="flex items-center gap-3">
                {status.status === "running" && status.progress != null && (
                  <div className="w-24 h-1.5 bg-background rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${Math.round((status.progress as number) * 100)}%` }}
                    />
                  </div>
                )}
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[12px] font-semibold ${
                    isFailed
                      ? "bg-red-500/10 text-red-500"
                      : status.status === "running"
                        ? "bg-green-500/10 text-green-600"
                        : "bg-foreground/5 text-foreground/50"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isFailed
                        ? "bg-red-500"
                        : status.status === "running"
                          ? "bg-green-500 animate-pulse"
                          : "bg-foreground/30"
                    }`}
                  />
                  {phaseLabel ?? (status.status === "running" ? "Running" : "Complete")}
                </span>
                {isComplete && productId && !isLastWeek && (
                  <button
                    onClick={handleNextBatch}
                    disabled={launchingNext}
                    className="rounded-full bg-primary text-white px-4 py-1.5 text-[12px] font-semibold hover:bg-primary/90 transition-all duration-200 disabled:opacity-50"
                  >
                    {launchingNext ? "Starting..." : "Run Next Week ▸"}
                  </button>
                )}
                {isComplete && isLastWeek && (
                  <span className="rounded-full bg-green-500/10 text-green-600 px-4 py-1.5 text-[12px] font-semibold">
                    Campaign complete · 3 weeks
                  </span>
                )}
              </div>
            )}
          </div>
        </header>
      </div>

      {/* Error banner */}
      {isFailed && status?.error && (
        <div className="mx-4 lg:mx-6 mt-4">
          <div className="bg-red-50 rounded-bento p-5 flex items-start gap-3">
            <span className="text-red-500 text-lg flex-shrink-0">!</span>
            <div>
              <p className="text-[13px] font-semibold text-red-600">Experiment failed</p>
              <p className="text-[12px] text-red-500/70 mt-1">{status.error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-12 gap-4 lg:gap-5 p-4 lg:p-6">
        {/* Main — one section per week, stacked as the campaign progresses */}
        <main className="col-span-12 lg:col-span-8 space-y-5">
          {weeks === undefined ? (
            <div className="bg-card rounded-bento shadow-bento p-6">
              <div className="flex flex-col items-center py-12 text-foreground/30">
                <div className="w-12 h-12 rounded-full bg-background animate-pulse mb-4" />
                <p className="text-[13px] font-medium">Loading campaign…</p>
              </div>
            </div>
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
        <aside className="col-span-12 lg:col-span-4 space-y-4 lg:space-y-5">
          {weeks && weeks.length > 0 && (
            <BentoCard title="CPC by Week">
              <div className="flex items-end gap-3 h-28">
                {(() => {
                  const maxCpc = Math.max(...weeks.map((x) => x.avgCpc), 0.01);
                  return weeks.map((w) => {
                    const height = w.avgCpc > 0 ? (w.avgCpc / maxCpc) * 100 : 4;
                    return (
                      <div key={w.batchId} className="flex-1 flex flex-col items-center gap-1.5">
                        <span className="text-[11px] font-bold text-foreground">
                          {w.avgCpc > 0 ? `$${w.avgCpc.toFixed(2)}` : "—"}
                        </span>
                        <div
                          className={`w-full rounded-t-[8px] transition-all duration-500 ${
                            w.batchId === batchId ? "bg-primary" : "bg-primary/30"
                          }`}
                          style={{ height: `${height}%` }}
                        />
                        <span className="text-[10px] text-foreground/40 font-semibold">Wk {w.week}</span>
                      </div>
                    );
                  });
                })()}
              </div>
              <p className="text-[11px] text-foreground/40 text-center mt-3">
                Hunting for the lowest-CPC reel across weeks
              </p>
            </BentoCard>
          )}

          <BentoCard title={`Week ${weekNumber} · Budget Reallocation`}>
            {variants === undefined || metrics === undefined || !metricsStarted ? (
              <Skeleton lines={3} />
            ) : (
              <BudgetAllocator variants={variants} metrics={metrics} banditAllocations={allocations} />
            )}
          </BentoCard>

          <BentoCard title={`Week ${weekNumber} · Creative DNA`}>
            {variants === undefined || metrics === undefined || !metricsStarted ? (
              <Skeleton lines={4} />
            ) : (
              <DNAHeatmap variants={variants} metrics={metrics} analystData={analystData} />
            )}
          </BentoCard>

          <BentoCard title={`Week ${weekNumber} · Performance`}>
            {metrics === undefined || variants === undefined || !metricsStarted ? (
              <Skeleton lines={5} />
            ) : (
              <MetricsChart metrics={metrics} variants={variants} />
            )}
          </BentoCard>
        </aside>
      </div>
    </div>
  );
}

function BentoCard({
  title,
  accent,
  children,
}: {
  title: string;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-bento shadow-bento p-6">
      <h2 className={`text-[12px] font-semibold uppercase tracking-widest mb-5 ${
        accent ? "text-primary" : "text-foreground/35"
      }`}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function Skeleton({ lines }: { lines: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-[10px] bg-background h-4"
          style={{ width: `${70 + Math.random() * 30}%` }}
        />
      ))}
    </div>
  );
}
