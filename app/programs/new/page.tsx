import Link from "next/link";
import ProductInputForm from "@/components/ProductInputForm";
import { Chip, Logo } from "@/components/ui";

export default function NewProgramPage() {
  return (
    <div className="min-h-screen bg-background bg-grid">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <nav className="mb-10 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3">
            <Chip tone="primary">New program</Chip>
            <Link
              href="/"
              className="font-mono text-[11px] text-muted transition-colors hover:text-foreground"
            >
              Back home
            </Link>
          </div>
        </nav>

        <main className="rounded-bento border border-line bg-panel p-6 sm:p-10">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
            Template · ad-creative optimization
          </p>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Set up your experiment program
          </h1>
          <p className="mb-10 mt-3 max-w-lg text-[14px] leading-relaxed text-muted">
            Define the product, budget, and objective. HypoCycle will open a
            fixture-backed campaign so the complete interaction works locally.
          </p>
          <ProductInputForm />
        </main>
      </div>
    </div>
  );
}
