"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Hypothesis, Variant, Metric, AnalystData } from "@/lib/types";
import VariantCard from "./VariantCard";
import HypothesisList from "./HypothesisList";
import WeeklyReport from "./WeeklyReport";
import { Chip } from "./ui";

/**
 * One WEEK of the campaign = one batch. Renders that batch's own hypotheses, its
 * three distinct reels (with killed reels left visible + marked), a results
 * summary, and its weekly report once the evaluation is done. Each section owns
 * its own reactive queries keyed by its batchId, so a stack of WeekSections
 * shows the whole campaign accumulating week over week — past weeks frozen, the
 * active week streaming live. The point is the search for the best-performing
 * reel; prior weeks are not re-simulated.
 */

const PHASE_TEXT: Record<string, string> = {
  strategizing: "Forming this week's falsifiable hypotheses…",
  generating: "Building treatment reels from last week's evidence…",
  generating_video: "Producing the reels…",
  simulating: "Running the 7-day simulated campaign…",
  analyzing: "Evaluating the evidence…",
};

export default function WeekSection({
  batchId,
  week,
  prevCpc,
  prevCac,
  isActive,
  targetCac,
  maxCpc,
}: {
  batchId: string;
  week: number;
  prevCpc: number | null;
  prevCac: number | null;
  isActive: boolean;
  targetCac?: number;
  maxCpc?: number;
}) {
  const hypotheses = useQuery(api.hypotheses.listByBatch, { batchId }) as Hypothesis[] | undefined;
  const variants = useQuery(api.variants.listByBatch, { batchId }) as Variant[] | undefined;
  const metrics = useQuery(api.metrics.liveMetrics, { batchId }) as Metric[] | undefined;
  const status = useQuery(api.experiments.getStatus, { batchId });
  const rationale = useQuery(api.agents.reasoningByBatch, { batchId });
  const allocations = useQuery(api.simulator.allocationsByBatch, { batchId });

  // Scroll the active (newest) week into view when it mounts, so clicking
  // "Run next week" brings the new reels into focus instead of leaving the user
  // staring at week 1.
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isActive) ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [isActive]);

  const analystData = rationale?.find((r) => r.agent === "analyst")?.data;
  const parsedAnalyst: AnalystData | null = (() => {
    if (!analystData) return null;
    try {
      return JSON.parse(analystData) as AnalystData;
    } catch {
      return null;
    }
  })();

  // Killed reels this week = the bandit's kill decisions on the final simulated
  // day. A bad performer is cut so no further budget/analysis is spent on it.
  const killedSet = (() => {
    const set = new Set<string>();
    if (!allocations || allocations.length === 0) return set;
    const lastDay = Math.max(...allocations.map((a) => a.day));
    for (const a of allocations) {
      if (a.day === lastDay && a.status === "kill") set.add(a.variantId as string);
    }
    return set;
  })();

  const metricsStarted = (metrics?.length ?? 0) > 0;
  const isComplete = status?.phase === "complete";

  const activeRows = (metrics ?? []).filter((m) => m.impressions > 0);
  const spend = activeRows.reduce((s, m) => s + m.spend, 0);
  const clicks = activeRows.reduce((s, m) => s + m.clicks, 0);
  const conversions = activeRows.reduce((s, m) => s + m.conversions, 0);
  const avgCpc = clicks > 0 ? spend / clicks : 0;
  const avgCac = conversions > 0 ? spend / conversions : 0;

  const cpcDelta = prevCpc && prevCpc > 0 && avgCpc > 0 ? ((avgCpc - prevCpc) / prevCpc) * 100 : null;
  const killedCount = killedSet.size;

  const phaseText = status?.phase ? PHASE_TEXT[status.phase] : undefined;

  return (
    <div
      ref={ref}
      className={`border rounded-bento bg-panel p-6 space-y-5 scroll-mt-20 ${
        isActive ? "border-primary/40" : "border-line"
      }`}
    >
      {/* Week header + summary */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-9 h-9 rounded-lg border flex items-center justify-center font-mono text-[13px] font-bold ${
              isActive
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-line bg-inset text-muted"
            }`}
          >
            {week}
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-[16px] font-bold text-foreground">
              Week {week}
            </h2>
            <p className="font-mono text-[11px] text-muted truncate">
              {(variants?.length ?? 0)} reels
              {isComplete ? " · complete" : isActive ? " · live" : ""}
              {killedCount > 0 ? ` · ${killedCount} cut` : ""}
            </p>
          </div>
        </div>
        {metricsStarted && (
          <div className="flex items-center gap-4">
            <Chip tone="warn">sim</Chip>
            <Stat label="CPC" value={`$${avgCpc.toFixed(2)}`} delta={cpcDelta} />
            <Stat label="CAC" value={`$${avgCac.toFixed(2)}`} />
          </div>
        )}
      </div>

      {/* This week's hypotheses */}
      {hypotheses && hypotheses.length > 0 && (
        <div className="border border-line bg-inset rounded-xl p-4">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/70 block mb-3">
            Week {week} hypotheses
          </span>
          <HypothesisList hypotheses={hypotheses} />
        </div>
      )}

      {/* This week's reels — distinct from every other week */}
      {variants && variants.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {variants.map((v, i) => (
            <VariantCard
              key={v._id}
              variant={v}
              metrics={(metrics ?? []).filter((m) => (m.variantId as string) === (v._id as string))}
              killedByBandit={killedSet.has(v._id as string)}
              revealDelay={i * 150}
              compact
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center py-10">
          <div className="w-10 h-10 rounded-lg animate-shimmer mb-3" />
          <p className="font-mono text-[12px] text-muted">
            {phaseText ?? "Preparing this week…"}
          </p>
        </div>
      )}

      {/* Live status line while the active week is still working */}
      {variants && variants.length > 0 && !isComplete && phaseText && (
        <div className="flex items-center gap-2 font-mono text-[12px] text-info">
          <span className="h-1.5 w-1.5 rounded-full bg-info animate-pulse" />
          {phaseText}
        </div>
      )}

      {/* This week's report — what won, which hypothesis was right/wrong, directive */}
      {isComplete && parsedAnalyst && (
        <WeeklyReport
          week={week}
          hypotheses={hypotheses ?? []}
          analystData={parsedAnalyst}
          avgCpc={avgCpc}
          avgCac={avgCac}
          prevCpc={prevCpc}
          prevCac={prevCac}
          variants={variants ?? []}
          targetCac={targetCac}
          maxCpc={maxCpc}
        />
      )}
    </div>
  );
}

function Stat({ label, value, delta }: { label: string; value: string; delta?: number | null }) {
  return (
    <div className="text-right">
      <span className="block font-mono text-[9px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </span>
      <span className="font-mono text-[14px] font-bold text-foreground">{value}</span>
      {delta != null && (
        <span className={`ml-1.5 font-mono text-[10px] font-bold ${delta < 0 ? "text-good" : "text-bad"}`}>
          {delta > 0 ? "+" : ""}{delta.toFixed(0)}%
        </span>
      )}
    </div>
  );
}
