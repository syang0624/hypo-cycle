import Link from "next/link";
import { Logo, Chip } from "@/components/ui";

const CYCLE_STEPS = [
  "observe",
  "hypothesize",
  "design",
  "execute",
  "evaluate",
  "decide",
  "learn",
];

const PRINCIPLES = [
  {
    title: "Falsifiable by design",
    body: "No hypothesis runs without a predicted result and the condition that would disprove it. Beliefs are testable or they don't ship.",
  },
  {
    title: "Control before optimization",
    body: "Every treatment is measured against an immutable baseline under the same conditions. No control, no conclusion.",
  },
  {
    title: "Evidence over narrative",
    body: "Decisions cite metrics, evaluator versions, and uncertainty — never a bare “the agent thinks this is better.”",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background bg-grid">
      <div className="mx-auto max-w-5xl px-6 py-8 flex flex-col min-h-screen">
        {/* Nav */}
        <nav className="flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3">
            <Link
              href="/programs/new"
              className="rounded-lg border border-primary/40 bg-primary/5 px-4 py-2 text-[13px] font-semibold text-primary transition-colors hover:bg-primary/10"
            >
              New program
            </Link>
            <Link
              href="/demo"
              className="rounded-lg border border-line bg-panel px-4 py-2 text-[13px] font-semibold text-foreground hover:border-primary/50 transition-colors"
            >
              Explore demo
            </Link>
            <Link
              href="/sandbox"
              className="rounded-lg border border-good/40 bg-good/5 px-4 py-2 text-[13px] font-semibold text-good hover:bg-good/10 transition-colors"
            >
              Live sandbox
            </Link>
          </div>
        </nav>

        {/* Hero */}
        <main className="flex-1 flex flex-col justify-center py-16">
          <Chip tone="primary">Autonomous experimentation</Chip>

          <h1 className="mt-6 font-display text-5xl md:text-7xl font-bold tracking-tight leading-[1.05] max-w-3xl">
            Give your AI agents a{" "}
            <span className="text-primary">scientific method</span>.
          </h1>

          <p className="mt-6 text-[16px] text-muted leading-relaxed max-w-xl">
            HypoCycle turns an objective into falsifiable hypotheses, runs
            controlled experiments against a baseline, and adopts only what the
            evidence supports — cycle after cycle.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/programs/new"
              className="rounded-lg bg-primary px-6 py-3 text-[14px] font-semibold text-white shadow-glow transition-all hover:bg-primary/90"
            >
              Start an experiment →
            </Link>
            <Link
              href="/demo"
              className="rounded-lg border border-line bg-panel px-6 py-3 text-[14px] font-semibold text-foreground transition-colors hover:border-primary/50"
            >
              Explore the demo
            </Link>
            <Link
              href="/sandbox"
              className="rounded-lg border border-good/40 bg-good/5 px-6 py-3 text-[14px] font-semibold text-good hover:bg-good/10 transition-colors"
            >
              Run live sandbox →
            </Link>
            <span className="font-mono text-[11px] uppercase tracking-wider text-muted">
              Demo stays static · live tools are separate
            </span>
          </div>

          {/* The cycle */}
          <div className="mt-16 border border-line rounded-bento bg-panel/70 backdrop-blur-sm px-5 py-4 overflow-x-auto">
            <div className="flex items-center gap-3 font-mono text-[12px] whitespace-nowrap">
              {CYCLE_STEPS.map((step, i) => (
                <span key={step} className="flex items-center gap-3">
                  <span className="text-muted">
                    <span className="text-primary font-semibold">{i + 1}</span>{" "}
                    {step}
                  </span>
                  {i < CYCLE_STEPS.length - 1 ? (
                    <span className="text-line">─▶</span>
                  ) : (
                    <span className="text-primary">⟲</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        </main>

        {/* Principles */}
        <section className="grid gap-4 md:grid-cols-3 pb-10">
          {PRINCIPLES.map((p, i) => (
            <div
              key={p.title}
              className="border border-line rounded-bento bg-panel p-6"
            >
              <span className="font-mono text-[11px] text-primary font-semibold">
                0{i + 1}
              </span>
              <h3 className="mt-2 font-display text-[16px] font-bold text-foreground">
                {p.title}
              </h3>
              <p className="mt-2 text-[13px] text-muted leading-relaxed">{p.body}</p>
            </div>
          ))}
        </section>

        {/* Footer */}
        <footer className="border-t border-line py-5 flex items-center justify-between font-mono text-[11px] text-muted">
          <span>hypocycle · evidence-driven improvement for AI agents</span>
          <span className="text-warn">campaign metrics are simulated & labeled</span>
        </footer>
      </div>
    </div>
  );
}
