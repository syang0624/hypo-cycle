import type { Hypothesis } from "@/lib/types";

export default function HypothesisList({
  hypotheses,
}: {
  hypotheses: Hypothesis[];
}) {
  return (
    <ul className="space-y-4">
      {hypotheses.map((h, i) => (
        <li key={h._id} className="bg-background rounded-[16px] p-4">
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-[12px] font-bold flex items-center justify-center">
              {i + 1}
            </span>
            <div>
              <p className="text-[13px] font-semibold text-foreground leading-snug">
                {h.text}
              </p>
              <p className="text-[12px] text-foreground/45 mt-2 leading-relaxed">{h.reasoning}</p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
