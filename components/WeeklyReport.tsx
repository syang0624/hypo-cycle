"use client";

import type { AnalystData, Hypothesis, Variant } from "@/lib/types";

const VERDICT_STYLE: Record<string, string> = {
  confirmed: "border-good/40 text-good",
  refuted: "border-bad/40 text-bad",
  partial: "border-warn/40 text-warn",
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
    <div className="border border-line bg-inset rounded-xl p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
          <span className="h-2 w-2 rounded-[2px] bg-good" />
          Week {week} · Evidence report
        </h2>
        <div className="flex items-center gap-3">
          <DeltaPill label="CPC" value={avgCpc} delta={cpcDelta} />
          <DeltaPill label="CAC" value={avgCac} delta={cacDelta} />
        </div>
      </div>

      {/* This week's hypotheses + verdicts */}
      <div className="space-y-2">
        {hypotheses.map((h) => {
          const idx = hypotheses.indexOf(h);
          const verdict =
            analystData?.hypothesisVerdict[idx] ??
            analystData?.hypothesisVerdict.find(
              (vd) => vd.hypothesis.trim().slice(0, 40) === h.text.trim().slice(0, 40),
            );
          return (
            <div key={h._id} className="border border-line bg-panel rounded-lg p-3">
              <div className="flex items-start gap-2">
                <p className="text-[13px] text-foreground/80 flex-1">{h.text}</p>
                {verdict && (
                  <span
                    className={`flex-shrink-0 rounded-md border bg-inset px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${
                      VERDICT_STYLE[verdict.verdict] ?? "border-line text-muted"
                    }`}
                  >
                    {verdict.verdict}
                  </span>
                )}
              </div>
              {verdict && (
                <p className="text-[11.5px] text-muted mt-1.5 leading-relaxed">{verdict.why}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Winners / cuts */}
      <div className="grid grid-cols-2 gap-3">
        <div className="border border-good/30 bg-good/5 rounded-lg p-3">
          <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-good">
            Scaled
          </span>
          <p className="font-mono text-[11.5px] text-foreground/70 mt-1.5">
            {winnerLabels.join(", ") || "—"}
          </p>
        </div>
        <div className="border border-bad/30 bg-bad/5 rounded-lg p-3">
          <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-bad">
            Cut
          </span>
          <p className="font-mono text-[11.5px] text-foreground/70 mt-1.5">
            {loserLabels.join(", ") || "—"}
          </p>
        </div>
      </div>

      {/* Directive */}
      {analystData?.nextBatchBrief && (
        <div className="border border-primary/30 bg-primary/5 rounded-lg p-4">
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-primary">
            Next week&apos;s directive
          </span>
          <p className="text-[13px] text-foreground/80 mt-2 leading-relaxed">
            {analystData.nextBatchBrief}
          </p>
        </div>
      )}
    </div>
  );
}

function DeltaPill({ label, value, delta }: { label: string; value: number; delta: number | null }) {
  return (
    <div className="text-right">
      <span className="block font-mono text-[9px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </span>
      <span className="font-mono text-[13px] font-bold text-foreground">${value.toFixed(2)}</span>
      {delta !== null && (
        <span className={`ml-1.5 font-mono text-[10px] font-bold ${delta < 0 ? "text-good" : "text-bad"}`}>
          {delta > 0 ? "+" : ""}{delta.toFixed(0)}%
        </span>
      )}
    </div>
  );
}
