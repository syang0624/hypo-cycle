"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Hypothesis, Variant, Metric, AnalystData } from "@/lib/types";
import VariantCard from "./VariantCard";
import HypothesisList from "./HypothesisList";
import WeeklyReport from "./WeeklyReport";

/**
 * One WEEK of the campaign = one batch. Renders that batch's own hypotheses, its
 * three distinct reels (with killed reels left visible + marked), a results
 * summary, and its weekly report once the Analyst is done. Each section owns its
 * own reactive queries keyed by its batchId, so a stack of WeekSections shows the
 * whole campaign accumulating week over week — past weeks frozen, the active week
 * streaming live. The point is the search for the best-performing reel; prior
 * weeks are not re-simulated.
 */

const PHASE_TEXT: Record<string, string> = {
  strategizing: "Strategist is forming this week's hypotheses…",
  generating: "Generating new reels from last week's learnings…",
  generating_video: "Producing the reels…",
  simulating: "Running the 7-day simulation…",
  analyzing: "Analyzing what worked…",
};

export default function WeekSection({
  batchId,
  week,
  prevCpc,
  prevCac,
  isActive,
}: {
  batchId: string;
  week: number;
  prevCpc: number | null;
  prevCac: number | null;
  isActive: boolean;
}) {
  const hypotheses = useQuery(api.hypotheses.listByBatch, { batchId }) as Hypothesis[] | undefined;
  const variants = useQuery(api.variants.listByBatch, { batchId }) as Variant[] | undefined;
  const metrics = useQuery(api.metrics.liveMetrics, { batchId }) as Metric[] | undefined;
  const status = useQuery(api.experiments.getStatus, { batchId });
  const reasoning = useQuery(api.agents.reasoningByBatch, { batchId });
  const allocations = useQuery(api.simulator.allocationsByBatch, { batchId });

  // Scroll the active (newest) week into view when it mounts, so clicking
  // "Run Next Week" brings the new reels into focus instead of leaving the user
  // staring at week 1.
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isActive) ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [isActive]);

  const analystData = reasoning?.find((r) => r.agent === "analyst")?.data;
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

  const accentDot = week === 1 ? "bg-primary" : week === 2 ? "bg-amber-500" : "bg-green-500";
  const phaseText = status?.phase ? PHASE_TEXT[status.phase] : undefined;

  return (
    <div ref={ref} className="bg-card rounded-bento shadow-bento p-6 space-y-5 scroll-mt-6">
      {/* Week header + summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold text-white ${accentDot}`}>
            {week}
          </div>
          <div>
            <h2 className="font-display text-[16px] font-bold text-foreground">Week {week}</h2>
            <p className="text-[12px] text-foreground/40">
              {(variants?.length ?? 0)} reels
              {isComplete
                ? " · complete"
                : isActive
                  ? " · running"
                  : ""}
              {killedCount > 0 ? ` · ${killedCount} cut` : ""}
            </p>
          </div>
        </div>
        {metricsStarted && (
          <div className="flex items-center gap-5">
            <Metric label="CPC" value={`$${avgCpc.toFixed(2)}`} delta={cpcDelta} />
            <Metric label="CAC" value={`$${avgCac.toFixed(2)}`} />
          </div>
        )}
      </div>

      {/* This week's hypotheses */}
      {hypotheses && hypotheses.length > 0 && (
        <div className="bg-background rounded-[14px] p-4">
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary/50 block mb-2">
            Week {week} Hypotheses
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
        <div className="flex flex-col items-center py-10 text-foreground/30">
          <div className="w-10 h-10 rounded-full bg-background animate-pulse mb-3" />
          <p className="text-[13px] font-medium">{phaseText ?? "Preparing this week…"}</p>
        </div>
      )}

      {/* Live status line while the active week is still working */}
      {variants && variants.length > 0 && !isComplete && phaseText && (
        <div className="flex items-center gap-2 text-[12px] text-foreground/40">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
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
        />
      )}
    </div>
  );
}

function Metric({ label, value, delta }: { label: string; value: string; delta?: number | null }) {
  return (
    <div className="text-right">
      <span className="block text-[9px] font-semibold uppercase tracking-wide text-foreground/30">{label}</span>
      <span className="text-[15px] font-bold text-foreground">{value}</span>
      {delta != null && (
        <span className={`ml-1.5 text-[10px] font-bold ${delta < 0 ? "text-green-600" : "text-red-500"}`}>
          {delta > 0 ? "+" : ""}{delta.toFixed(0)}%
        </span>
      )}
    </div>
  );
}
