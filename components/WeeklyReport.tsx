// components/WeeklyReport.tsx
"use client";

import type { AnalystData, Hypothesis, Variant } from "@/lib/types";

const VERDICT_STYLE: Record<string, string> = {
  confirmed: "bg-green-500/10 text-green-600",
  refuted: "bg-red-500/10 text-red-500",
  partial: "bg-amber-500/10 text-amber-600",
};

export default function WeeklyReport({
  week,
  hypotheses,
  analystData,
  avgCpc,
  avgCac,
  prevCpc,
  prevCac,
  variants,
}: {
  week: number;
  hypotheses: Hypothesis[];
  analystData: AnalystData | null;
  avgCpc: number;
  avgCac: number;
  prevCpc: number | null;
  prevCac: number | null;
  variants: Variant[];
}) {
  const cpcDelta = prevCpc && prevCpc > 0 ? ((avgCpc - prevCpc) / prevCpc) * 100 : null;
  const cacDelta = prevCac && prevCac > 0 ? ((avgCac - prevCac) / prevCac) * 100 : null;

  const idToVariant = new Map(variants.map((v) => [v._id as string, v]));
  const winnerLabels = (analystData?.winners ?? [])
    .map((id) => idToVariant.get(id))
    .filter((v): v is Variant => Boolean(v))
    .map((v) => `${v.hookType}/${v.voice}`);
  const loserLabels = (analystData?.losers ?? [])
    .map((id) => idToVariant.get(id))
    .filter((v): v is Variant => Boolean(v))
    .map((v) => `${v.hookType}/${v.voice}`);

  return (
    <div className="bg-card rounded-bento shadow-bento p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[16px] font-bold text-foreground">Week {week} — Report</h2>
        <div className="flex items-center gap-2">
          <DeltaPill label="CPC" value={avgCpc} delta={cpcDelta} />
          <DeltaPill label="CAC" value={avgCac} delta={cacDelta} />
        </div>
      </div>

      {/* This week's hypotheses + verdicts */}
      <div className="space-y-2">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-foreground/30">Hypotheses & Verdicts</h3>
        {hypotheses.map((h) => {
          const idx = hypotheses.indexOf(h);
          const verdict =
            analystData?.hypothesisVerdict[idx] ??
            analystData?.hypothesisVerdict.find(
              (vd) => vd.hypothesis.trim().slice(0, 40) === h.text.trim().slice(0, 40),
            );
          return (
            <div key={h._id} className="bg-background rounded-[12px] p-3">
              <div className="flex items-start gap-2">
                <p className="text-[13px] text-foreground/70 flex-1">{h.text}</p>
                {verdict && (
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${VERDICT_STYLE[verdict.verdict] ?? "bg-foreground/5 text-foreground/40"}`}>
                    {verdict.verdict}
                  </span>
                )}
              </div>
              {verdict && <p className="text-[11px] text-foreground/40 mt-1.5">{verdict.why}</p>}
            </div>
          );
        })}
      </div>

      {/* Winners / cuts */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-50 rounded-[12px] p-3">
          <span className="text-[10px] font-bold uppercase tracking-wide text-green-600">What&apos;s won</span>
          <p className="text-[12px] text-foreground/60 mt-1">{winnerLabels.join(", ") || "—"}</p>
        </div>
        <div className="bg-red-50 rounded-[12px] p-3">
          <span className="text-[10px] font-bold uppercase tracking-wide text-red-500">What was cut</span>
          <p className="text-[12px] text-foreground/60 mt-1">{loserLabels.join(", ") || "—"}</p>
        </div>
      </div>

      {/* Directive */}
      {analystData?.nextBatchBrief && (
        <div className="bg-primary/5 rounded-[12px] p-4">
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary/50">Next week&apos;s directive</span>
          <p className="text-[13px] text-foreground/70 mt-1.5 leading-relaxed">{analystData.nextBatchBrief}</p>
        </div>
      )}
    </div>
  );
}

function DeltaPill({ label, value, delta }: { label: string; value: number; delta: number | null }) {
  return (
    <div className="text-right">
      <span className="block text-[9px] font-semibold uppercase tracking-wide text-foreground/30">{label}</span>
      <span className="text-[14px] font-bold text-foreground">${value.toFixed(2)}</span>
      {delta !== null && (
        <span className={`ml-1.5 text-[10px] font-bold ${delta < 0 ? "text-green-600" : "text-red-500"}`}>
          {delta > 0 ? "+" : ""}{delta.toFixed(0)}%
        </span>
      )}
    </div>
  );
}
