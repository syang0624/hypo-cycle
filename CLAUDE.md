# HypoCycle — Project Context for Claude Code

This file is read by every Claude Code session in this repo. It defines what
we're building, the rules of engagement, and the contracts between Steven and
Nori. **Read this first, then `PRD.md` for full requirements, then STEVEN.md or
NORI.md depending on which branch you're on.**

> **MIGRATION IN PROGRESS (since 2026-07-24).** This product was HookLoop, an
> ad-creative experimentation demo. `PRD.md` pivots it into HypoCycle. Code you
> find may still reflect HookLoop (products/batches/ad variants) — that legacy
> loop is the migration baseline and must keep working until each piece is
> replaced (PRD §19). NORI.md and STEVEN.md carry the phased task lists.

---

## What we're building

HypoCycle is an **autonomous experimentation platform that gives AI agents a
scientific method**. A user defines an objective, constraints, and measurable
success criteria; HypoCycle runs a closed learning loop:

1. Observe the current state
2. Generate falsifiable hypotheses
3. Design controlled experiments (one immutable control + treatments)
4. Execute variants in isolated Daytona sandboxes
5. Evaluate against explicit metrics and guardrails (Braintrust)
6. Adopt, reject, or revise — gated by review and approval policies
7. Plan the next cycle from the evidence

**This is not a one-shot generation tool.** The self-improving, evidence-driven
loop is the product. The old HookLoop ad-creative workflow survives as the
first experiment template and demo (PRD §18.1).

### Non-negotiable design rules (PRD §8)

- **Falsifiable before executable.** No hypothesis runs without an expected
  result and a falsification condition.
- **Control before optimization.** Every recommendation is compared against a
  baseline under the same conditions.
- **Guardrails are constraints, not weights.** A variant that violates a hard
  guardrail cannot win, no matter how well it scores elsewhere.
- **Isolation by default.** Generated/untrusted work runs in Daytona sandboxes
  with scoped, short-lived credentials and default-deny network.
- **Evidence over narrative.** Recommendations cite metrics, evaluator
  versions, artifacts, and uncertainty. Never bare "the agent thinks X".
- **No chain-of-thought claims.** Expose rationales, activity, and evidence —
  not "reasoning streams" or private thoughts (PRD §2, §19.1).
- **Synthetic is labeled synthetic.** Simulated metrics and model judgments are
  visually and structurally distinct from real evidence, everywhere.
- **Autonomy is policy-bound; humans retain control.** Server-side org, role,
  budget, and approval enforcement on every action. The UI (including
  CopilotKit) is never the authorization boundary.
- **Reproducibility over convenience.** Every execution records plan/variant
  versions, inputs, commit, environment, model config, seeds (PRD §15.3).

---

## Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind, Recharts,
  lucide-react, CopilotKit (conversational control surface)
- **Control plane**: Convex (database + actions + scheduled functions),
  real-time-reactive via `useQuery`
- **Execution plane**: Daytona sandboxes (only supported execution env)
- **Observability/eval**: Braintrust (canonical traces + evaluations)
- **Inference/media**: Fireworks AI (parallel inference, audience simulation),
  ElevenLabs (voice variants, Phase 3), OpenAI/Sora (legacy ad-template video)
- **Governance**: WorkOS (auth, orgs, roles, approvals), CodeRabbit (diff
  review before adoption)

One canonical provider per capability — do not add alternates (PRD §21).

---

## File ownership (HARD RULE)

Do not edit files outside your zone. If you need a contract change, leave a
`// TODO(other-person):` comment and tell the other human.

### Steven owns (frontend)

```
app/**
components/**
lib/types.ts          (shared — Steven owns the shape, Nori reads)
lib/mockData.ts
public/**
tailwind.config.ts
```

### Nori owns (infra/backend)

```
convex/**
lib/agents/**
lib/simulator/**      (legacy sim → ad-template evaluator)
lib/bandit.ts         (→ optional adaptive-allocation policy)
lib/integrations/**   (daytona, braintrust, fireworks, elevenlabs,
                       coderabbit, workos adapters)
lib/video/**
```

### Both touch (coordinate in chat first)

```
package.json          (only when adding deps)
.env.local            (only when adding env vars)
README.md
CLAUDE.md
```

---

## Branching

- `main` — clean; merge from work branches, don't push WIP directly
- `steven` — frontend work
- `nori` — backend + integrations work

Commit often. Push to your branch every ~30 minutes so the other side can pull
if they need a contract.

---

## Domain model (source of truth: PRD §11)

The target schema in `convex/schema.ts` (replacing the HookLoop ad-only
tables as Nori lands Phase 0):

