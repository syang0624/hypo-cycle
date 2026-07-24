"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { MOCK_PRODUCT } from "@/lib/mockData";
import type { ProductInput } from "@/lib/types";

const GOALS = [
  { value: "maximize_trials", label: "Maximize trial signups" },
  { value: "minimize_cac", label: "Minimize CAC" },
  { value: "maximize_clicks", label: "Maximize qualified clicks" },
] as const;

const EMPTY_FORM: ProductInput = {
  name: "",
  landingUrl: "",
  valueProp: "",
  targetCustomer: "",
  pricing: "",
  painPoint: "",
  dailyBudget: 100,
  totalBudget: 1000,
  maxCPC: 5,
  targetCAC: 100,
  goal: "maximize_trials",
};

// Wizard steps. Fields are validated per-step so the user is never staring at
// eleven required inputs at once.
const STEPS = [
  { id: "product", label: "Product" },
  { id: "budget", label: "Budget" },
  { id: "goal", label: "Goal & launch" },
] as const;

const STEP_FIELDS: Record<number, (keyof ProductInput)[]> = {
  0: ["name", "landingUrl", "valueProp", "targetCustomer", "pricing", "painPoint"],
  1: ["dailyBudget", "totalBudget", "maxCPC", "targetCAC"],
  2: ["goal"],
};

