"use client";

import { useMemo } from "react";
import type { Variant, Metric } from "@/lib/types";

const COLORS = [
  "#7C6CFF", "#38BDF8", "#F472B6", "#FBBF24",
  "#22D3EE", "#A78BFA", "#FB923C", "#4ADE80",
];

type BanditRow = {
  batchId: string;
  day: number;
  variantId: string;
  share: number;
  dailyBudget: number;
  status: "scale" | "explore" | "kill";
};

type DisplayAllocation = {
  variantId: string;
  hookType: string;
  voice: string;
  share: number;
  amount: number;
  status: "scale" | "explore" | "kill";
};

export default function BudgetAllocator({
  variants,
  metrics,
  banditAllocations,
}: {
  variants: Variant[];
  metrics: Metric[];
  banditAllocations?: BanditRow[];
}) {
  const totalBudget = variants.reduce((sum, v) => sum + v.budget, 0);

  const allocations = useMemo((): DisplayAllocation[] => {
    // Prefer real bandit allocations from the Thompson sampling engine
    if (banditAllocations && banditAllocations.length > 0) {
      const lastDay = Math.max(...banditAllocations.map((a) => a.day));
      const latest = banditAllocations.filter((a) => a.day === lastDay);

      return variants.map((v) => {
        const ba = latest.find((a) => (a.variantId as string) === (v._id as string));
        return {
          variantId: v._id as string,
          hookType: v.hookType,
          voice: v.voice,
          share: ba?.share ?? 0,
          amount: Math.round(ba?.dailyBudget ?? 0),
          status: ba?.status ?? "explore",
        };
      });
    }

    // Fallback: derive from metrics (pre-bandit integration)
    if (metrics.length === 0) {
      return variants.map((v) => ({
        variantId: v._id as string,
        hookType: v.hookType,
        voice: v.voice,
        share: v.budget / totalBudget,
        amount: v.budget,
        status: "explore" as const,
      }));
    }

    const lastDay = Math.max(...metrics.map((m) => m.day));
    const latestMetrics = metrics.filter((m) => m.day === lastDay);

    const scores: { id: string; score: number; killed: boolean }[] = [];
    for (const v of variants) {
      const m = latestMetrics.find((m) => (m.variantId as string) === (v._id as string));
      if (!m || m.impressions === 0) {
        scores.push({ id: v._id as string, score: 0, killed: true });
      } else {
        scores.push({ id: v._id as string, score: m.cac > 0 ? 1 / m.cac : 0, killed: false });
      }
    }
    const totalScore = scores.reduce((s, x) => s + x.score, 0);

    return variants.map((v, i) => {
      const s = scores[i];
      const share = totalScore > 0 ? s.score / totalScore : 0;
      return {
        variantId: v._id as string,
        hookType: v.hookType,
        voice: v.voice,
        share,
        amount: Math.round(share * totalBudget),
        status: s.killed ? "kill" as const : "explore" as const,
      };
    });
  }, [variants, metrics, banditAllocations, totalBudget]);

  const active = allocations.filter((a) => a.status !== "kill");
  const killedCount = allocations.filter((a) => a.status === "kill").length;
  const scaleCount = allocations.filter((a) => a.status === "scale").length;

  return (
    <div>
      {/* Stacked bar */}
      <div className="flex h-9 rounded-lg overflow-hidden mb-4 border border-line bg-inset">
        {allocations.map((a, i) =>
          a.status === "kill" ? null : (
            <div
              key={a.variantId}
              className="relative transition-all duration-700 ease-in-out flex items-center justify-center"
              style={{
                width: `${a.share * 100}%`,
                backgroundColor: COLORS[i % COLORS.length],
                minWidth: a.share > 0 ? "2px" : "0px",
              }}
              title={`${a.hookType}/${a.voice}: $${a.amount}`}
            >
              {a.share > 0.08 && (
                <span className="font-mono text-[10px] text-background font-bold truncate px-1">
                  ${a.amount}
                </span>
              )}
            </div>
          ),
        )}
      </div>

      {/* Legend */}
      <div className="space-y-2">
        {active.map((a) => {
          const origIndex = allocations.indexOf(a);
          return (
            <div key={a.variantId} className="flex items-center gap-2.5 font-mono text-[11.5px]">
              <span
                className="h-2.5 w-2.5 rounded-[3px] flex-shrink-0"
                style={{ backgroundColor: COLORS[origIndex % COLORS.length] }}
              />
              <span className="text-muted truncate">
                {a.hookType}/{a.voice}
              </span>
              {a.status === "scale" && (
                <span className="text-[9px] font-bold text-good border border-good/40 rounded-md px-1.5 py-0.5">
                  TOP
                </span>
              )}
              <span className="ml-auto font-semibold text-foreground">
                ${a.amount}
              </span>
              <span className="text-muted/50 w-14 text-right">
                {(a.share * 100).toFixed(0)}%
              </span>
            </div>
          );
        })}
        {(killedCount > 0 || scaleCount > 0) && (
          <p className="font-mono text-[10.5px] text-muted mt-2">
            {killedCount > 0 && (
              <span className="text-bad">
                {killedCount} killed
              </span>
            )}
            {killedCount > 0 && scaleCount > 0 && " · "}
            {scaleCount > 0 && (
              <span className="text-good">
                {scaleCount} scaling
              </span>
            )}
            {" — Thompson sampling"}
          </p>
        )}
      </div>
    </div>
  );
}
