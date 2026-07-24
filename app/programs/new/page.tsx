import { Logo, Chip } from "@/components/ui";
import ProductInputForm from "@/components/ProductInputForm";

// Seed of the New Program Wizard (PRD §17.3). Still collects the ad-template
// inputs against the legacy backend; objective/guardrail/approval fields land
// with Phase 1.
export default function NewProgramPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <Logo />
          <Chip tone="primary">New program</Chip>
        </div>

        <div className="border border-line rounded-bento bg-panel p-8 md:p-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted mb-3">
            Template · ad-creative optimization
          </p>
          <h1 className="font-display text-3xl font-bold text-foreground mb-3">
            Set up your experiment program
          </h1>
          <p className="text-muted text-[14px] leading-relaxed mb-10 max-w-lg">
            Tell HypoCycle about your product and budget. It will generate
            falsifiable hypotheses, test ad variants in a{" "}
            <span className="text-warn">simulated</span> campaign, and show you
            the evidence for what works.
          </p>
          <ProductInputForm />
        </div>
      </div>
    </div>
  );
}
