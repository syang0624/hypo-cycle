"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEMO_PROGRAM_STORAGE_KEY,
  SAMPLE_PROGRAM,
  type DemoProgram,
} from "@/lib/demoProgram";

const GOALS: Array<{ value: DemoProgram["goal"]; label: string }> = [
  { value: "maximize_trials", label: "Maximize trial signups" },
  { value: "minimize_cac", label: "Minimize customer acquisition cost" },
  { value: "maximize_clicks", label: "Maximize qualified clicks" },
];

const EMPTY_FORM: DemoProgram = {
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

const STEPS = ["Product", "Budget", "Goal & launch"];

export default function ProductInputForm() {
  const router = useRouter();
  const [form, setForm] = useState<DemoProgram>(EMPTY_FORM);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof DemoProgram>(key: K, value: DemoProgram[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function validate(currentStep = step) {
    const next: Record<string, string> = {};

    if (currentStep === 0) {
      for (const key of [
        "name",
        "landingUrl",
        "valueProp",
        "targetCustomer",
        "painPoint",
      ] as const) {
        if (!form[key].trim()) next[key] = "Required";
      }
      if (form.landingUrl && !/^https?:\/\//i.test(form.landingUrl)) {
        next.landingUrl = "Enter a full http:// or https:// URL";
      }
    }

    if (currentStep === 1) {
      if (form.dailyBudget <= 0) next.dailyBudget = "Must be greater than 0";
      if (form.totalBudget < form.dailyBudget) {
        next.totalBudget = "Must be at least the daily budget";
      }
      if (form.maxCPC <= 0) next.maxCPC = "Must be greater than 0";
      if (form.targetCAC <= 0) next.targetCAC = "Must be greater than 0";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function continueToNextStep() {
    if (validate()) setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }

  function launch(input: DemoProgram) {
    setSubmitting(true);
    window.localStorage.setItem(DEMO_PROGRAM_STORAGE_KEY, JSON.stringify(input));
    router.push("/demo");
  }

  function launchSample() {
    setForm(SAMPLE_PROGRAM);
    launch(SAMPLE_PROGRAM);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate(0)) {
      setStep(0);
      return;
    }
    if (!validate(1)) {
      setStep(1);
      return;
    }
    launch(form);
  }

  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-4 rounded-lg border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-[13px] font-semibold text-foreground">
            Want to see the complete loop immediately?
          </p>
          <p className="mt-0.5 text-[12px] text-muted">
            Launch the sample campaign with one click.
          </p>
        </div>
        <button
          type="button"
          onClick={launchSample}
          disabled={submitting}
          className="flex-shrink-0 rounded-lg border border-primary/50 bg-primary/10 px-4 py-2 text-[13px] font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
        >
          Launch sample →
        </button>
      </div>

      <ol className="mb-8 flex flex-wrap items-center gap-2" aria-label="Setup steps">
        {STEPS.map((label, index) => (
          <li key={label} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => index < step && setStep(index)}
              disabled={index > step}
              aria-current={index === step ? "step" : undefined}
              className={`rounded-md border px-3 py-1.5 font-mono text-[11px] font-semibold transition-colors ${
                index === step
                  ? "border-primary/60 bg-primary/10 text-primary"
                  : index < step
                    ? "border-good/40 text-good hover:bg-good/10"
                    : "cursor-default border-line text-muted/50"
              }`}
            >
              {index < step ? "✓" : `0${index + 1}`} {label}
            </button>
            {index < STEPS.length - 1 && (
              <span className="font-mono text-[11px] text-line">─</span>
            )}
          </li>
        ))}
      </ol>

      <form onSubmit={handleSubmit} className="space-y-8">
        {step === 0 && (
          <fieldset className="animate-fadeIn space-y-5">
            <Field label="Product name" error={errors.name}>
              <input
                autoFocus
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
                placeholder="e.g. Coca-Cola"
                className={inputClass(errors.name)}
              />
            </Field>
            <Field label="Landing page URL" error={errors.landingUrl}>
              <input
                type="url"
                value={form.landingUrl}
                onChange={(event) => update("landingUrl", event.target.value)}
                placeholder="https://..."
                className={inputClass(errors.landingUrl)}
              />
            </Field>
            <Field label="Value proposition" error={errors.valueProp}>
              <textarea
                value={form.valueProp}
                onChange={(event) => update("valueProp", event.target.value)}
                placeholder="What does the product do, and why should people care?"
                rows={2}
                className={inputClass(errors.valueProp)}
              />
            </Field>
            <Field label="Target customer" error={errors.targetCustomer}>
              <input
                value={form.targetCustomer}
                onChange={(event) => update("targetCustomer", event.target.value)}
                placeholder="Who is this campaign for?"
                className={inputClass(errors.targetCustomer)}
              />
            </Field>
            <Field label="Pricing">
              <input
                value={form.pricing}
                onChange={(event) => update("pricing", event.target.value)}
                placeholder="e.g. $99/month"
                className={inputClass()}
              />
            </Field>
            <Field label="Pain point" error={errors.painPoint}>
              <textarea
                value={form.painPoint}
                onChange={(event) => update("painPoint", event.target.value)}
                placeholder="What problem does the customer have right now?"
                rows={2}
                className={inputClass(errors.painPoint)}
              />
            </Field>
          </fieldset>
        )}

        {step === 1 && (
          <fieldset className="animate-fadeIn">
            <div className="grid gap-4 sm:grid-cols-2">
              <NumberField
                label="Daily budget ($)"
                value={form.dailyBudget}
                error={errors.dailyBudget}
                onChange={(value) => update("dailyBudget", value)}
              />
              <NumberField
                label="Total budget ($)"
                value={form.totalBudget}
                error={errors.totalBudget}
                onChange={(value) => update("totalBudget", value)}
              />
              <NumberField
                label="Max CPC ($)"
                value={form.maxCPC}
                error={errors.maxCPC}
                step={0.01}
                onChange={(value) => update("maxCPC", value)}
              />
              <NumberField
                label="Target CAC ($)"
                value={form.targetCAC}
                error={errors.targetCAC}
                step={0.01}
                onChange={(value) => update("targetCAC", value)}
              />
            </div>
            <p className="mt-4 font-mono text-[11px] text-muted">
              The browser demo uses simulated metrics and never spends real budget.
            </p>
          </fieldset>
        )}

        {step === 2 && (
          <fieldset className="animate-fadeIn space-y-5">
            <div className="space-y-3">
              {GOALS.map((goal) => (
                <label
                  key={goal.value}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3.5 transition-colors ${
                    form.goal === goal.value
                      ? "border-primary/60 bg-primary/10"
                      : "border-line bg-inset hover:border-muted/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="goal"
                    checked={form.goal === goal.value}
                    onChange={() => update("goal", goal.value)}
                    className="accent-primary"
                  />
                  <span className="text-[14px] font-medium text-foreground">
                    {goal.label}
                  </span>
                </label>
              ))}
            </div>
            <div className="space-y-1 rounded-lg border border-line bg-inset p-4 font-mono text-[11.5px] text-muted">
              <p>
                product: <span className="text-foreground">{form.name}</span>
              </p>
              <p>
                budget: <span className="text-foreground">${form.dailyBudget}/day</span>
                {" · "}total <span className="text-foreground">${form.totalBudget}</span>
              </p>
              <p className="text-warn">
                Campaign metrics are simulated and clearly labeled.
              </p>
            </div>
          </fieldset>
        )}

        <div className="flex items-center gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((current) => current - 1)}
              className="rounded-lg border border-line px-5 py-3 text-[13px] font-semibold text-muted transition-colors hover:text-foreground"
            >
              ← Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              key="continue"
              type="button"
              onClick={(event) => {
                event.preventDefault();
                continueToNextStep();
              }}
              className="flex-1 rounded-lg bg-primary py-3 text-[14px] font-semibold text-white shadow-glow transition-colors hover:bg-primary/90"
            >
              Continue →
            </button>
          ) : (
            <button
              key="launch"
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-lg bg-primary py-3 text-[14px] font-semibold text-white shadow-glow transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? "Opening results…" : "Launch simulated experiment"}
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
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-foreground/80">
        {label}
      </span>
      {children}
      {error && <span className="mt-1.5 block font-mono text-[11px] text-bad">{error}</span>}
    </label>
  );
}

function NumberField({
  label,
  value,
  error,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  error?: string;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <Field label={label} error={error}>
      <input
        type="number"
        min={step}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className={inputClass(error)}
      />
    </Field>
  );
}

function inputClass(error?: string) {
  return `w-full rounded-lg border bg-inset px-4 py-3 text-[14px] text-foreground outline-none transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/20 placeholder:text-muted/50 ${
    error ? "border-bad/60" : "border-line"
  }`;
}
