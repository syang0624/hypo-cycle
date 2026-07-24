# HypoCycle Product Requirements Document

**Status:** Draft  
**Version:** 0.1  
**Last updated:** July 24, 2026  
**Product:** HypoCycle  
**Previous product:** HookLoop  
**Owner:** Product / Engineering

> **Implementation note — July 24, 2026:** This document is a future product
> vision. The current repository is a frontend-only HookLoop demo using static
> campaign fixtures and bundled videos. Sandbox execution, the control plane,
> integrations, authentication, persistence, and live agent orchestration
> described below are not implemented.

## 1. Executive Summary

HypoCycle is an autonomous experimentation platform that gives AI agents a scientific method.

Instead of asking an agent for a one-shot answer, a user gives HypoCycle an objective, constraints, and measurable success criteria. HypoCycle then runs a closed learning loop:

1. Observe the current state.
2. Generate falsifiable hypotheses.
3. Design controlled experiments.
4. Execute variants in isolated environments.
5. Evaluate results against explicit metrics and guardrails.
6. Adopt, reject, or revise the proposed change.
7. Use the evidence to plan the next cycle.

Every experiment runs in an isolated Daytona sandbox. Braintrust records traces, datasets, scores, and evaluation results. Fireworks AI provides low-latency parallel inference and simulated audience responses. CopilotKit provides the human control surface. CodeRabbit reviews agent-generated code and policy changes before adoption. WorkOS provides enterprise authentication, organizations, roles, and approval controls.

The first release will generalize HookLoop’s existing marketing experiment loop into a reusable system for testing prompts, agents, code, policies, workflows, and generated content. The existing ad-creative use case remains the first end-to-end template and demo.

## 2. Product Vision

Make continuous, evidence-driven improvement the default operating model for AI agents.

HypoCycle should let a team answer:

- What is the agent trying to improve?
- What does it believe, and how could that belief be disproven?
- What changed between the control and each treatment?
- Where and how was the experiment executed?
- What evidence supports the result?
- Which changes were adopted, rejected, or sent for human review?
- Is the system improving over repeated cycles without violating safety, quality, or cost constraints?

HypoCycle does not expose or depend on private chain-of-thought. It exposes concise decision rationales, experiment plans, tool activity, evaluation evidence, and the provenance of adopted changes.

## 3. Problem

Most AI systems operate through intuition and one-shot generation:

- Agent changes are proposed without a control group or repeatable test.
- Success criteria are vague, selected after the result, or reduced to a single model score.
- Execution environments drift, making results difficult to reproduce.
- Traces, artifacts, evaluator output, and approvals live in separate tools.
- Failed experiments do not become durable knowledge.
- Successful changes can be adopted without sufficient review or an audit trail.
- Humans either micromanage every step or lose visibility into autonomous behavior.

This makes agent improvement slow, subjective, unsafe, and difficult to trust.

## 4. Goals

### 4.1 Product Goals

1. Turn an objective into a structured, falsifiable experiment plan.
2. Run control and treatment variants safely in reproducible Daytona sandboxes.
3. Evaluate results using explicit metrics, datasets, statistical evidence, and guardrails.
4. Preserve a complete lineage from hypothesis to execution, evidence, decision, and adopted change.
5. Support autonomous iteration within organization-defined budgets and approval policies.
6. Give humans a clear interface to observe, intervene, approve, pause, or stop.
7. Make the platform extensible across experiment types while shipping one excellent initial workflow.

### 4.2 MVP Success Criteria

The MVP is successful when a user can:

- Create a project and define an objective, dataset, metrics, budget, and approval policy.
- Generate or manually create at least one hypothesis with a control and two treatments.
- Execute all variants in isolated Daytona sandboxes from a pinned environment definition.
- View live Braintrust-backed traces, scores, cost, latency, logs, and artifacts.
- Compare variants and receive an evidence-backed recommendation.
- Require a WorkOS-authorized approver before a code or policy change is adopted.
- Trigger a CodeRabbit review for an adoptable code or policy diff.
- Start a follow-up cycle whose hypotheses explicitly reference prior evidence.
- Re-run the experiment and obtain the same configuration, inputs, and environment metadata.

### 4.3 Business Goals

