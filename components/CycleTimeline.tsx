"use client";

import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Hypothesis, AnalystData } from "@/lib/types";

/**
 * S1.7 — Cycle Timeline (PRD §17.9): the lineage view that makes the
 * self-improving loop visible. One node per week showing hypothesis → verdict
 * → evidence → directive, with each directive feeding the next week's
 * hypotheses. Runs entirely on the legacy contract; each node owns its own
 * reactive queries keyed by batchId, mirroring WeekSection.
 */

type WeekSummary = {
  batchId: string;
  week: number;
  avgCpc: number;
  avgCac: number;
};

const VERDICT_TONE: Record<string, string> = {
  confirmed: "border-good/40 text-good",
  refuted: "border-bad/40 text-bad",
  partial: "border-warn/40 text-warn",
};

// The analyst speaks HookLoop ("confirmed"); the product speaks HypoCycle
// (PRD §9.5 finding results). Map at the display boundary.
const VERDICT_LABEL: Record<string, string> = {
  confirmed: "supported",
  refuted: "refuted",
  partial: "partial",
};

export default function CycleTimeline({
  weeks,
  activeBatchId,
}: {
  weeks: WeekSummary[];
  activeBatchId: string;
}) {
  return (
    <ol className="relative space-y-6">
      {weeks.map((w, i) => {
        const prev = i > 0 ? weeks[i - 1] : null;
        return (
          <TimelineNode
            key={w.batchId}
            summary={w}
            prev={prev}
            isActive={w.batchId === activeBatchId}
            isLast={i === weeks.length - 1}
          />
        );
      })}
    </ol>
  );
}

function TimelineNode({
  summary,
  prev,
  isActive,
  isLast,
}: {
  summary: WeekSummary;
  prev: WeekSummary | null;
  isActive: boolean;
  isLast: boolean;
}) {
  const { batchId, week, avgCpc, avgCac } = summary;
  const hypotheses = useQuery(api.hypotheses.listByBatch, { batchId }) as Hypothesis[] | undefined;
  const rationale = useQuery(api.agents.reasoningByBatch, { batchId });
  const status = useQuery(api.experiments.getStatus, { batchId });

  const analyst: AnalystData | null = (() => {
    const raw = rationale?.find((r) => r.agent === "analyst")?.data;
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AnalystData;
    } catch {
      return null;
    }
  })();

  const isComplete = status?.phase === "complete";
  const isFailed = status?.status === "failed";
  const cpcDelta =
    prev && prev.avgCpc > 0 && avgCpc > 0 ? ((avgCpc - prev.avgCpc) / prev.avgCpc) * 100 : null;

  function verdictFor(h: Hypothesis, idx: number) {
    return (
      analyst?.hypothesisVerdict[idx] ??
      analyst?.hypothesisVerdict.find(
        (vd) => vd.hypothesis.trim().slice(0, 40) === h.text.trim().slice(0, 40),
      ) ??
      null
    );
  }

  return (
    <li className="relative pl-9">
      {/* Spine */}
      {!isLast && (
        <span className="absolute left-[13px] top-8 bottom-[-24px] w-px bg-line" aria-hidden />
      )}
      {/* Node dot */}
      <span
        className={`absolute left-0 top-0.5 flex h-7 w-7 items-center justify-center rounded-full border font-mono text-[11px] font-bold ${
          isFailed
            ? "border-bad/50 bg-bad/10 text-bad"
            : isActive
              ? "border-primary/60 bg-primary/10 text-primary"
              : isComplete
                ? "border-good/40 bg-good/10 text-good"
                : "border-line bg-inset text-muted"
        }`}
      >
        {week}
      </span>

      <div className="space-y-2.5">
        {/* Node header */}
        <div className="flex items-center gap-3">
          <span className="font-display text-[14px] font-bold text-foreground">Week {week}</span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
            {isFailed ? "failed" : isComplete ? "complete" : isActive ? "live" : "running"}
          </span>
          {avgCpc > 0 && (
            <span className="ml-auto font-mono text-[11px] text-muted">
              CPC <span className="text-foreground font-bold">${avgCpc.toFixed(2)}</span>
              {cpcDelta != null && (
                <span className={`ml-1 font-bold ${cpcDelta < 0 ? "text-good" : "text-bad"}`}>
                  {cpcDelta > 0 ? "+" : ""}
                  {cpcDelta.toFixed(0)}%
                </span>
              )}
              {avgCac > 0 && (
                <>
                  {" · "}CAC <span className="text-foreground font-bold">${avgCac.toFixed(2)}</span>
                </>
              )}
            </span>
          )}
        </div>

        {/* Hypotheses + verdicts */}
        {hypotheses && hypotheses.length > 0 && (
          <ul className="space-y-1">
            {hypotheses.map((h, idx) => {
              const v = verdictFor(h, idx);
              return (
                <li key={h._id} className="flex items-center gap-2 min-w-0">
                  <span className="flex-shrink-0 font-mono text-[10px] font-bold text-primary/70">
                    H{idx + 1}
                  </span>
                  <span className="truncate text-[12px] text-foreground/70" title={h.text}>
                    {h.text}
                  </span>
                  {v && (
                    <span
                      className={`flex-shrink-0 rounded-md border bg-inset px-1.5 py-px font-mono text-[9px] font-bold uppercase tracking-wider ${
                        VERDICT_TONE[v.verdict] ?? "border-line text-muted"
                      }`}
                    >
                      {VERDICT_LABEL[v.verdict] ?? v.verdict}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {/* Directive → seeds the next cycle (the loop, made visible) */}
        {isComplete && analyst?.nextBatchBrief && (
          <p className="font-mono text-[11px] text-primary/80 leading-relaxed">
            ↳ next: <span className="text-foreground/70">{analyst.nextBatchBrief}</span>
          </p>
        )}
      </div>
    </li>
  );
}
