# STEVEN.md — Frontend Owner (HypoCycle)

Read `PRD.md` first — it supersedes the old HookLoop scope. This file is your
work plan for migrating the frontend from HookLoop to HypoCycle. Work on the
`steven` branch; push every ~30 minutes.

**Status: Phase 0 frontend done (2026-07-24)** — see checkboxes below. Waiting
on Nori's Phase 0 backend to swap the legacy queries. The "Legacy" section at
the bottom describes the shipped HookLoop UI, which keeps working during
migration (PRD §19.1: keep old routes readable or provide redirects).

---

## Your role

You own **everything the user sees**: the ten MVP screens (PRD §17), the
CopilotKit conversational surface, design system, and all frontend state via
Convex `useQuery`/`useMutation`. Nori owns the backend and integrations — you
call only the contract functions listed at the bottom. Need a new one? Tell
Nori in chat; do not write it yourself.

## Files you own

```
app/**                            (all routes, layouts, providers)
components/**
lib/types.ts                      (shared shapes — you own, Nori reads)
lib/mockData.ts
public/**
tailwind.config.ts
```

**Do NOT touch** `convex/**`, `lib/agents/**`, `lib/simulator/**`,
`lib/bandit.ts`, `lib/integrations/**`, `lib/video/**`.

Coordinate in chat before editing `package.json`, `.env.local`, `README.md`,
`CLAUDE.md`.

---

## Phase 0 — Rename + re-skin on the generic model (DO THIS FIRST)

Nori is generalizing the schema (product→program, batch→cycle, ad variant→
generic variant). Your Phase 0 job: the existing demo UI runs on the new
contract with zero feature regression.

- [x] **S0.1 — Rename.** HookLoop → HypoCycle in layout metadata, landing,
      program setup, launch, dashboard, package.json. Landing copy reframed
      around falsifiable hypotheses + evidence; agent card renamed to
      Hypothesis/Treatment/Evaluation. **Left for later:** `public/pitch.html`
      is a HookLoop-era pitch deck that needs a content rewrite, not a
      find/replace.
- [x] **S0.2 — Types.** `lib/types.ts` now has the PRD §11 domain model
      (Program, Cycle, FalsifiableHypothesis, ExperimentPlan,
      ExperimentVariant with `config: AdCreativeConfig | …`, Execution,
      Evaluation, Finding, Approval, AuditEvent, CycleState) as the target
      contract shapes, with the legacy HookLoop shapes kept in a marked
      section until each screen migrates off the old queries.
- [x] **S0.3 — Re-route.** `/programs/new` and `/cycles/[cycleId]` are the
      canonical routes; `/setup` and `/dashboard/[batchId]` redirect. Launch
      interstitial now lands on `/cycles/…`. **Still open:** swap legacy
      queries for the new contract (`cycles.getStatus`,
      `executions.listByCycle`, …) screen by screen as Nori lands them.