```
organizations, memberships, projects,
programs            (long-running objective: metrics, guardrails, budget, baseline, approval policy)
cycles              (one hypothesis → execute → evaluate → decide loop)
observations, hypotheses (claim + falsification condition, linked to evidence)
plans               (versioned protocol: control + treatments, evaluators, stop rules)
variants, executions (one sandboxed run of a variant)
artifacts, evaluations, findings (supported | refuted | inconclusive | invalid)
reviews, approvals, adoptions (with rollback metadata)
audit_events        (immutable)
```

Every row carries org scope, stable IDs, timestamps, actor identity, and
version/provenance metadata. Lifecycle states are defined in PRD §12; all
transitions idempotent, authorized, and audit-logged.

Legacy tables (`products`, `ad_variants`, `campaign_metrics`, …) exist until
migration completes. Ad-specific fields (hookType, voice, pacing, videoUrl…)
move into typed `variant.config` / artifact payloads — no parallel ad-only
models (PRD §19.1).

---

## Contracts between frontend and backend

These are the only Convex functions the frontend calls. If the frontend needs
a new one, Steven tells Nori in chat — he does NOT write it. Legacy HookLoop
functions (`products.*`, `experiments.*`, `metrics.liveMetrics`,
`agents.reasoningByBatch`, `simulator.allocationsByBatch`) stay alive until
Steven migrates each screen, then get deleted together.

### Queries (reactive — Steven uses `useQuery`)

```ts
orgs.listMine()
programs.list({ projectId })
programs.getById({ programId })
cycles.listByProgram({ programId })
cycles.getStatus({ cycleId })            // { state, phase, progress, error, budget }
hypotheses.listByCycle({ cycleId })
plans.getByCycle({ cycleId })
executions.listByCycle({ cycleId })      // live sandbox status, logs, cost
evaluations.listByCycle({ cycleId })
findings.getByCycle({ cycleId })
approvals.listPending({ orgId })
audit.list({ orgId, filters })
```

### Mutations (Steven uses `useMutation`)

```ts
programs.create(input)                   // → programId
hypotheses.update / lock / reject
plans.approve({ planId })
cycles.start({ programId })              // → cycleId (triggers full loop)
cycles.control({ cycleId, action })      // pause | resume | cancel
approvals.decide({ approvalId, decision })
```

### Actions (backend-internal — Steven never calls directly)

Agent orchestration (hypothesis agent, treatment builder, evaluation agent),
Daytona provisioning, Braintrust ingestion, Fireworks inference, CodeRabbit
dispatch, webhook handlers.

---

## Conventions

- **TypeScript strict.** No `any` unless you leave a `// FIXME` comment.
- **No barrel files** (`index.ts` re-exports). Direct imports only.
- **Components are functions**, not classes. Hooks at the top.
- **No global state libraries.** Convex queries are the state.
- **Styling**: Tailwind utility classes. No CSS files except `globals.css`.
- **Loading states are required.** Every `useQuery` consumer handles
  `undefined` (Convex's "loading" sentinel).
- **Don't catch errors silently.** Failures must become visible, actionable
  states — never a permanently-spinning experiment (PRD §15.1).
- **Idempotency.** Orchestration steps, webhooks, and state transitions must
  tolerate retries without duplicating work.
- **Accessibility**: WCAG 2.2 AA; no status conveyed by color alone.

---

## What we are NOT building (PRD §5)

- Training or fine-tuning foundation models
- A notebook, data warehouse, or CI/CD replacement
- Auto-deploy to production without an explicit org policy
- In-house replacements for Daytona, Braintrust, Fireworks, ElevenLabs,
  CopilotKit, CodeRabbit, or WorkOS
- Additional model/sandbox providers beyond the canonical set
- Causal-certainty claims when design or sample size can't support them
- Presenting simulated campaign results as real-world evidence

If you find yourself building any of the above, stop.

---

## Delivery phases (PRD §20)

- **Phase 0** — Rename + generic domain model; existing ad demo runs through
  programs/cycles/variants/executions with zero regression. ← **current**
- **Phase 1** — Closed-loop MVP: WorkOS auth, hypothesis workflow, designer,
  Daytona execution, Fireworks, Braintrust, evidence report, next cycle.
- **Phase 2** — Governed adoption: diffs, CodeRabbit, approval policies,
  rollback metadata, audit log.
- **Phase 3** — Multimodal: ElevenLabs voice, audience panels, templates.

Task-level breakdowns live in NORI.md (backend) and STEVEN.md (frontend).

---

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.
