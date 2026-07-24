import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-background p-6 md:p-10 flex items-center justify-center">
      <div className="w-full max-w-4xl">
        {/* Bento grid layout */}
        <div className="grid grid-cols-4 gap-4 md:gap-5">
          {/* Hero card — 2x2 */}
          <div className="col-span-4 md:col-span-2 row-span-2 bg-card rounded-bento shadow-bento p-8 md:p-10 flex flex-col justify-between min-h-[320px]">
            <div>
              <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-foreground leading-tight">
                Hook<span className="text-primary">Loop</span>
              </h1>
              <p className="mt-4 text-[15px] text-foreground/60 leading-relaxed max-w-sm">
                The autonomous ad experimentation agent. Input your product, get
                hypotheses, variants, simulated campaigns, and clear attribution.
              </p>
            </div>
            <Link
              href="/setup"
              className="mt-8 inline-flex items-center justify-center rounded-[14px] bg-primary text-white px-7 py-3.5 text-[15px] font-semibold hover:bg-primary/90 transition-all duration-200 w-fit shadow-bento"
            >
              Start Experiment
            </Link>
          </div>

          {/* Stat card — 1x1 */}
          <div className="col-span-2 md:col-span-1 bg-card rounded-bento shadow-bento p-6 flex flex-col justify-between min-h-[150px]">
            <span className="text-[13px] font-semibold text-foreground/40 uppercase tracking-wide">Agents</span>
            <div>
              <p className="text-4xl font-bold font-display text-foreground">3</p>
              <p className="text-[13px] text-foreground/50 mt-1">Strategist, Generator, Analyst</p>
            </div>
          </div>

          {/* Stat card — 1x1 */}
          <div className="col-span-2 md:col-span-1 bg-card rounded-bento shadow-bento p-6 flex flex-col justify-between min-h-[150px]">
            <span className="text-[13px] font-semibold text-foreground/40 uppercase tracking-wide">Variants</span>
            <div>
              <p className="text-4xl font-bold font-display text-foreground">8</p>
              <p className="text-[13px] text-foreground/50 mt-1">Unique creative DNA combos</p>
            </div>
          </div>

          {/* Stat card — 1x1 */}
          <div className="col-span-2 md:col-span-1 bg-card rounded-bento shadow-bento p-6 flex flex-col justify-between min-h-[150px]">
            <span className="text-[13px] font-semibold text-foreground/40 uppercase tracking-wide">Simulation</span>
            <div>
              <p className="text-4xl font-bold font-display text-foreground">7</p>
              <p className="text-[13px] text-foreground/50 mt-1">Day campaign with live bandit</p>
            </div>
          </div>

          {/* Loop description card — 1x1 */}
          <div className="col-span-2 md:col-span-1 bg-primary rounded-bento shadow-bento p-6 flex flex-col justify-between min-h-[150px]">
            <span className="text-[13px] font-semibold text-white/60 uppercase tracking-wide">The Loop</span>
            <div>
              <p className="text-white text-[14px] font-medium leading-snug">
                Hypothesize. Generate. Simulate. Analyze. Repeat.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
