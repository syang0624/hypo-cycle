"use client";

import { useMemo } from "react";
import type { Variant, Metric } from "@/lib/types";

const COLORS = [
  "#007AFF", "#34C759", "#AF52DE", "#FF9500",
  "#00C7BE", "#5856D6", "#FF2D55", "#5AC8FA",
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
      <div className="flex h-10 rounded-full overflow-hidden mb-4 bg-background">
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
                <span className="text-[11px] text-white font-semibold truncate px-1">
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
            <div key={a.variantId} className="flex items-center gap-2.5 text-[12px]">
              <span
                className="h-3 w-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: COLORS[origIndex % COLORS.length] }}
              />
              <span className="text-foreground/60 truncate">
                {a.hookType}/{a.voice}
              </span>
              {a.status === "scale" && (
                <span className="text-[10px] font-semibold text-green-600 bg-green-500/10 rounded-full px-1.5 py-0.5">
                  TOP
                </span>
              )}
              <span className="ml-auto font-semibold text-foreground">
                ${a.amount}
              </span>
              <span className="text-foreground/30 w-14 text-right font-medium">
                {(a.share * 100).toFixed(0)}%
              </span>
            </div>
          );
        })}
        {(killedCount > 0 || scaleCount > 0) && (
          <p className="text-[11px] text-foreground/40 font-medium mt-2">
            {killedCount > 0 && (
              <span className="text-red-400">
                {killedCount} killed
              </span>
            )}
            {killedCount > 0 && scaleCount > 0 && " · "}
            {scaleCount > 0 && (
              <span className="text-green-600">
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