- Demonstrate value in under 15 minutes with a guided experiment template.
- Create a credible path from individual developer use to enterprise deployment.
- Establish HypoCycle as the system of record for agent experimentation and improvement.
- Drive repeated usage through ongoing experiment programs rather than isolated runs.

## 5. Non-Goals for MVP

- Training or fine-tuning foundation models.
- A general-purpose notebook, data warehouse, or CI/CD replacement.
- Automatically deploying changes to production without an explicit organization policy.
- Supporting arbitrary physical-world experiments.
- Guaranteeing causal conclusions when the experiment design or sample size is insufficient.
- Replacing Braintrust, Daytona, Fireworks AI, CodeRabbit, CopilotKit, or WorkOS with in-house equivalents.
- Supporting every model provider or sandbox provider in the first release.
- Fully autonomous multi-objective optimization across unrelated projects.

## 6. Target Users

### 6.1 AI Engineer

Builds and improves prompts, tools, agents, retrieval strategies, and orchestration logic. Needs repeatable comparisons, traces, datasets, and safe code changes.

### 6.2 Product or Growth Lead

Defines desired outcomes and constraints, reviews experiment results, and approves changes without needing to inspect every implementation detail.

### 6.3 Evaluation or Research Lead

Designs datasets and evaluators, checks experimental validity, and distinguishes reliable findings from noise.

### 6.4 Security or Compliance Approver

Defines roles, approval thresholds, restricted actions, retention rules, and audit requirements.

### 6.5 Executive or Program Owner

Wants to know whether the agent is improving, at what cost, with what risks, and based on which evidence.

## 7. Core Jobs to Be Done

- When an agent underperforms, help me produce and rank plausible, testable explanations.
- When I propose a change, help me compare it against a control under the same conditions.
- When an experiment runs, let me observe its execution without giving it uncontrolled access.
- When results arrive, tell me whether the evidence is strong enough to act on.
- When a change is risky, route it to the correct human with the necessary context.
- When a cycle completes, preserve what was learned and use it to improve the next cycle.
- When an auditor asks what happened, reconstruct the exact inputs, environment, actions, outputs, evaluations, and approvals.

## 8. Product Principles

1. **Falsifiable before executable.** Every experiment must define the expected outcome and what would disprove it.
2. **Control before optimization.** Every recommendation is compared with a baseline.
3. **Isolation by default.** Untrusted or generated work runs in a sandbox with scoped credentials and network policy.
4. **Evidence over narrative.** Recommendations cite metrics, evaluator results, artifacts, and uncertainty.
5. **Reproducibility over convenience.** Inputs, code, models, prompts, dependencies, seeds, and environment versions are recorded.
6. **Guardrails are constraints, not weighted preferences.** A variant that violates a hard safety rule cannot win because it performs better elsewhere.
7. **Autonomy is policy-bound.** The system may act automatically only within explicit organizational permissions, budgets, and approval thresholds.
8. **Humans retain control.** Authorized users can pause, stop, reject, modify, or rerun a cycle.
9. **Learning is durable.** Negative and inconclusive results are first-class knowledge, not discarded runs.

## 9. Primary User Experience

### 9.1 Create an Experiment Program

The user creates a program such as “Reduce support-agent resolution time without lowering answer quality.”

Required inputs:

- Objective
- Baseline or current strategy
- Primary metric
- Guardrail metrics
- Evaluation dataset or input source
- Maximum cycle cost and duration
- Allowed tools and data access
- Approval policy

The system validates that the objective is measurable and flags ambiguous or conflicting criteria.

### 9.2 Generate Hypotheses

HypoCycle analyzes the baseline, historical runs, traces, failures, and user context to generate ranked hypotheses.

Each hypothesis includes:

- Claim
- Supporting observation
- Proposed intervention
- Expected measurable effect
- Falsification condition
- Risks and confounders
- Estimated cost
- Confidence before testing

The user can edit, add, reject, or lock hypotheses.

### 9.3 Design the Experiment

HypoCycle converts an approved hypothesis into:

- One immutable control
- One or more treatments
- Fixed inputs or randomized cohorts
- Replication count
- Model and tool configuration
- Evaluators and metric thresholds
- Stop, kill, and escalation rules
- Sandbox resource and network policies
- Adoption criteria

The interface highlights variables that differ between variants and blocks plans that change multiple uncontrolled factors unless the user explicitly accepts the limitation.

### 9.4 Execute in Isolated Sandboxes

