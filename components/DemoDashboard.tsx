"use client";

import { useState } from "react";
import type { DemoWeek, DemoReel } from "@/lib/demoReels";
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
  const week = weeks[activeWeek];

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
              <span className="text-foreground/20">|</span>
              <span className="text-[13px] text-foreground/50 font-medium">Coca-Cola Campaign</span>
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
              <div className="flex items-end gap-3 h-32 mb-4">
                {weeks.map((w, i) => {
                  const maxCpc = Math.max(...weeks.map((wk) => wk.metrics.avgCpc));
                  const height = (w.metrics.avgCpc / maxCpc) * 100;
                  return (
                    <div
                      key={w.week}
                      className={`flex-1 flex flex-col items-center gap-1.5 cursor-pointer transition-all ${
                        activeWeek === i ? "opacity-100" : "opacity-40 hover:opacity-70"
                      }`}
                      onClick={() => setActiveWeek(i)}
                    >
                      <span className="text-[12px] font-bold text-foreground">${w.metrics.avgCpc.toFixed(2)}</span>
                      <div
                        className={`w-full rounded-t-[10px] transition-all duration-500 ${
                          i === weeks.length - 1 ? "bg-green-500" : activeWeek === i ? "bg-primary" : "bg-primary/30"
                        }`}
                        style={{ height: `${height}%` }}
                      />
                      <span className="text-[10px] text-foreground/40 font-semibold">Wk {w.week}</span>
                    </div>
                  );
                })}
              </div>
              <div className="bg-green-50 rounded-[12px] p-3 text-center">
                <span className="text-[11px] text-green-600 font-semibold">{overall.cpcReduction} CPC reduction over {overall.totalWeeks} weeks</span>
              </div>
            </div>

            {/* Campaign summary */}
            <div className="bg-card rounded-bento shadow-bento p-6">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-foreground/30 mb-4">Campaign Summary</h3>
              <div className="space-y-3">
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
