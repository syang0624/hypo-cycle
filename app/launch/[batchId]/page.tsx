"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Logo } from "@/components/ui";

const STEPS = [
  { label: "Analyzing your product", duration: 1200 },
  { label: "Generating falsifiable hypotheses", duration: 1000 },
  { label: "Building treatment variants", duration: 1400 },
  { label: "Compiling experiment plan", duration: 800 },
  { label: "Starting simulated campaign", duration: 600 },
];

// How far the backend actually is, mapped onto the visual checklist. The
// timers below are pacing; the real phase can only push the console forward,
// never hold it hostage.
const PHASE_RANK: Record<string, number> = {
  strategizing: 1,
  generating: 2,
  generating_video: 3,
  simulating: 5,
  analyzing: 5,
  complete: 5,
};

export default function LaunchPage({
  params,
}: {
  params: { batchId: string };
}) {
  const router = useRouter();
  const status = useQuery(api.experiments.getStatus, { batchId: params.batchId });
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);

  const isFailed = status?.status === "failed";
  const realRank =
    status?.phase != null
      ? PHASE_RANK[status.phase] ?? 0
      : status?.status === "complete"
        ? STEPS.length
        : 0;

  // Pacing timer — advances one step at a time for a readable console feel.
  useEffect(() => {
    if (isFailed) return;
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
  }, [step, params.batchId, router, isFailed]);

  // If the backend is already ahead of the console (e.g. a revisit mid-cycle),
  // jump forward — once it's simulating, the dashboard is where to watch.
  useEffect(() => {
    if (!isFailed && realRank > step) setStep(realRank);
  }, [realRank, step, isFailed]);

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

          {isFailed ? (
            <div className="p-5">
              <p className="font-mono text-[13px] text-bad">✕ cycle failed to start</p>
              {status?.error && (
                <p className="font-mono text-[11.5px] text-bad/70 mt-2 leading-relaxed">
                  {status.error}
                </p>
              )}
              <div className="flex items-center gap-3 mt-5">
                <Link
                  href="/programs/new"
                  className="rounded-lg bg-primary text-white px-4 py-2 text-[12px] font-semibold hover:bg-primary/90 transition-colors"
                >
                  Start over
                </Link>
                <Link
                  href={`/cycles/${params.batchId}`}
                  className="rounded-lg border border-line px-4 py-2 text-[12px] font-semibold text-muted hover:text-foreground transition-colors"
                >
                  View details
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="p-5 font-mono text-[12.5px] space-y-2.5" aria-live="polite">
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
                <div
                  className="w-full h-1 bg-inset rounded-full overflow-hidden"
                  role="progressbar"
                  aria-valuenow={Math.round(progress)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Cycle provisioning progress"
                >
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-100 ease-linear"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="font-mono text-[10px] text-muted/60 mt-3 truncate">
                  cycle: {params.batchId}
                </p>
              </div>
            </>
          )}
        </div>

        {!isFailed && (
          <p className="text-center font-mono text-[11px] text-muted/60 mt-4">
            <Link href={`/cycles/${params.batchId}`} className="hover:text-muted underline underline-offset-4">
              skip to dashboard →
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
