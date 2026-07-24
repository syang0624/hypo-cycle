# HookLoop — Project Context for Claude Code

This file is read by every Claude Code session in this repo. It defines what we're building, the rules of engagement, and the contracts between Steven and Nori. **Read this first, then read STEVEN.md or NORI.md depending on which branch you're on.**

---

## What we're building

HookLoop is an **autonomous paid-ad experimentation agent** for startups. A founder inputs their product, marketing budget, past reels, and CAC/CPC data. The agent generates creative hypotheses, produces short-form ad variants with structured metadata, builds a test plan with kill/scale rules, simulates the campaign, explains which creative variables drove CPC and CAC, and automatically generates the next batch.

**This is not an AI reel generator.** It is a self-improving growth-engineering agent that happens to generate reels as one step in its loop. If you find yourself making the demo about pretty videos, stop and refocus on the loop.

### The loop

1. User inputs product + budget + past creative
2. Strategist agent analyzes and generates hypotheses
3. Generator agent produces 8 ad variants with structured DNA metadata
4. Experiment plan is created (budget allocation, kill/scale rules)
5. Simulator runs a "3-day campaign"
6. Analyst agent explains what worked and why, attributing performance to specific DNA dimensions
7. Strategist generates the next batch from the brief
8. Repeat

### Non-negotiable design rules

- **CAC is primary, CPC is secondary.** Never let the system optimize on CPC alone — that learns to buy garbage clicks. Bandit allocation is gated on a CVR floor.
- **Three agents, not six.** Strategist, Generator, Analyst. Do not split further.
- **Mode A only.** The hackathon demo runs the heuristic simulator. No live Meta/TikTok API calls.
- **The simulator must be defensible.** Heuristic weights with documented priors + LLM commentary explaining the numbers. Not random noise dressed up.
- **Convex is real-time-reactive.** Use `useQuery` for live dashboard updates. This is also the Best Use of Convex prize criterion ($1,000 first / $500 second) — design for it.

---

## Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind, Recharts, lucide-react
- **Backend**: Convex (database + actions + scheduled functions)
- **AI**: OpenAI (GPT-class with structured outputs)
- **Deploy target**: Local for hackathon demo; Vercel + Convex Cloud if time

---

## File ownership (HARD RULE)

Do not edit files outside your zone. If you need a contract change, leave a `// TODO(other-person):` comment and tell the other human.

### Steven owns

```
app/**
components/**
lib/types.ts          (shared — Steven owns the shape, Nori reads)
lib/mockData.ts       (Steven only)
public/**
tailwind.config.ts
```

### Nori owns

```
convex/**
lib/agents/**
lib/simulator/**
lib/bandit.ts
```

### Both touch (coordinate in chat)

```
package.json          (only when adding deps — flag in chat first)
.env.local            (only when adding env vars — flag in chat first)
README.md
```

---

## Branching

- `main` — clean, never push directly during Phase 1
- `steven` — Steven's branch, frontend work
- `nori` — Nori's branch, backend + AI work

Commit often. Push to your branch every ~30 minutes so the other side can pull if they need a contract.

---

## The Convex schema (source of truth)

Both sides depend on this. It's already in `convex/schema.ts`. If it changes, both sides need to know.

```ts
products: {
  name, landingUrl, valueProp, targetCustomer, pricing, painPoint,
  dailyBudget, totalBudget, maxCPC, targetCAC, goal
}

hypotheses: {
  productId, batchId, text, reasoning
}

ad_variants: {
  productId, batchId,
  hookType, scriptType, voice, music, pacing, cta, audience,
  script, hypothesis, budget, killRule, scaleRule,
  videoStatus?: "pending" | "ready" | "failed",   // generated async (Sora)
  videoUrl?, videoJobId?, videoError?
}

experiment_runs: {
  productId, batchId, status: "running" | "complete", startedAt
}

campaign_metrics: {
  variantId, batchId, day,
  impressions, clicks, conversions, spend,
  cpc, ctr, cac, cvr
}
```

---

## Contracts between frontend and backend

These are the only Convex functions the frontend calls. If the frontend needs a new one, Steven tells Nori in chat — does NOT write it.

### Queries (reactive — Steven uses `useQuery`)

- `products.getById(productId)` → `Product | null`
- `variants.listByBatch(batchId)` → `Variant[]`
- `metrics.liveMetrics(batchId)` → `Metric[]` (streams as simulator runs)
- `hypotheses.listByBatch(batchId)` → `Hypothesis[]`
- `experiments.getStatus(batchId)` → `{ status, progress }`

### Mutations (Steven uses `useMutation`)

- `products.create(input)` → `productId`
- `experiments.startBatch(productId)` → `batchId` (triggers full loop)

### Actions (called by mutations — Steven doesn't call directly)

- `agents.runStrategist`
- `agents.runGenerator`
- `agents.runAnalyst`
- `simulator.runCampaign`

### Video reels (Nori → Steven)

`ad_variants` rows now carry `videoStatus` (`"pending"|"ready"|"failed"`),
`videoUrl`, `videoError` — generated async after the Generator and streamed in
via the existing `variants.listByBatch` (no new query). `TODO(steven)`:
`VariantCard` renders `<video src={variant.videoUrl} autoPlay muted loop playsInline>`
when `videoStatus === "ready"`, a "generating reel…" spinner on `"pending"`, and
the current text-only card as fallback on `"failed"`/absent.

---

## Conventions

- **TypeScript strict.** No `any` unless you leave a `// FIXME` comment.
- **No barrel files** (`index.ts` re-exports). Direct imports only.
- **Components are functions**, not classes. Hooks at the top.
- **No global state libraries.** Convex queries are the state.
- **Styling**: Tailwind utility classes. No CSS files except `globals.css`.
- **Loading states are required.** Every `useQuery` consumer handles `undefined` (Convex's "loading" sentinel).
- **Don't catch errors silently.** Let them surface — we want to see what breaks.

---

## What we are NOT building (out of scope)

- Live Meta / TikTok API integration (architected for, never called)
- Auth, billing, multi-tenancy
- Brand safety classifier
- Real video assembly (FFmpeg / editing / captions / music). Sora returns
  finished raw clips; no manual assembly.

If you find yourself building any of the above, stop.

> SCOPE UPDATE (2026-06-28): Per-variant **Sora video reels are now in scope** —
> generated async as one step in the loop, directed by the prior batch's Analyst
> feedback so the reels improve each loop. This deliberately reverses the earlier
> "no video generation / use a placeholder" rule. The thesis still holds: the
> self-improving loop is the point; video is one async step, never blocking it.

---

## Demo-critical surfaces (polish budget goes here)

1. **Agent reasoning panel** — streams Strategist + Analyst thoughts live
2. **Creative-DNA heatmap** — hook_type × voice colored by CAC
3. **Live bandit reallocation** — budget visibly shifts to winning variants

These three are what judges will remember. Everything else is plumbing.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