HypoCycle creates a Daytona sandbox for each run or variant, using a pinned environment definition.

The user sees:

- Queued, provisioning, running, evaluating, awaiting approval, complete, failed, and cancelled states
- Live logs and tool calls
- Token, compute, and vendor cost
- Generated files and artifacts
- Network and permission events
- Current budget and time remaining

Authorized users can pause or terminate execution.

### 9.5 Evaluate the Evidence

Braintrust receives the execution trace and evaluator output. HypoCycle aggregates:

- Primary metric performance
- Guardrail pass/fail status
- Cost and latency
- Variance and confidence interval where applicable
- Pairwise control-versus-treatment comparison
- Qualitative evaluator findings
- Failure clusters
- Reproducibility metadata

The result must be one of:

- Supported
- Refuted
- Inconclusive
- Invalid experiment

HypoCycle may recommend a winner only when it passes every hard guardrail and meets the configured evidence threshold.

### 9.6 Review and Adopt

If the winning treatment produces code or policy changes:

1. HypoCycle creates a reviewable diff.
2. CodeRabbit reviews the diff.
3. HypoCycle attaches review findings to the experiment.
4. WorkOS resolves the required approval policy and eligible approvers.
5. The approver can approve, reject, request changes, or require a rerun.
6. Adoption occurs only after all required gates pass.

For non-code artifacts, the same approval model applies without the CodeRabbit step unless policy requires it.

### 9.7 Continue the Cycle

The next cycle starts from the current evidence, not a blank prompt. New hypotheses cite prior experiment IDs and explain whether they:

- Exploit a supported result
- Investigate a failure
- Resolve an inconclusive result
- Test generalization on a new cohort
- Challenge a previously accepted conclusion

## 10. Functional Requirements

Priority definitions:

- **P0:** Required for MVP
- **P1:** Required for initial public release
- **P2:** Later expansion

### 10.1 Organizations, Identity, and Access

- **P0:** Authenticate users with WorkOS.
- **P0:** Support organizations and organization switching.
- **P0:** Support Admin, Experiment Owner, Operator, Approver, and Viewer roles.
- **P0:** Enforce authorization server-side for every project, run, artifact, approval, and secret operation.
- **P0:** Record immutable audit events for role changes, run control, approvals, secret access, and adoption.
- **P1:** Support SSO and directory-synced group-to-role mapping.
- **P1:** Allow custom approval policies by experiment risk level.

### 10.2 Experiment Programs and Objectives

- **P0:** Create, edit, archive, and duplicate programs.
- **P0:** Define primary metrics, guardrails, budgets, and stop conditions.
- **P0:** Attach datasets, files, repositories, prompts, or APIs as experiment inputs.
- **P0:** Store a versioned baseline.
- **P1:** Provide reusable templates for agent prompts, code optimization, policy tuning, workflow tuning, and creative testing.

### 10.3 Hypothesis Management

- **P0:** Generate structured hypotheses from the objective and available evidence.
- **P0:** Allow manual hypothesis creation and editing.
- **P0:** Rank hypotheses by expected impact, cost, risk, and information gain.
- **P0:** Require an expected result and falsification condition before execution.
- **P0:** Link every hypothesis to its source observations and subsequent experiments.
- **P1:** Detect hypotheses that duplicate or contradict prior findings.

### 10.4 Experiment Design

- **P0:** Create control and treatment variants.
- **P0:** Present a structured diff of all changed variables.
- **P0:** Configure repetitions, concurrency, timeout, seed, and cohort assignment.
- **P0:** Configure evaluators and pass thresholds.
- **P0:** Configure hard guardrails and early-stop rules.
- **P0:** Estimate run cost before launch.
- **P1:** Warn about likely confounders, insufficient samples, or evaluator leakage.
- **P2:** Support sequential tests and adaptive allocation beyond fixed experiment designs.

### 10.5 Daytona Execution

- **P0:** Provision an isolated sandbox for every execution unit.
- **P0:** Pin the repository commit, environment image, dependency lockfiles, model configuration, and input snapshot.
- **P0:** Apply CPU, memory, storage, duration, network, and secret policies.
- **P0:** Stream run status, logs, artifacts, and resource usage.
- **P0:** Retry infrastructure failures without silently retrying invalid experiment outcomes.
- **P0:** Destroy or expire sandboxes according to retention policy while preserving required artifacts and metadata.
- **P1:** Support reusable warm environments without compromising experiment isolation.

