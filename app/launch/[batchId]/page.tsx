"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const STEPS = [
  { label: "Analyzing your product", duration: 1200 },
  { label: "Generating hypotheses", duration: 1000 },
  { label: "Creating ad variants", duration: 1400 },
  { label: "Building experiment plan", duration: 800 },
  { label: "Starting simulation", duration: 600 },
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
      router.replace(`/dashboard/${params.batchId}`);
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

  const currentLabel = step < STEPS.length ? STEPS[step].label : "Launching...";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="bg-card rounded-bento shadow-bento p-10 md:p-14 w-full max-w-lg text-center">
        {/* Animated logo */}
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground mb-8">
          Hook<span className="text-primary">Loop</span>
        </h1>

        {/* Spinner ring */}
        <div className="relative w-20 h-20 mx-auto mb-8">
          <svg className="w-20 h-20 animate-spin" viewBox="0 0 80 80">
            <circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              stroke="#F2F2F7"
              strokeWidth="5"
            />
            <circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              stroke="#007AFF"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray="160"
              strokeDashoffset="120"
            />
          </svg>
        </div>

        {/* Current step */}
        <p className="text-[15px] font-semibold text-foreground mb-2">
          {currentLabel}
        </p>

        {/* Step indicators */}
        <div className="flex justify-center gap-3 mb-6">
          {STEPS.map((s, i) => (
            <div
              key={s.label}
              className={`h-1.5 w-8 rounded-full transition-all duration-500 ${
                i < step
                  ? "bg-primary"
                  : i === step
                    ? "bg-primary/40"
                    : "bg-foreground/10"
              }`}
            />
          ))}
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-background rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="text-[12px] text-foreground/30 mt-4">
          Batch {params.batchId}
        </p>
      </div>
    </div>
  );
}
