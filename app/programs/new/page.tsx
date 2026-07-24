import Link from "next/link";
import ProductInputForm from "@/components/ProductInputForm";

// Seed of the New Program Wizard (PRD §17.3). Still collects the ad-template
// inputs against the legacy backend; objective/guardrail/approval fields land
// with Phase 1.
export default function NewProgramPage() {
  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      {/* Header */}
      <div className="max-w-3xl mx-auto mb-6">
        <Link href="/" className="font-display text-xl font-bold tracking-tight text-foreground">
          Hypo<span className="text-primary">Cycle</span>
        </Link>
      </div>

      {/* Form card — bento island */}
      <div className="max-w-3xl mx-auto bg-card rounded-bento shadow-bento p-8 md:p-12">
        <h1 className="font-display text-2xl font-bold text-foreground mb-2">
          Set up your experiment program
        </h1>
        <p className="text-foreground/50 text-[15px] mb-10">
          Tell us about your product and budget. HypoCycle will generate
          falsifiable hypotheses, test ad variants in a simulated campaign, and
          show you the evidence for what works.
        </p>
        <ProductInputForm />
      </div>
    </div>
  );
}
