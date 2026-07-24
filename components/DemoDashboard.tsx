"use client";

import { useEffect, useState } from "react";
import type { DemoWeek, DemoReel } from "@/lib/demoReels";
import {
  DEMO_PROGRAM_STORAGE_KEY,
  SAMPLE_PROGRAM,
  type DemoProgram,
} from "@/lib/demoProgram";
import MetricsChart from "./MetricsChart";
import ReelPreview from "./ReelPreview";

type Overall = {
  totalWeeks: number;
  totalReelsTested: number;
  startingCpc: number;
  finalCpc: number;
  cpcReduction: string;
  startingCac: number;
  finalCac: number;
  cacReduction: string;
  totalSpend: number;
  totalConversions: number;
  winningFormula: string;
  winningReel: string;
};

export default function DemoDashboard({
  weeks,
  overall,
}: {
  weeks: DemoWeek[];
  overall: Overall;
}) {
  const [activeWeek, setActiveWeek] = useState(0);
  const [program, setProgram] = useState<DemoProgram>(SAMPLE_PROGRAM);
  const week = weeks[activeWeek];

  useEffect(() => {
    const stored = window.localStorage.getItem(DEMO_PROGRAM_STORAGE_KEY);
    if (!stored) return;

    try {
      setProgram(JSON.parse(stored) as DemoProgram);
    } catch {
      window.localStorage.removeItem(DEMO_PROGRAM_STORAGE_KEY);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="p-4 lg:p-6 pb-0">
        <header className="bg-card rounded-bento shadow-bento px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
                Hypo<span className="text-primary">Cycle</span>
              </h1>
              <span className="text-foreground/20">|</span>
              <span className="text-[13px] text-foreground/50 font-medium">
                {program.name} Campaign
              </span>
            </div>
            {/* Week selector */}
            <div className="flex items-center gap-1.5">
              {weeks.map((w, i) => (
                <button
                  key={w.week}
                  onClick={() => setActiveWeek(i)}
                  className={`rounded-full px-4 py-2 text-[12px] font-semibold transition-all ${
                    activeWeek === i
                      ? "bg-primary text-white shadow-bento"
                      : "bg-background text-foreground/40 hover:text-foreground/60 hover:bg-foreground/5"
                  }`}
                >
                  Week {w.week}
                </button>
              ))}
            </div>
          </div>
        </header>
      </div>

      <div className="p-4 lg:p-6">
        <div className="grid grid-cols-12 gap-5">
          {/* Main — reels + experiment data */}
          <main className="col-span-12 lg:col-span-8 space-y-5">
            {/* Hypothesis card */}
            <div className="bg-card rounded-bento shadow-bento p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold text-white ${
                  activeWeek === 0 ? "bg-primary" : activeWeek === 1 ? "bg-amber-500" : "bg-green-500"
                }`}>
                  {week.week}
                </div>
                <div>
                  <h2 className="font-display text-[16px] font-bold text-foreground">{week.label}</h2>
                  <p className="text-[12px] text-foreground/40">{week.reels.length} reels tested this week</p>
                </div>
              </div>
              <div className="bg-background rounded-[14px] p-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary/50 block mb-1.5">Hypothesis</span>
                <p className="text-[13px] text-foreground/60 leading-relaxed">{week.hypothesis}</p>
              </div>
            </div>

            {/* Reels grid */}
            <div className="bg-card rounded-bento shadow-bento p-6">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-foreground/30 mb-4">Ad Reels</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {week.reels.map((reel) => (
                  <ReelCard key={reel.id} reel={reel} />
                ))}
              </div>
            </div>

            {/* Experiment results */}
            <div className="bg-card rounded-bento shadow-bento p-6">
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-foreground/30">Experiment Results</h3>
                {activeWeek > 0 && (
                  <span className={`rounded-full px-3 py-1 text-[10px] font-bold ${
                    week.metrics.avgCpc < weeks[activeWeek - 1].metrics.avgCpc
                      ? "bg-green-500/10 text-green-600"
                      : "bg-red-500/10 text-red-500"
                  }`}>
                    CPC {((week.metrics.avgCpc - weeks[activeWeek - 1].metrics.avgCpc) / weeks[activeWeek - 1].metrics.avgCpc * 100).toFixed(0)}% vs Week {activeWeek}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <StatCard label="CPC" value={`$${week.metrics.avgCpc.toFixed(2)}`} good={week.metrics.avgCpc < 0.80} />
                <StatCard label="CAC" value={`$${week.metrics.avgCac.toFixed(2)}`} good={week.metrics.avgCac < 3.0} />
                <StatCard label="Spend" value={`$${week.metrics.totalSpend.toLocaleString()}`} />
                <StatCard label="Conv." value={week.metrics.totalConversions.toLocaleString()} />
                <StatCard label="Active" value={`${week.metrics.reelsActive}/${week.metrics.reelsTotal}`} />
              </div>
            </div>

            <div className="bg-card rounded-bento shadow-bento p-6">
              <h3 className="mb-4 text-[11px] font-bold uppercase tracking-widest text-foreground/30">
                Campaign performance
              </h3>
              <MetricsChart weeks={weeks} />
            </div>

            {/* AI Analysis */}
            <div className="bg-primary/5 rounded-bento p-6">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-primary/50 mb-3">
                {week.week === weeks.length ? "Final Conclusion" : "AI Analysis"}
              </h3>
              <p className="text-[14px] text-foreground/70 leading-relaxed">{week.insight}</p>
            </div>
          </main>

          {/* Sidebar — overall campaign stats */}
          <aside className="col-span-12 lg:col-span-4 space-y-5">
            {/* CPC progression */}
            <div className="bg-card rounded-bento shadow-bento p-6">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-primary/50 mb-5">CPC Trend</h3>
              <CpcTrendChart
                weeks={weeks}
                activeWeek={activeWeek}
                onSelect={setActiveWeek}
              />
              <div className="bg-green-50 rounded-[12px] p-3 text-center">
                <span className="text-[11px] text-green-600 font-semibold">{overall.cpcReduction} CPC reduction over {overall.totalWeeks} weeks</span>
              </div>
            </div>

            {/* Campaign summary */}
            <div className="bg-card rounded-bento shadow-bento p-6">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-foreground/30 mb-4">Campaign Summary</h3>
              <div className="space-y-3">
                <SumRow label="Goal" value={goalLabel(program.goal)} />
                <SumRow label="Budget" value={`$${program.totalBudget.toLocaleString()}`} />
                <SumRow label="Total Reels Tested" value={`${overall.totalReelsTested}`} />
                <SumRow label="Total Spend" value={`$${overall.totalSpend.toLocaleString()}`} />
                <SumRow label="Total Conversions" value={overall.totalConversions.toLocaleString()} />
                <SumRow label="Best CPC" value={`$${overall.finalCpc}`} accent />
                <SumRow label="Best CAC" value={`$${overall.finalCac}`} accent />
              </div>
            </div>

            {/* Winning formula */}
            <div className="bg-card rounded-bento shadow-bento p-6">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-foreground/30 mb-3">Winning Formula</h3>
              <p className="text-[14px] font-semibold text-foreground leading-snug">{overall.winningFormula}</p>
              <p className="text-[12px] text-foreground/40 mt-2">{overall.winningReel}</p>
            </div>

            {/* Per-reel performance this week */}
            <div className="bg-card rounded-bento shadow-bento p-6">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-foreground/30 mb-4">Week {week.week} Performance</h3>
              <div className="space-y-2.5">
                {week.reels.map((reel) => (
                  <div key={reel.id} className="flex items-center gap-2.5 text-[12px]">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      reel.status === "winning" ? "bg-green-500" : reel.status === "killed" ? "bg-red-400" : "bg-primary/40"
                    }`} />
                    <span className="text-foreground/60 truncate flex-1">{reel.hookType}/{reel.voice}</span>
                    <span className="font-semibold text-foreground">${reel.cpc.toFixed(2)}</span>
                    <span className={`text-[10px] font-bold ${
                      reel.status === "winning" ? "text-green-600" : reel.status === "killed" ? "text-red-400" : "text-foreground/30"
                    }`}>
                      {reel.status === "winning" ? "BEST" : reel.status === "killed" ? "CUT" : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function ReelCard({ reel }: { reel: DemoReel }) {
  const [videoError, setVideoError] = useState(false);
  const hasVideo = reel.videoPath && !videoError;

  return (
    <div
      className={`rounded-[20px] bg-background p-4 transition-all ${
        reel.status === "killed" ? "opacity-40" : reel.status === "winning" ? "ring-2 ring-green-400/30" : ""
      }`}
    >
      {hasVideo ? (
        <video
          src={reel.videoPath!}
          className="w-full rounded-[14px] mb-3 aspect-[9/16] object-cover bg-foreground/5"
          autoPlay
          muted
          loop
          playsInline
          onError={() => setVideoError(true)}
        />
      ) : (
        <ReelPreview
          hookType={reel.hookType}
          voice={reel.voice}
          script={reel.script}
          pacing={reel.pacing}
          status={reel.status}
        />
      )}

      <div className="flex items-center justify-between mb-1.5">
        <span className="rounded-full bg-foreground text-card px-2.5 py-0.5 text-[10px] font-bold">
          {reel.hookType}
        </span>
        <span className={`text-[10px] font-bold ${
          reel.status === "winning" ? "text-green-600" : reel.status === "killed" ? "text-red-400" : "text-foreground/30"
        }`}>
          {reel.status === "winning" ? "BEST" : reel.status === "killed" ? "CUT" : ""}
        </span>
      </div>

      <p className="text-[11px] text-foreground/40 mb-2">{reel.voice} · {reel.pacing}</p>

      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-foreground/5 text-[11px]">
        <div>
          <span className="text-foreground/25 text-[9px] uppercase font-semibold block">CPC</span>
          <span className={`font-bold ${reel.cpc < 0.70 ? "text-green-600" : "text-foreground"}`}>${reel.cpc.toFixed(2)}</span>
        </div>
        <div>
          <span className="text-foreground/25 text-[9px] uppercase font-semibold block">CAC</span>
          <span className={`font-bold ${reel.cac < 2.5 ? "text-green-600" : "text-foreground"}`}>${reel.cac.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="bg-background rounded-[12px] p-3">
      <span className="block text-[9px] font-semibold uppercase tracking-wide text-foreground/30">{label}</span>
      <span className={`text-[16px] font-bold ${good ? "text-green-600" : "text-foreground"}`}>{value}</span>
    </div>
  );
}

function SumRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12px] text-foreground/40">{label}</span>
      <span className={`text-[13px] font-bold ${accent ? "text-green-600" : "text-foreground"}`}>{value}</span>
    </div>
  );
}

function goalLabel(goal: DemoProgram["goal"]) {
  if (goal === "minimize_cac") return "Minimize CAC";
  if (goal === "maximize_clicks") return "Maximize clicks";
  return "Maximize trials";
}

function CpcTrendChart({
  weeks,
  activeWeek,
  onSelect,
}: {
  weeks: DemoWeek[];
  activeWeek: number;
  onSelect: (index: number) => void;
}) {
  const width = 320;
  const height = 166;
  const padding = { top: 28, right: 18, bottom: 30, left: 38 };
  const max = Math.max(...weeks.map((week) => week.metrics.avgCpc), 1);
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const points = weeks.map((week, index) => ({
    value: week.metrics.avgCpc,
    x:
      padding.left +
      (weeks.length === 1
        ? plotWidth / 2
        : (index / (weeks.length - 1)) * plotWidth),
    y: padding.top + plotHeight - (week.metrics.avgCpc / max) * plotHeight,
  }));

  return (
    <div className="mb-4">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        role="img"
        aria-label={`Average CPC fell from $${weeks[0].metrics.avgCpc.toFixed(2)} to $${weeks[weeks.length - 1].metrics.avgCpc.toFixed(2)} over ${weeks.length} weeks`}
      >
        {[0, 0.5, 1].map((ratio) => {
          const y = padding.top + plotHeight * (1 - ratio);
          return (
            <g key={ratio}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
                stroke="#222a38"
                strokeDasharray="4 5"
              />
              <text
                x={padding.left - 8}
                y={y + 4}
                textAnchor="end"
                fill="#8b94a7"
                fontSize="9"
              >
                ${(max * ratio).toFixed(2)}
              </text>
            </g>
          );
        })}

        <polyline
          points={points.map((point) => `${point.x},${point.y}`).join(" ")}
          fill="none"
          stroke="#7c6cff"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((point, index) => (
          <g key={weeks[index].week}>
            {activeWeek === index && (
              <circle
                cx={point.x}
                cy={point.y}
                r="10"
                fill="#7c6cff"
                opacity="0.18"
              />
            )}
            <circle
              cx={point.x}
              cy={point.y}
              r={activeWeek === index ? 5.5 : 4.5}
              fill={index === points.length - 1 ? "#34d399" : "#7c6cff"}
              stroke="#121722"
              strokeWidth="3"
            />
            <text
              x={point.x}
              y={point.y - 12}
              textAnchor="middle"
              fill="#e8ecf4"
              fontSize="10"
              fontWeight="700"
            >
              ${point.value.toFixed(2)}
            </text>
            <text
              x={point.x}
              y={height - 9}
              textAnchor="middle"
              fill="#8b94a7"
              fontSize="9"
            >
              Wk {weeks[index].week}
            </text>
          </g>
        ))}
      </svg>

      <div className="mt-1 grid grid-cols-3 gap-2" aria-label="Select campaign week">
        {weeks.map((week, index) => (
          <button
            key={week.week}
            type="button"
            onClick={() => onSelect(index)}
            aria-pressed={activeWeek === index}
            className={`rounded-md px-2 py-1.5 font-mono text-[9px] font-semibold transition-colors ${
              activeWeek === index
                ? "bg-primary/15 text-primary"
                : "bg-background text-foreground/35 hover:text-foreground/60"
            }`}
          >
            Week {week.week}
          </button>
        ))}
      </div>
    </div>
  );
}