### 10.6 Model Inference and Audience Simulation

- **P0:** Use Fireworks AI for parallel treatment inference.
- **P0:** Record model, version, parameters, seed when supported, token usage, latency, and cost.
- **P0:** Rate-limit concurrency by organization and experiment budget.
- **P1:** Support synthetic audience panels with explicitly defined personas and cohort sizes.
- **P1:** Label simulated feedback as synthetic and prevent it from being presented as real customer evidence.
- **P1:** Compare synthetic findings with real evaluation data when both exist.

### 10.7 Voice and Conversation Experiments

- **P1:** Generate provider-agnostic voice variants from versioned scripts and voice settings.
- **P1:** Store audio artifacts with consent, provenance, model, voice, and configuration metadata.
- **P1:** Run multi-turn conversational variants against a fixed scenario suite.
- **P1:** Evaluate transcription accuracy, task success, latency, interruption behavior, tone, and policy compliance.
- **P1:** Block unauthorized voice cloning and enforce organization voice policies.

### 10.8 Tracing and Evaluation

- **P0:** Send every experiment execution to Braintrust with stable project, experiment, run, variant, and trace identifiers.
- **P0:** Associate traces with the exact hypothesis, environment, dataset item, and artifact versions.
- **P0:** Support deterministic, model-based, human, and composite evaluators.
- **P0:** Display evaluator definitions and versions alongside scores.
- **P0:** Preserve raw results and derived summaries.
- **P0:** Separate observed evidence from system inference in the UI.
- **P1:** Support blind human review and inter-rater agreement.
- **P1:** Promote production failures into regression datasets.

### 10.9 Human Control with CopilotKit

- **P0:** Provide a conversational interface grounded in the current organization, program, experiment, and run.
- **P0:** Allow natural-language creation and refinement of hypotheses and experiment plans.
- **P0:** Require explicit confirmation inside the product for actions governed by approval policy.
- **P0:** Support pause, resume, cancel, rerun, reject, and approve actions based on role.
- **P0:** Show the proposed action, expected impact, cost, and permission scope before execution.
- **P1:** Stream agent activity and surface intervention requests in real time.

### 10.10 Code and Policy Review

- **P0:** Produce a minimal, inspectable diff for proposed code or policy adoption.
- **P0:** Send eligible diffs to CodeRabbit and ingest review findings.
- **P0:** Treat unresolved blocking findings as an adoption failure.
- **P0:** Link every review comment and resolution to the experiment record.
- **P1:** Run repository tests and policy validation in a clean Daytona sandbox after review changes.

### 10.11 Decision and Adoption

- **P0:** Compute a result of supported, refuted, inconclusive, or invalid.
- **P0:** Prevent adoption when a hard guardrail fails.
- **P0:** Route decisions through WorkOS-backed approval policies.
- **P0:** Record who or what made each decision and the evidence available at that time.
- **P0:** Support rollback metadata for every adopted change.
- **P1:** Automatically adopt low-risk changes only when an organization policy explicitly permits it.

### 10.12 Experiment Memory

- **P0:** Store hypotheses, experiment configurations, results, decisions, and relationships between cycles.
- **P0:** Generate the next-cycle brief from prior evidence.
- **P0:** Make past negative and inconclusive findings searchable.
- **P1:** Summarize durable lessons separately from run-specific observations.
- **P1:** Warn when a new plan conflicts with an accepted constraint or repeats a failed experiment without a stated reason.

## 11. Core Domain Model

| Entity | Purpose |
| --- | --- |
| Organization | WorkOS-backed tenant and security boundary |
| Membership | User, organization, role, and approval eligibility |
| Project | Collection of related programs, resources, secrets, and policies |
| Experiment Program | Long-running objective optimized over multiple cycles |
| Cycle | One hypothesis-generation, execution, evaluation, and decision loop |
| Observation | Trace, failure, metric, user input, or prior finding that motivates a hypothesis |
| Hypothesis | Falsifiable claim with predicted result and disconfirmation condition |
| Experiment Plan | Versioned protocol, inputs, metrics, guardrails, budget, and environment |
| Variant | Control or treatment configuration |
| Execution | One sandboxed run of a variant against an input or cohort |
| Trace | Braintrust-linked record of model and tool behavior |
| Artifact | Code, policy, prompt, report, audio, logs, or generated output |
| Evaluation | Versioned evaluator result for an execution or variant |
| Finding | Evidence-backed conclusion with uncertainty and scope |
| Review | CodeRabbit or human feedback on a proposed change |
| Approval | WorkOS-authorized decision at a policy gate |
| Adoption | Applied change with provenance and rollback reference |
| Audit Event | Immutable security- or lifecycle-relevant event |