export default function ProductInputForm() {
  const router = useRouter();
  const createProduct = useMutation(api.products.create);
  const startBatch = useMutation(api.experiments.startBatch);
  const [form, setForm] = useState<ProductInput>(EMPTY_FORM);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof ProductInput, string>>>({});

  function update<K extends keyof ProductInput>(key: K, value: ProductInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  function validateFields(fields: (keyof ProductInput)[]): boolean {
    const next: Partial<Record<keyof ProductInput, string>> = {};
    for (const f of fields) {
      if (f === "name" && !form.name.trim()) next.name = "Required";
      if (f === "landingUrl" && !form.landingUrl.trim()) next.landingUrl = "Required";
      if (f === "valueProp" && !form.valueProp.trim()) next.valueProp = "Required";
      if (f === "targetCustomer" && !form.targetCustomer.trim()) next.targetCustomer = "Required";
      if (f === "painPoint" && !form.painPoint.trim()) next.painPoint = "Required";
      if (f === "dailyBudget" && form.dailyBudget <= 0) next.dailyBudget = "Must be > 0";
      if (f === "totalBudget") {
        if (form.totalBudget <= 0) next.totalBudget = "Must be > 0";
        else if (form.totalBudget < form.dailyBudget) next.totalBudget = "Must be >= daily budget";
      }
      if (f === "maxCPC" && form.maxCPC <= 0) next.maxCPC = "Must be > 0";
      if (f === "targetCAC" && form.targetCAC <= 0) next.targetCAC = "Must be > 0";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleNext() {
    if (!validateFields(STEP_FIELDS[step])) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function launch(input: ProductInput) {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const { productId } = await createProduct(input);
      const batchId = await startBatch({ productId });
      router.push(`/launch/${batchId}`);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Something went wrong starting the experiment.",
      );
      setSubmitting(false);
    }
    // Deliberately no finally: on success we keep `submitting` true so the
    // button stays disabled while the router navigates away.
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateFields([...STEP_FIELDS[0], ...STEP_FIELDS[1], ...STEP_FIELDS[2]])) return;
    await launch(form);
  }

  // One-click judge/demo path: prefill the sample product and launch
  // immediately — no form-walking required.
  async function launchDemo() {
    const demo: ProductInput = {
      name: MOCK_PRODUCT.name,
      landingUrl: MOCK_PRODUCT.landingUrl,
      valueProp: MOCK_PRODUCT.valueProp,
      targetCustomer: MOCK_PRODUCT.targetCustomer,
      pricing: MOCK_PRODUCT.pricing,
      painPoint: MOCK_PRODUCT.painPoint,
      dailyBudget: MOCK_PRODUCT.dailyBudget,
      totalBudget: MOCK_PRODUCT.totalBudget,
      maxCPC: MOCK_PRODUCT.maxCPC,
      targetCAC: MOCK_PRODUCT.targetCAC,
      goal: MOCK_PRODUCT.goal,
    };
    setForm(demo);
    await launch(demo);
  }

  return (
    <div>
      {/* Demo quick-start */}
      <div className="flex items-center justify-between gap-4 border border-primary/30 bg-primary/5 rounded-lg p-4 mb-8">
        <div>
          <p className="text-[13px] font-semibold text-foreground">
            Just want to see the loop run?
          </p>
          <p className="text-[12px] text-muted mt-0.5">
            Launch the Coca-Cola sample campaign with one click.
          </p>
        </div>
        <button
          type="button"
          onClick={launchDemo}
          disabled={submitting}
          className="flex-shrink-0 rounded-lg border border-primary/50 bg-primary/10 px-4 py-2 text-[13px] font-semibold text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          {submitting ? "Launching…" : "Launch demo →"}
        </button>
      </div>

      {/* Step indicator */}
      <ol className="flex items-center gap-2 mb-8" aria-label="Setup steps">
        {STEPS.map((s, i) => (
          <li key={s.id} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => i < step && setStep(i)}
              disabled={i > step}
              aria-current={i === step ? "step" : undefined}
              className={`flex items-center gap-2 rounded-md border px-3 py-1.5 font-mono text-[11px] font-semibold transition-colors ${
                i === step
                  ? "border-primary/60 bg-primary/10 text-primary"
                  : i < step
                    ? "border-good/40 text-good hover:bg-good/10 cursor-pointer"
                    : "border-line text-muted/50 cursor-default"
              }`}
            >
              {i < step ? "✓" : `0${i + 1}`} {s.label}
            </button>
            {i < STEPS.length - 1 && <span className="text-line font-mono text-[11px]">─</span>}
          </li>
        ))}
      </ol>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Step 1 — Product */}
        {step === 0 && (
          <fieldset className="space-y-5 animate-fadeIn">
            <Field label="Product Name" error={errors.name}>
              <input
                type="text"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="e.g. Coca-Cola"
                autoFocus
                className={inputClass(errors.name)}
              />
            </Field>

            <Field label="Landing Page URL" error={errors.landingUrl}>
              <input
                type="url"
                value={form.landingUrl}
                onChange={(e) => update("landingUrl", e.target.value)}
                placeholder="https://..."
                className={inputClass(errors.landingUrl)}
              />
            </Field>

            <Field label="Value Proposition" error={errors.valueProp}>
              <textarea
                value={form.valueProp}
                onChange={(e) => update("valueProp", e.target.value)}
                placeholder="What does your product do and why should people care?"
                rows={2}
                className={inputClass(errors.valueProp)}
              />
            </Field>

            <Field label="Target Customer" error={errors.targetCustomer}>
              <input
                type="text"
                value={form.targetCustomer}
                onChange={(e) => update("targetCustomer", e.target.value)}
                placeholder="e.g. B2B SaaS founders doing outbound sales"
                className={inputClass(errors.targetCustomer)}
              />
            </Field>

            <Field label="Pricing" error={errors.pricing}>
              <input
                type="text"
                value={form.pricing}
                onChange={(e) => update("pricing", e.target.value)}
                placeholder="e.g. $99/mo starter, $299/mo growth"
                className={inputClass(errors.pricing)}
              />
            </Field>

            <Field label="Pain Point" error={errors.painPoint}>
              <textarea
                value={form.painPoint}
                onChange={(e) => update("painPoint", e.target.value)}
                placeholder="What problem does your customer have right now?"
                rows={2}
                className={inputClass(errors.painPoint)}
              />
            </Field>
          </fieldset>
        )}

        {/* Step 2 — Budget */}
        {step === 1 && (
          <fieldset className="animate-fadeIn">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Daily Budget ($)" error={errors.dailyBudget}>
                <input
                  type="number"
                  min={1}
                  value={form.dailyBudget}
                  onChange={(e) => update("dailyBudget", Number(e.target.value))}
                  autoFocus
                  className={inputClass(errors.dailyBudget)}
                />
              </Field>

              <Field label="Total Budget ($)" error={errors.totalBudget}>
                <input
                  type="number"
                  min={1}
                  value={form.totalBudget}
                  onChange={(e) => update("totalBudget", Number(e.target.value))}
                  className={inputClass(errors.totalBudget)}
                />
              </Field>

              <Field label="Max CPC ($)" error={errors.maxCPC}>
                <input
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={form.maxCPC}
                  onChange={(e) => update("maxCPC", Number(e.target.value))}
                  className={inputClass(errors.maxCPC)}
                />
              </Field>

              <Field label="Target CAC ($)" error={errors.targetCAC}>
                <input
                  type="number"
                  min={1}
                  value={form.targetCAC}
                  onChange={(e) => update("targetCAC", Number(e.target.value))}
                  className={inputClass(errors.targetCAC)}
                />
              </Field>
            </div>
            <p className="font-mono text-[11px] text-muted mt-4">
              Budget is a hard constraint — the simulated campaign never spends past it.
            </p>
          </fieldset>
        )}

        {/* Step 3 — Goal + optional creative context */}
        {step === 2 && (
          <fieldset className="space-y-6 animate-fadeIn">
            <div className="space-y-3">
              {GOALS.map((g) => (
                <label
                  key={g.value}
                  className={`flex items-center gap-3 cursor-pointer rounded-lg border p-3.5 transition-all duration-200 ${
                    form.goal === g.value
                      ? "border-primary/60 bg-primary/10"
                      : "border-line bg-inset hover:border-muted/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="goal"
                    value={g.value}
                    checked={form.goal === g.value}
                    onChange={(e) => update("goal", e.target.value)}
                    className="accent-primary"
                  />
                  <span className="text-[14px] font-medium text-foreground">{g.label}</span>
                </label>
              ))}
            </div>

            <div>
              <p className="text-[13px] font-medium text-foreground/80 mb-1.5">
                Existing creative <span className="text-muted font-normal">(optional)</span>
              </p>
              <textarea
                placeholder="e.g. We ran 3 LinkedIn video ads last quarter. Best performer was a 30s founder-to-camera style with pain-point hook, got 2.1% CTR..."
                rows={3}
                className={inputClass()}
              />
            </div>

            {/* Review strip */}
            <div className="border border-line bg-inset rounded-lg p-4 font-mono text-[11.5px] text-muted space-y-1">
              <p>
                product: <span className="text-foreground">{form.name || "—"}</span>
              </p>
              <p>
                budget: <span className="text-foreground">${form.dailyBudget}/day</span> · total{" "}
                <span className="text-foreground">${form.totalBudget}</span> · max CPC{" "}
                <span className="text-foreground">${form.maxCPC}</span> · target CAC{" "}
                <span className="text-foreground">${form.targetCAC}</span>
              </p>
              <p className="text-warn">campaign runs in simulation — clearly labeled, no ad spend</p>
            </div>
          </fieldset>
        )}

        {submitError && (
          <div className="border border-bad/40 bg-bad/10 rounded-lg p-4">
            <p className="text-[13px] font-semibold text-bad">Launch failed</p>
            <p className="font-mono text-[12px] text-bad/70 mt-1">{submitError}</p>
          </div>
        )}

        {/* Nav buttons */}
        <div className="flex items-center gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="rounded-lg border border-line px-5 py-3 text-[13px] font-semibold text-muted hover:text-foreground hover:border-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              ← Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex-1 rounded-lg bg-primary text-white py-3 text-[14px] font-semibold hover:bg-primary/90 transition-all duration-200 shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              Continue →
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-lg bg-primary text-white py-3 text-[14px] font-semibold hover:bg-primary/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              {submitting ? "Launching experiment…" : submitError ? "Retry launch" : "Launch experiment"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[13px] font-medium text-foreground/80 mb-1.5">
        {label}
      </label>
      {children}
      {error && <p className="text-bad font-mono text-[11px] font-medium mt-1.5">{error}</p>}
    </div>
  );
}

function inputClass(error?: string) {
  return `w-full rounded-lg border bg-inset px-4 py-3 text-[14px] text-foreground outline-none transition-all duration-200 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 placeholder:text-muted/50 ${
    error ? "border-bad/60" : "border-line"
  }`;
}
