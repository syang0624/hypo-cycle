"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui";

const STEPS = [
  { label: "Analyzing your product", duration: 1200 },
  { label: "Generating falsifiable hypotheses", duration: 1000 },
  { label: "Building treatment variants", duration: 1400 },
  { label: "Compiling experiment plan", duration: 800 },
  { label: "Starting simulated campaign", duration: 600 },
];

export default function LaunchPage({
  params,
}: {
  params: { batchId: string };
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (step >= STEPS.length) {
      router.replace(`/cycles/${params.batchId}`);
      return;
    }

    const duration = STEPS[step].duration;
    const interval = 30;
    let elapsed = 0;

    const timer = setInterval(() => {
      elapsed += interval;
      const stepProgress = elapsed / duration;
      const overall = ((step + stepProgress) / STEPS.length) * 100;
      setProgress(Math.min(overall, 100));

      if (elapsed >= duration) {
        clearInterval(timer);
        setStep((s) => s + 1);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [step, params.batchId, router]);

  return (
    <div className="min-h-screen bg-background bg-grid flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Logo size="lg" />
        </div>

        {/* Provisioning console */}
        <div className="border border-line rounded-bento bg-panel overflow-hidden">
          <div className="flex items-center gap-2 border-b border-line bg-inset px-4 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-bad/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-warn/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-good/60" />
            <span className="ml-2 font-mono text-[11px] text-muted">
              hypocycle · provisioning cycle
            </span>
          </div>

          <div className="p-5 font-mono text-[12.5px] space-y-2.5">
            {STEPS.map((s, i) => (
              <div key={s.label} className="flex items-center gap-2.5">
                {i < step ? (
                  <span className="text-good">✓</span>
                ) : i === step ? (
                  <span className="text-primary animate-blink">▸</span>
                ) : (
                  <span className="text-line">·</span>
                )}
                <span
                  className={
                    i < step
                      ? "text-muted"
                      : i === step
                        ? "text-foreground"
                        : "text-muted/40"
                  }
                >
                  {s.label}
                  {i === step && <span className="animate-blink">…</span>}
                </span>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="px-5 pb-5">
            <div className="w-full h-1 bg-inset rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-100 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="font-mono text-[10px] text-muted/60 mt-3 truncate">
              cycle: {params.batchId}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