Every entity must include organization scope, stable identifiers, timestamps, creator or actor identity, and version/provenance metadata where applicable.

## 12. Experiment Lifecycle

```text
Draft
  -> Ready
  -> Provisioning
  -> Running
  -> Evaluating
  -> Decision Ready
  -> Awaiting Review (when required)
  -> Awaiting Approval (when required)
  -> Adopted | Rejected | Inconclusive
```

Terminal or exceptional states:

- Failed
- Cancelled
- Invalid
- Budget Exhausted
- Guardrail Stopped

State transitions must be idempotent, authorized, timestamped, and written to the audit log.

## 13. System Architecture

### 13.1 Control Plane

The HypoCycle application owns:

- Organization and project context
- Experiment orchestration
- State transitions
- Budgets and policies
- Hypothesis and plan versioning
- Artifact metadata
- Integration credentials and webhooks
- Approval routing
- Experiment memory

The current Next.js repository is only a presentation-layer prototype and must
not be treated as a control plane. A future implementation may reuse its visual
language and experiment narrative, but persistence, orchestration, policy,
authorization, and auditability require a separately reviewed architecture.

### 13.2 Execution Plane

Daytona is the only supported MVP execution environment. The control plane creates scoped execution jobs; sandboxes receive only the inputs and short-lived credentials required for the specific run.

### 13.3 Observability and Evaluation Plane

Braintrust is the canonical trace and evaluation system. HypoCycle stores stable external references plus the normalized metrics needed for comparison, policy evaluation, and the product UI.

### 13.4 Inference Plane

- Fireworks AI: high-concurrency text/model inference and synthetic audience simulation.

Provider adapters must normalize request status, usage, cost, provenance, errors, and retries without hiding provider-specific metadata needed for reproducibility.

### 13.5 Review and Governance Plane

- CodeRabbit: code and policy diff review.
- WorkOS: identity, organizations, roles, and approver eligibility.
- CopilotKit: conversational interaction and human-in-the-loop actions.

CopilotKit is a user interaction layer, not an authorization boundary. All actions must be revalidated by the HypoCycle backend.

## 14. Safety, Security, and Governance

- Default-deny sandbox network access, with allowlists defined per experiment.
- Never expose long-lived provider credentials inside a sandbox.
- Redact secrets and configured sensitive fields from logs, traces, and model prompts.
- Encrypt data in transit and at rest.
- Enforce organization isolation on every query, mutation, job, webhook, and artifact URL.
- Verify signed webhooks and make webhook handling idempotent.
- Require approval for production deployment, permission expansion, policy weakening, secret-scope expansion, or spending above a configured threshold.
- Record the model and evaluator versions used to recommend a change.
- Support configurable retention for sandboxes, logs, traces, datasets, and generated media.
- Preserve audit records according to organization policy.
- Label synthetic data, model judgments, and human judgments distinctly.
- Do not treat model-generated evaluator scores as objective ground truth.

## 15. Non-Functional Requirements

### 15.1 Reliability

- No execution may be lost if a worker or provider callback is retried.
- Orchestration steps and external callbacks must be idempotent.
- A failed integration must produce a visible, actionable state rather than a permanently running experiment.
- Partial results must remain inspectable.

### 15.2 Performance

- Dashboard state updates should appear within 2 seconds of receipt by the control plane.
- A standard experiment of one control, two treatments, and ten inputs should begin provisioning within 10 seconds under normal load.
- The system should support at least 50 parallel executions per organization, subject to provider and budget limits.

### 15.3 Reproducibility

Every execution must record:

- Plan and variant version
- Input and dataset version
- Repository commit and diff
- Environment image and dependency lockfiles
- Model, parameters, and prompt version
- Evaluator and rubric version
- Random seed when available
- Tool configuration
- Start and end timestamps
- Provider request identifiers

### 15.4 Accessibility

