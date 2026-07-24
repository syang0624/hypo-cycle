# NORI.md — Infra + Backend Owner (HypoCycle)

Read `PRD.md` first — it supersedes the old HookLoop scope. This file is your work
plan for migrating the backend from HookLoop to HypoCycle. Work on the `nori`
branch; push every ~30 minutes.

**Status: Migration not started.** Everything below the "Legacy" section is the
old HookLoop state, kept for reference — the code it describes still runs and is
the baseline we migrate from (PRD §19: evolve, don't discard).

---

## Frontend status — read before touching the contract (Steven, 2026-07-24)

Steven finished his Phase 0 (rename, re-route, language sweep), a full UI
redesign, and a UX pass on the `steven` branch. **No new backend functions are
needed** — but the frontend now leans on the legacy contract in specific ways
you should know before renaming or changing anything:

### Exact legacy surface the UI calls today

```ts
products.create(input)                     // → { productId }
experiments.startBatch({ productId })      // → batchId; ALSO used to RETRY a failed week 1
experiments.startNextBatch({ productId, priorBatchId })
                                           // next week; ALSO used to RETRY a failed week N>1
                                           //   with priorBatchId = week N-1's batchId
experiments.getStatus({ batchId })         // { status, phase, progress, error, productId }
experiments.weeksByProduct({ productId })  // ⚠ in active use but missing from the CLAUDE.md
                                           //   legacy list — keep it alive
variants.listByBatch / metrics.liveMetrics / hypotheses.listByBatch
agents.reasoningByBatch / simulator.allocationsByBatch
```

Implications for you:

1. **Phase names are load-bearing.** The launch console and dashboard map
   `phase` ∈ {`strategizing`, `generating`, `generating_video`, `simulating`,
   `analyzing`, `complete`} to UI states. Rename or add phases → tell Steven
   in chat first.
2. **`getStatus` returning `null` is treated as 404** ("cycle not found" page).
   Returning `null` for a real-but-not-yet-written batch would show users a
   404 flash — make sure a just-started batch has a status row immediately.
3. **Retry calls must be safe.** A failed batch may trigger a second
   `startBatch` for the same product, or a second `startNextBatch` from the
   same prior batch. That creates a NEW batch (expected) — make sure nothing
   breaks with multiple batches per product beyond the 3-week happy path, and
   that `weeksByProduct` orders sanely when a failed week has a retried
   sibling. This is the most likely place our assumptions diverge — worth a
   quick e2e of the failure path.
4. **The demo path fires `products.create` + `startBatch` back-to-back** with
   `MOCK_PRODUCT` (one click, no form review). Validation errors thrown from
   either mutation are now surfaced verbatim in the UI — make messages
   human-readable.

### Routes & naming (FYI)

- Canonical routes are now `/programs/new` and `/cycles/[cycleId]` (the
  cycleId IS the batchId until your Phase 0 lands); `/setup` and
  `/dashboard/[batchId]` redirect.
- UI language is rationale/evidence, never "reasoning"; all simulated metrics
  carry amber **Simulated** badges. When you rename `agents.reasoningByBatch`
  → `rationaleByCycle` (or similar) in Phase 0, the frontend swap is mechanical.
- `lib/types.ts` (Steven's file, you read) now contains the **target PRD §11
  domain types** (`Program`, `Cycle`, `FalsifiableHypothesis`,
  `ExperimentPlan`, `ExperimentVariant` with `config: AdCreativeConfig`,
  `Execution`, `Evaluation`, `Finding`, `Approval`, `AuditEvent`,
  `CycleState`) — treat these as the shapes the new contract queries should
  return, and flag mismatches in chat rather than silently diverging.
- `package.json` name changed to `hypo-cycle` (one line) — pull before adding
  deps.

---

## Your role

You own the **control plane, execution plane, and every external integration**:

- Convex schema, queries, mutations, actions, scheduled jobs
- Agent orchestration (hypothesis agent, treatment builder, evaluation agent)
- Daytona sandbox execution
- Braintrust tracing + evaluation ingestion
- Fireworks AI inference + audience simulation
- ElevenLabs voice variants (Phase 3)
- CodeRabbit review integration (Phase 2)
- WorkOS auth, organizations, roles, approval policies
- Budgets, guardrails, state machine, audit log

Steven owns everything the user sees. He calls only the contract functions listed
at the bottom. If he needs a new one, he tells you in chat — he does not write it.

## Files you own

```
convex/**                         (all of it, including new tables/functions)
lib/agents/**                     (hypothesis / treatment / evaluation agents)
lib/simulator/**                  (legacy heuristic sim → becomes ad-template evaluator)
lib/bandit.ts                     (→ optional adaptive-allocation policy)
lib/integrations/**               (NEW — daytona.ts, braintrust.ts, fireworks.ts,
                                   elevenlabs.ts, coderabbit.ts, workos.ts)
lib/video/**                      (legacy Sora; keep working inside ad template)
```

**Do NOT touch** `app/**`, `components/**`, `lib/types.ts`, `lib/mockData.ts`,
`tailwind.config.ts`.

Coordinate in chat before editing `package.json`, `.env.local`, `README.md`,
`CLAUDE.md`.

---

## Phase 0 — Rename + Domain Foundation (PRD §20, DO THIS FIRST)

Goal: the existing ad demo runs through the *generic* cycle model with zero
feature regression. No new integrations yet.

- [ ] **N0.1 — New schema.** Replace ad-only tables with the PRD §11 domain model:
      `organizations`, `memberships`, `projects`, `programs`, `cycles`,
      `observations`, `hypotheses`, `plans`, `variants`, `executions`,
      `artifacts`, `evaluations`, `findings`, `reviews`, `approvals`,
      `adoptions`, `audit_events`. Every row carries `orgId`, timestamps,
      actor identity, and version/provenance fields. Ad-specific fields
      (hookType, voice, pacing, videoUrl…) move into a typed
      `variant.config` / `artifact` payload for the ad template — do not keep
      parallel ad-only tables (PRD §19.1).
- [ ] **N0.2 — Lifecycle state machine.** One module owning the PRD §12 states
      (`draft → ready → provisioning → running → evaluating → decision_ready →
      awaiting_review → awaiting_approval → adopted/rejected/inconclusive`, plus
      `failed / cancelled / invalid / budget_exhausted / guardrail_stopped`).
      Transitions are idempotent, authorized, timestamped, audit-logged.
- [ ] **N0.3 — Generalize the loop.** `experiments.startBatch` →
      `cycles.start(programId)`. Strategist/Generator/Analyst become
      hypothesis agent / treatment builder / evaluation agent operating on
      generic plans+variants. The heuristic simulator becomes the *evaluator
      suite of the ad template*, not a hardcoded pipeline step.
- [ ] **N0.4 — Ad template preserved.** The current FocusFlow demo runs end to
      end through programs/cycles/variants/executions. Simulated metrics are
      typed as `simulated` (never presented as real — PRD §18.1). Thompson
      bandit becomes an opt-in adaptive-allocation policy on the plan.
- [ ] **N0.5 — Migration + naming sweep.** Migrate existing batches into the
      new tables (use the convex-migration-helper skill). Rename
      HookLoop→HypoCycle in backend strings. Replace "reasoning" fields with
      `rationale` / activity / evidence summaries (PRD §19.1 — no
      chain-of-thought claims).
- [ ] **N0.6 — Integration interface stubs.** `lib/integrations/*` adapter
      interfaces with normalized job states (queued/provisioning/running/
      evaluating/complete/failed/cancelled), usage, cost, provenance. Stub
      implementations are fine in Phase 0; the shape is the contract.

**Exit:** old demo works through generic models; Steven's UI compiles against
the new contract functions.

## Phase 1 — Closed-Loop Experiment MVP (PRD §20)

- [ ] **N1.1 — WorkOS AuthKit** (see `.claude/skills/convex-setup-auth/references/workos-authkit.md`).
      Organizations, org switching, roles (Admin / Experiment Owner / Operator /
      Approver / Viewer). **Server-side authorization on every function** —
      CopilotKit/UI is never the authorization boundary (PRD §13.5).
- [ ] **N1.2 — Programs & objectives.** CRUD for programs with primary metric,
      guardrails, budget, stop conditions, versioned baseline, approval policy.
      Validate measurability; reject ambiguous objectives.
- [ ] **N1.3 — Hypothesis engine.** Structured hypotheses (claim, observation,
      intervention, expected effect, **falsification condition**, risks, cost,
      confidence — PRD §9.2), ranked; manual create/edit/lock. Execution is
      blocked without an expected result + falsification condition.
- [ ] **N1.4 — Experiment designer backend.** Immutable control + treatments,
      structured variable diff, repetitions/concurrency/timeout/seed,
      evaluator config, hard guardrails, early-stop rules, cost estimate.
      Block multi-variable uncontrolled changes unless explicitly overridden.
- [ ] **N1.5 — Daytona execution.** One sandbox per execution unit, pinned
      environment (commit, image, lockfiles, model config, input snapshot),
      resource/network/secret policies, live status+log+cost streaming into
      Convex, retention cleanup. Retry infra failures; never silently retry
      invalid experiment outcomes (PRD §10.5).
- [ ] **N1.6 — Fireworks inference.** Parallel treatment inference; record
      model, params, seed, tokens, latency, cost; org+budget rate limits.
- [ ] **N1.7 — Braintrust.** Every execution emits a trace with stable
      project/experiment/run/variant IDs linked to hypothesis + environment +
      dataset versions. Store external refs + normalized metrics in Convex.
- [ ] **N1.8 — Evidence engine.** Aggregate primary metric, guardrail
      pass/fail, cost/latency, variance/CI, pairwise control-vs-treatment.
      Result ∈ {supported, refuted, inconclusive, invalid}. A winner is only
      recommendable if **all hard guardrails pass** (guardrails are
      constraints, not weights — PRD §8.6).
- [ ] **N1.9 — Next cycle from evidence.** Next-cycle brief generated from
      findings; new hypotheses cite prior experiment IDs and state whether they
      exploit / investigate / resolve / generalize / challenge (PRD §9.7).
- [ ] **N1.10 — CopilotKit backend actions.** Grounded actions for create/refine
      hypotheses and plans, pause/resume/cancel/rerun/approve — every action
      revalidated server-side against role + policy.

## Phase 2 — Governed Adoption

- [ ] **N2.1** Artifact diffs for code/policy changes; rollback metadata.
- [ ] **N2.2** CodeRabbit review dispatch + webhook ingestion (signed,
      idempotent); unresolved blocking findings = adoption failure.
- [ ] **N2.3** WorkOS approval policy resolution + gating; no adoption without
      required approvals.
- [ ] **N2.4** Immutable audit log covering role changes, run control,
      approvals, secret access, adoption.

## Phase 3 — Multimodal (only after 0–2)

- [ ] **N3.1** ElevenLabs voice variants with consent/provenance metadata.
- [ ] **N3.2** Fireworks synthetic audience panels — always labeled synthetic.

---

## Non-negotiables (from PRD §8, §14)

- Falsifiable before executable; control before optimization.
- Default-deny sandbox network; short-lived scoped credentials only.
- Org isolation enforced on **every** query/mutation/job/webhook/artifact URL.
- Idempotent orchestration + callbacks; failures become visible states, never
  permanently-running experiments.
- Synthetic data, model judgments, and human judgments labeled distinctly.
- Reproducibility metadata on every execution (PRD §15.3 checklist).

---

## Contract with Steven (Phase 0/1 surface)

Steven builds against these. Extend in chat, not unilaterally. Legacy functions
(`products.*`, `experiments.startBatch`, `metrics.liveMetrics`,
`agents.reasoningByBatch`, `simulator.allocationsByBatch`) keep working until
Steven finishes migrating each screen, then get deleted together.

### Queries (reactive)
```ts
orgs.listMine()                             // orgs + role for switcher
programs.list({ projectId })                // program dashboard
programs.getById({ programId })             // objective, baseline, budget, findings
cycles.listByProgram({ programId })         // cycle timeline
cycles.getStatus({ cycleId })               // { state, phase, progress, error, budget }
hypotheses.listByCycle({ cycleId })         // ranked, with falsification conditions
plans.getByCycle({ cycleId })               // control/treatment diff, evaluators, cost est
executions.listByCycle({ cycleId })         // live sandbox status, logs, cost per variant
evaluations.listByCycle({ cycleId })        // scores + evaluator versions
findings.getByCycle({ cycleId })            // evidence report payload
approvals.listPending({ orgId })            // approval inbox
audit.list({ orgId, filters })              // audit log screen
```

### Mutations
```ts
programs.create(input)                      // → programId
hypotheses.update / lock / reject
plans.approve({ planId })                   // launch-readiness gate
cycles.start({ programId })                 // → cycleId (triggers full loop)
cycles.control({ cycleId, action })         // pause | resume | cancel
approvals.decide({ approvalId, decision })  // approve | reject | request_changes | rerun
```

---

# Legacy — HookLoop state (reference only)

Everything below describes the shipped HookLoop backend, which is the migration
baseline. All of it was validated e2e with a real OpenAI key on 2026-06-27.

- Schema: 6 original tables + `agent_reasoning` + `bandit_allocations`
- 3 agents (Strategist/Generator/Analyst) with strict JSON output
- DNA weights with documented priors; pure seeded simulator
- Thompson sampling bandit gated on CVR floor
- `startNextBatch` for batch 2+; failed-state handling in `getStatus`
- Sora video generation in `convex/video.ts` + `lib/video/**`
- E2E: 7 hypotheses, 8 variants, 24 metric rows, bandit reallocation
  12%-even → 31/22/19/16/12 with 3 kills, 29 attribution entries

PRD §19 mapping: product→program, batch→cycle, ad variant→variant,
campaign sim→execution+evaluator suite, Thompson→optional adaptive policy,
Strategist→hypothesis agent, Generator→treatment builder, Analyst→evaluation
agent, reasoning→rationale/evidence.
