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

export default function ProductInputForm() {
  const router = useRouter();
  const createProduct = useMutation(api.products.create);
  const startBatch = useMutation(api.experiments.startBatch);
  const [form, setForm] = useState<ProductInput>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
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

  function validate(): boolean {
    const next: Partial<Record<keyof ProductInput, string>> = {};
    if (!form.name.trim()) next.name = "Required";
    if (!form.landingUrl.trim()) next.landingUrl = "Required";
    if (!form.valueProp.trim()) next.valueProp = "Required";
    if (!form.targetCustomer.trim()) next.targetCustomer = "Required";
    if (!form.painPoint.trim()) next.painPoint = "Required";
    if (form.dailyBudget <= 0) next.dailyBudget = "Must be > 0";
    if (form.totalBudget <= 0) next.totalBudget = "Must be > 0";
    if (form.totalBudget < form.dailyBudget) next.totalBudget = "Must be >= daily budget";
    if (form.maxCPC <= 0) next.maxCPC = "Must be > 0";
    if (form.targetCAC <= 0) next.targetCAC = "Must be > 0";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const { productId } = await createProduct(form);
      const batchId = await startBatch({ productId });
      router.push(`/launch/${batchId}`);
    } finally {
      setSubmitting(false);
    }
  }

  function prefillSample() {
    setForm({
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
    });
    setErrors({});
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      {/* Dev helper */}
      <button
        type="button"
        onClick={prefillSample}
        className="text-[13px] text-primary font-medium hover:text-primary/80 transition-colors"
      >
        Prefill with Coca-Cola sample data
      </button>

      {/* Group 1: Product Details */}
      <fieldset className="space-y-5">
        <legend className="font-display text-lg font-bold text-foreground">Product Details</legend>

        <Field label="Product Name" error={errors.name}>
          <input
            type="text"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="e.g. Coca-Cola"
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

      {/* Group 2: Budget */}
      <fieldset className="space-y-4">
        <legend className="font-display text-lg font-bold text-foreground">Budget</legend>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Daily Budget ($)" error={errors.dailyBudget}>
            <input
              type="number"
              min={1}
              value={form.dailyBudget}
              onChange={(e) => update("dailyBudget", Number(e.target.value))}
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
      </fieldset>

      {/* Group 3: Existing Creative */}
      <fieldset className="space-y-4">
        <legend className="font-display text-lg font-bold text-foreground">Existing Creative</legend>
        <p className="text-sm text-gray-500">
          Describe any past ads, reels, or creative assets you have. File upload coming soon.
        </p>
        <textarea
          placeholder="e.g. We ran 3 LinkedIn video ads last quarter. Best performer was a 30s founder-to-camera style with pain-point hook, got 2.1% CTR..."
          rows={3}
          className={inputClass()}
        />
      </fieldset>

      {/* Group 4: Experiment Goal */}
      <fieldset className="space-y-3">
        <legend className="font-display text-lg font-bold text-foreground">Experiment Goal</legend>

        {GOALS.map((g) => (
          <label
            key={g.value}
            className={`flex items-center gap-3 cursor-pointer rounded-[14px] p-3.5 transition-all duration-200 ${
              form.goal === g.value
                ? "bg-primary/10 ring-2 ring-primary"
                : "bg-background hover:bg-background/80"
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
      </fieldset>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-[14px] bg-primary text-white py-3.5 text-[15px] font-semibold hover:bg-primary/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-bento"
      >
        {submitting ? "Launching experiment..." : "Launch Experiment"}
      </button>
    </form>
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
      <label className="block text-[13px] font-semibold text-foreground/60 mb-1.5">
        {label}
      </label>
      {children}
      {error && <p className="text-red-500 text-[12px] font-medium mt-1.5">{error}</p>}
    </div>
  );
}

function inputClass(error?: string) {
  return `w-full rounded-[12px] border-none bg-background px-4 py-3 text-[14px] text-foreground outline-none transition-all duration-200 focus:ring-2 focus:ring-primary/30 placeholder:text-foreground/30 ${
    error ? "ring-2 ring-red-400" : ""
  }`;
}