- [x] **S0.4 — Language sweep (PRD §19.1).** `AgentReasoningPanel` →
      `RationalePanel` (component was unused; kept for reuse). `reasoning`
      locals → `rationale` (the `api.agents.reasoningByBatch` query name is
      Nori's to rename). Phase copy rewritten around hypotheses/evidence.
      **Simulated** badges on the cycle dashboard header, each week section's
      metrics, and the CPC-by-week chart caption.

**Exit:** existing ad demo works end to end on the new model and vocabulary —
`npm run build` passes with the new routes.

## Phase 1 — The ten MVP screens (PRD §17)

Build order = demo-value order. Reuse legacy components where they map
(MetricsChart, VariantCard, HypothesisList are good starting points).

- [ ] **S1.1 — New Program Wizard** (screen 3). Objective, baseline, primary
      metric, guardrails, dataset/inputs, budget + duration caps, allowed
      tools, approval policy. Surface backend validation errors ("objective
      not measurable") inline.
- [ ] **S1.2 — Hypothesis Board** (screen 4). Ranked cards: claim, supporting
      observation, intervention, expected effect, **falsification condition**,
      risks, est. cost, confidence. Edit / add / reject / lock. Blocked-launch
      state when falsification condition is missing.
- [ ] **S1.3 — Experiment Designer** (screen 5). Control vs. treatment
      **structured diff** with changed variables highlighted; repetitions,
      evaluators, thresholds, sandbox policy, cost estimate, launch-readiness
      checklist. Confounder warning when >1 uncontrolled variable changes,
      with explicit override.
- [ ] **S1.4 — Live Run Console** (screen 6). Per-variant execution states
      (queued → provisioning → running → evaluating → …), live logs, cost
      ticker vs. budget, artifacts, pause/cancel controls (role-gated).
      Evolves from the legacy dashboard; keep the reactive `useQuery` feel.
- [ ] **S1.5 — Evidence Report** (screen 7). Metric comparison with
      uncertainty, guardrail pass/fail (not color-only — WCAG, PRD §15.4),
      failure clusters, result badge (supported / refuted / inconclusive /
      invalid), observed evidence visually separated from system inference
      (PRD §10.8).
- [ ] **S1.6 — Program Dashboard** (screen 2). Objective, current baseline,
      metric trend over cycles, budget consumption, durable findings list.
- [ ] **S1.7 — Cycle Timeline** (screen 9). Lineage: observation → hypothesis
      → plan → executions → evidence → decision → next hypothesis (which cites
      this cycle). This is the "self-improving loop" money shot.
- [ ] **S1.8 — CopilotKit surface.** Chat panel grounded in current
      org/program/cycle: draft hypotheses, refine plans, trigger role-gated
      actions. Every governed action shows proposed action, expected impact,
      cost, and permission scope **before** a required in-product confirmation
      (PRD §10.9). CopilotKit is UX, not authorization — backend revalidates.
- [ ] **S1.9 — Auth shell.** WorkOS AuthKit sign-in flow, org/project switcher
      (screen 1), role-aware nav (Viewers see no launch/approve buttons).

## Phase 2 — Governance screens

- [ ] **S2.1 — Review & Approval** (screen 8): artifact diff viewer, CodeRabbit
      findings with blocking/non-blocking status, test evidence, eligible
      approvers, approve / reject / request-changes / require-rerun, decision
      history.
- [ ] **S2.2 — Audit Log** (screen 10): filterable actor / action / resource /
      result / timestamp.
- [ ] **S2.3 — Approval inbox + notification affordances for Approvers.**

## Phase 3 — Multimodal polish

- [ ] **S3.1** Audio variant player for ElevenLabs artifacts (with synthetic +
      provenance labels).
- [ ] **S3.2** Synthetic-audience panel results view — unmistakably labeled
      simulated.
- [ ] **S3.3** Template gallery (ad creative / prompt optimization / agent
      workflow / code improvement — PRD §18).

---

## UI principles (from PRD §8, §14, §15)

- **Evidence over narrative**: every recommendation renders its metrics,
  evaluator versions, and uncertainty — never a bare "the agent thinks X".
- **No chain-of-thought framing**: rationales and activity, not "thoughts".
- **Synthetic vs. real**: distinct visual treatment, everywhere, always.
- **State never lies**: failed/cancelled/budget-exhausted are first-class
  visual states, not spinners. Every `useQuery` handles `undefined` (loading).
- **WCAG 2.2 AA**: no color-only status; live streams pausable.
- Conventions unchanged: TS strict, Tailwind only, no barrel files, no global
  state libs — Convex queries are the state.

---

## Contract with Nori (Phase 0/1 surface)

Nori keeps legacy functions alive until you've migrated each screen; then they
get deleted together. New surface:

### Queries (use `useQuery`)
```ts
api.orgs.listMine()
api.programs.list({ projectId })
api.programs.getById({ programId })
api.cycles.listByProgram({ programId })
api.cycles.getStatus({ cycleId })            // { state, phase, progress, error, budget }
api.hypotheses.listByCycle({ cycleId })
api.plans.getByCycle({ cycleId })
api.executions.listByCycle({ cycleId })      // live sandbox status, logs, cost
api.evaluations.listByCycle({ cycleId })
api.findings.getByCycle({ cycleId })
api.approvals.listPending({ orgId })
api.audit.list({ orgId, filters })
```

### Mutations (use `useMutation`)
```ts
api.programs.create(input)                   // → programId
api.hypotheses.update / lock / reject
api.plans.approve({ planId })
api.cycles.start({ programId })              // → cycleId
api.cycles.control({ cycleId, action })      // pause | resume | cancel
api.approvals.decide({ approvalId, decision })
```

---

# Legacy — HookLoop state (reference only)

Shipped and working; migrate, don't discard. Phases 1–2 + integration I1–I6
complete: dashboard fully wired to live Convex data, mock fallbacks removed,
phase display, analyst attribution in heatmap, `npm run build` passing.

Existing routes/components: landing bento grid, setup form, launch
interstitial, dashboard (`VariantCard`, `MetricsChart`, `AgentReasoningPanel`,
`DNAHeatmap`, `BudgetAllocator`, `HypothesisList`, `WeeklyReport`,
`ReelModal`/`ReelPreview` for Sora videos).

Old Phase-3 polish items (S1 next-batch button, S2 failed-state UI, S3 real
bandit allocations, S4 CampaignTimeline) are superseded by the HypoCycle
migration: next-batch → `cycles.start` on the Program Dashboard, failed-state →
first-class lifecycle states, allocations → adaptive-policy view in the Live
Run Console.
