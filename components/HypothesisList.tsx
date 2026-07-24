import type { Hypothesis } from "@/lib/types";

export default function HypothesisList({
  hypotheses,
}: {
  hypotheses: Hypothesis[];
}) {
  return (
    <ul className="space-y-2.5">
      {hypotheses.map((h, i) => (
        <li key={h._id} className="flex items-start gap-3">
          <span className="flex-shrink-0 mt-0.5 font-mono text-[11px] font-bold text-primary">
            H{i + 1}
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-foreground leading-snug">
              {h.text}
            </p>
            <p className="text-[12px] text-muted mt-1 leading-relaxed">{h.reasoning}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
