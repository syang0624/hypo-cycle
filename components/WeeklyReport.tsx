"use client";

import type { AnalystData, Hypothesis, Variant } from "@/lib/types";

/**
 * S1.5 — Evidence Report (PRD §17.7), scoped to what the legacy contract can
 * feed. Three PRD rules are enforced at the display layer:
 *   - verdicts use finding-result language (supported/refuted/partial);
 *   - guardrails (target CAC, max CPC) render as hard pass/fail, never as a
 *     weighted score;
 *   - observed evidence (simulated metrics) is visually separated from system
 *     inference (the evaluation agent's verdicts and narrative).
 */

const VERDICT_STYLE: Record<string, string> = {
  confirmed: "border-good/40 text-good",
  refuted: "border-bad/40 text-bad",
  partial: "border-warn/40 text-warn",
};

// HookLoop analyst vocabulary → HypoCycle finding results (PRD §9.5).
const VERDICT_LABEL: Record<string, string> = {
  confirmed: "supported",
  refuted: "refuted",
  partial: "partial",
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
  targetCac,
  maxCpc,
}: {
  week: number;
  hypotheses: Hypothesis[];
  analystData: AnalystData | null;
  avgCpc: number;
  avgCac: number;
  prevCpc: number | null;
  prevCac: number | null;
  variants: Variant[];
  targetCac?: number;
  maxCpc?: number;
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

  const guardrails: { label: string; actual: number; limit: number; pass: boolean }[] = [];
  if (targetCac != null && targetCac > 0 && avgCac > 0) {
    guardrails.push({ label: "CAC ≤ target", actual: avgCac, limit: targetCac, pass: avgCac <= targetCac });
  }
  if (maxCpc != null && maxCpc > 0 && avgCpc > 0) {
    guardrails.push({ label: "CPC ≤ max", actual: avgCpc, limit: maxCpc, pass: avgCpc <= maxCpc });
  }
  const guardrailsFailed = guardrails.some((g) => !g.pass);

  return (
    <div className="border border-line bg-inset rounded-xl p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
          <span className={`h-2 w-2 rounded-[2px] ${guardrailsFailed ? "bg-bad" : "bg-good"}`} />
          Week {week} · Evidence report
        </h2>
        <div className="flex items-center gap-3">
          <DeltaPill label="CPC" value={avgCpc} delta={cpcDelta} />
          <DeltaPill label="CAC" value={avgCac} delta={cacDelta} />
        </div>
      </div>

      {/* ── Observed evidence (simulated) ─────────────────────────────── */}
      <div className="space-y-3">
        <SectionLabel warn>Observed evidence · simulated</SectionLabel>

        {guardrails.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {guardrails.map((g) => (
              <div
                key={g.label}
                className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                  g.pass ? "border-good/30 bg-good/5" : "border-bad/40 bg-bad/10"
                }`}
              >
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
                  {g.label} ${g.limit.toFixed(0)}
                </span>
                <span
                  className={`font-mono text-[11px] font-bold ${g.pass ? "text-good" : "text-bad"}`}
                >
                  ${g.actual.toFixed(2)} · {g.pass ? "pass" : "FAIL"}
                </span>
              </div>
            ))}
          </div>
        )}
        {guardrailsFailed && (
          <p className="font-mono text-[10px] text-bad/80">
            guardrails are hard constraints — a week that fails one cannot be declared a winner
          </p>
        )}

        {/* Bandit outcomes — what the allocator actually did */}
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
      </div>

      {/* ── System inference — the evaluation agent's read ─────────────── */}
      <div className="space-y-3">
        <SectionLabel>Evaluation · system inference</SectionLabel>

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
                      {VERDICT_LABEL[verdict.verdict] ?? verdict.verdict}
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

        {analystData?.narrative && (
          <p className="text-[12.5px] text-foreground/70 leading-relaxed border-l-2 border-line pl-3">
            {analystData.narrative}
          </p>
        )}
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

function SectionLabel({ children, warn = false }: { children: React.ReactNode; warn?: boolean }) {
  return (
    <span
      className={`block font-mono text-[9px] font-bold uppercase tracking-[0.18em] ${
        warn ? "text-warn/80" : "text-info/80"
      }`}
    >
      {children}
    </span>
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
          {delta > 0 ? "+" : ""}
          {delta.toFixed(0)}%
        </span>
      )}
    </div>
  );
}
