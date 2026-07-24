import Link from "next/link";
import ProductInputForm from "@/components/ProductInputForm";

export default function SetupPage() {
  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      {/* Header */}
      <div className="max-w-3xl mx-auto mb-6">
        <Link href="/" className="font-display text-xl font-bold tracking-tight text-foreground">
          Hook<span className="text-primary">Loop</span>
        </Link>
      </div>

      {/* Form card — bento island */}
      <div className="max-w-3xl mx-auto bg-card rounded-bento shadow-bento p-8 md:p-12">
        <h1 className="font-display text-2xl font-bold text-foreground mb-2">
          Set up your experiment
        </h1>
        <p className="text-foreground/50 text-[15px] mb-10">
          Tell us about your product and budget. HookLoop will generate ad
          variants, run a simulated campaign, and show you what works.
        </p>
        <ProductInputForm />
      </div>
    </div>
  );
}
