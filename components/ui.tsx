import Link from "next/link";

// Shared design-system primitives for the dark instrument theme. Keep these
// dumb and presentational — no data fetching, no state.

export function Logo({ href = "/", size = "md" }: { href?: string; size?: "md" | "lg" | "xl" }) {
  const cls =
    size === "xl"
      ? "text-4xl md:text-5xl"
      : size === "lg"
        ? "text-2xl"
        : "text-lg";
  return (
    <Link
      href={href}
      className={`font-display font-bold tracking-tight text-foreground ${cls}`}
    >
      Hypo<span className="text-primary">Cycle</span>
      <span className="text-primary animate-blink">_</span>
    </Link>
  );
}

export function Panel({
  title,
  tone = "default",
  actions,
  children,
  className = "",
}: {
  title?: string;
  tone?: "default" | "primary" | "good" | "bad" | "warn";
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const tick = {
    default: "bg-muted",
    primary: "bg-primary",
    good: "bg-good",
    bad: "bg-bad",
    warn: "bg-warn",
  }[tone];
  return (
    <section className={`bg-panel border border-line rounded-bento p-5 ${className}`}>
      {title && (
        <header className="flex items-center justify-between mb-4">
          <h2 className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            <span className={`h-2 w-2 rounded-[2px] ${tick}`} />
            {title}
          </h2>
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

export function Chip({
  tone = "muted",
  pulse = false,
  children,
}: {
  tone?: "muted" | "primary" | "good" | "bad" | "warn" | "info";
  pulse?: boolean;
  children: React.ReactNode;
}) {
  const styles = {
    muted: "border-line text-muted",
    primary: "border-primary/40 text-primary",
    good: "border-good/40 text-good",
    bad: "border-bad/40 text-bad",
    warn: "border-warn/40 text-warn",
    info: "border-info/40 text-info",
  }[tone];
  const dot = {
    muted: "bg-muted",
    primary: "bg-primary",
    good: "bg-good",
    bad: "bg-bad",
    warn: "bg-warn",
    info: "bg-info",
  }[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border bg-inset px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider ${styles}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot} ${pulse ? "animate-pulse" : ""}`} />
      {children}
    </span>
  );
}

// The mandatory "this is not real campaign data" marker (PRD §18.1).
export function SimBadge() {
  return <Chip tone="warn">Simulated</Chip>;
}

export function Skeleton({ lines }: { lines: number }) {
  const widths = ["92%", "78%", "85%", "70%", "88%"];
  return (
    <div className="space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="animate-shimmer rounded-md h-4"
          style={{ width: widths[i % widths.length] }}
        />
      ))}
    </div>
  );
}