- Core workflows meet WCAG 2.2 AA.
- All run states, metric changes, and approval actions are usable without color alone.
- Live activity streams can be paused and reviewed without animation.

## 16. Product Analytics

### 16.1 North-Star Metric

**Verified improvement cycles completed per active organization per month.**

A verified improvement cycle reaches a valid evidence decision and either adopts a passing treatment or records a reusable refutation/inconclusive finding.

### 16.2 Supporting Metrics

- Time from program creation to first experiment
- Experiment completion rate
- Percentage of experiments with a valid control
- Percentage of findings reproduced in a rerun
- Median improvement in primary metric for adopted treatments
- Guardrail violation rate
- Human intervention and rejection rate
- Cost per completed cycle
- Percentage of adopted changes with complete provenance
- Follow-up cycle rate
- Weekly active programs and organization retention

### 16.3 Guardrail Metrics

- Unauthorized action count
- Cross-organization access incidents
- Unreviewed high-risk adoption count
- Budget overrun rate
- Sandbox escape or prohibited network event count
- False presentation of synthetic evidence as real evidence

## 17. MVP Screens

1. **Organization / Project Switcher** — WorkOS-backed tenant context.
2. **Program Dashboard** — Objective, current baseline, progress over cycles, budget, and durable findings.
3. **New Program Wizard** — Objective, data, metrics, guardrails, resources, and approvals.
4. **Hypothesis Board** — Ranked hypotheses with evidence, predicted outcomes, risks, and edit controls.
5. **Experiment Designer** — Control/treatment diff, dataset, repetitions, evaluators, sandbox policy, cost estimate, and launch readiness.
6. **Live Run Console** — Variant status, Daytona sandboxes, logs, traces, artifacts, costs, and stop controls.
7. **Evidence Report** — Metric comparison, uncertainty, guardrail results, failure clusters, and finding status.
8. **Review and Approval** — Diff, CodeRabbit feedback, test evidence, approvers, and decision history.
9. **Cycle Timeline** — Full lineage from observation through adoption and the next hypothesis.
10. **Audit Log** — Filterable actor, action, resource, result, and timestamp history.

## 18. Initial Experiment Templates

### 18.1 Ad Creative Optimization

The migrated HookLoop workflow:

- Hypotheses about hook, voice, pacing, CTA, audience, and script
- Generated media variants
- Synthetic audience simulation
- CAC/CVR/CTR or offline proxy evaluation
- Adaptive allocation as an optional advanced mode

The UI must clearly distinguish simulated campaign metrics from live advertising results.

### 18.2 Prompt Optimization

- Fixed regression dataset
- Control and treatment prompts
- Quality, safety, latency, and cost evaluators
- Recommended prompt diff

### 18.3 Agent Workflow Optimization

- Alternative tool ordering, retrieval, planning, or retry strategies
- Sandboxed task execution
- Task success, error, latency, and cost comparison

### 18.4 Code or Policy Improvement

- Baseline repository or policy version
- Agent-generated treatment diff
- Tests and evaluators in Daytona
- CodeRabbit review
- WorkOS approval before adoption

## 19. Migration from HookLoop

HypoCycle should evolve the current product rather than discard its working loop.

| HookLoop Concept | HypoCycle Concept |
| --- | --- |
| Product | Project or experiment program |
| Batch | Cycle |
| Ad hypothesis | Generic hypothesis |
| Ad variant | Experiment variant |
| Campaign simulation | Sandboxed execution and evaluation suite |
| Campaign metrics | Typed experiment metrics |
| Thompson allocation | Optional adaptive experiment policy |
| Strategist | Hypothesis agent |
| Generator | Treatment builder |
| Analyst | Evaluation and finding agent |
| Run next batch | Start next evidence-informed cycle |
| Agent reasoning | Decision rationale, trace summary, and evidence links |

### 19.1 Migration Requirements

- Preserve the current ad experiment as a template and demo dataset.
- Generalize database and TypeScript names instead of duplicating parallel ad-only models.
- Introduce organization scoping before multi-user launch.
- Migrate existing batches into projects, programs, cycles, variants, and executions.
- Keep old routes readable during migration or provide redirects.
- Remove claims that simulated campaign results are real-world causal evidence.
- Replace “reasoning stream” language with rationale, activity, and evidence summaries.

## 20. Delivery Plan

### Phase 0: Product Rename and Domain Foundation

- Rename HookLoop to HypoCycle in product surfaces.
- Introduce organization, project, program, cycle, and generic variant models.
- Preserve the current ad workflow as a template.
- Define integration interfaces and normalized job states.

**Exit criteria:** Existing HookLoop demo runs through the generic cycle model without feature regression.

### Phase 1: Closed-Loop Experiment MVP

- WorkOS authentication and organization boundaries
- Structured objective and hypothesis workflow
- Experiment designer with control/treatments
- Daytona execution
- Fireworks inference
- Braintrust traces and evaluations
- Evidence report
- Manual approval and next-cycle generation

**Exit criteria:** A prompt or agent workflow experiment can run end to end and produce a reproducible decision.

### Phase 2: Governed Adoption

- Code and policy artifact diffs
- CodeRabbit review
- Role-based WorkOS approval policies
- Post-review reruns
- Adoption and rollback metadata
- Complete audit log

**Exit criteria:** No protected code or policy change can be adopted without required tests, review, and authorization.

### Phase 3: Multimodal and Simulation Expansion

- Provider-agnostic voice and conversation variants
- Fireworks audience panels
- Human rating workflows
- Template library
- Cross-cycle analytics

**Exit criteria:** Teams can run clearly labeled text, code, policy, and voice experiments through the same lifecycle.

## 21. Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| Synthetic evaluators reward superficial optimization | Use multiple evaluator types, holdout datasets, human review, and periodic evaluator audits |
| Too many integrations make the MVP shallow | Keep one canonical provider per capability and deliver one complete prompt/agent workflow first |
| Users confuse simulation with real customer evidence | Prominent labels, separate metric types, and prohibit unsupported causal claims |
| Agent changes multiple variables at once | Structured variant diff, confounder warnings, and explicit override |
| Autonomous loops waste money | Hard budgets, concurrency limits, early stops, and approval thresholds |
| Reproducibility is undermined by nondeterministic models | Record complete configuration, use repetitions, report variance, and avoid claiming exact determinism |
| Generated code or policies create security risk | Isolated execution, tests, CodeRabbit review, scoped approval, and rollback metadata |
| Provider outage stalls a cycle | Durable jobs, bounded retries, visible failure states, and resumable orchestration |
| “Reasoning” claims expose sensitive or misleading internal text | Show concise rationales and evidence provenance, not private chain-of-thought |

## 22. Open Product Decisions

These decisions should be resolved before Phase 1 implementation:

1. Which initial workflow is the primary launch wedge: prompt optimization, agent workflow optimization, or the migrated ad-creative template?
2. What minimum evidence threshold is required before HypoCycle may recommend a treatment?
3. Which evaluator types are supported in MVP, and who can publish or change them?
4. Does adoption mean updating a HypoCycle-managed configuration, opening a pull request, or deploying to an external production system?
5. Which Git provider and repository workflow will carry CodeRabbit-reviewed changes?
6. Which data types may be sent to each external provider, and how are residency requirements handled?
7. What sandbox retention and artifact retention defaults should apply?
8. Which actions, if any, may be auto-approved in the first release?

## 23. MVP Acceptance Test

The MVP is ready when a new organization can complete this scenario:

1. An Admin creates an organization and invites an Experiment Owner and Approver.
2. The Experiment Owner creates a program to improve an agent on a fixed task dataset.
3. HypoCycle generates a falsifiable hypothesis and a plan with one control and at least two treatments.
4. The owner reviews the plan, budget, evaluators, and sandbox permissions, then launches it.
5. Each execution runs in a distinct Daytona sandbox and emits a linked Braintrust trace.
6. Fireworks AI executes model calls in parallel while usage and cost remain within the configured budget.
7. HypoCycle produces a comparison that includes the primary metric, all guardrails, uncertainty, failures, and provenance.
8. The selected treatment creates a reviewable change.
9. CodeRabbit reviews the change and any blocking findings are resolved.
10. WorkOS policy prevents adoption until an eligible Approver approves it.
11. The adopted change records the experiment, evidence, review, approver, and rollback reference.
12. HypoCycle proposes a follow-up hypothesis that cites the completed cycle.
13. An auditor can reconstruct the full lifecycle without accessing hidden chain-of-thought or unredacted secrets.

Passing this scenario is the stop condition for the MVP.
