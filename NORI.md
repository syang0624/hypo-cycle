# NORI.md — Backend + AI Owner

Working on `main`. Read `CLAUDE.md` first.

---

## Phase 1: COMPLETE | Phase 2: COMPLETE

All backend work is done and validated end-to-end with a real OpenAI key.

---

## Files you own

```
convex/schema.ts                      (6 original tables + agent_reasoning + bandit_allocations)
convex/products.ts
convex/variants.ts
convex/metrics.ts
convex/hypotheses.ts
convex/experiments.ts                 (startBatch + startNextBatch + getStatus)
convex/agents.ts                      (3 internalActions + error handling)
convex/simulator.ts                   (bandit-driven day-by-day + allocationsByBatch)
lib/agents/prompts.ts
lib/agents/schemas.ts
lib/simulator/dnaWeights.ts
lib/simulator/runCampaign.ts
lib/bandit.ts
```

**Do NOT touch** `app/**`, `components/**`, `lib/types.ts`, `lib/mockData.ts`.

---

## What shipped (summary)

### Phase 1 (original tasks 1-10)
- Schema, all queries/mutations per CLAUDE.md contract
- 3 agents with strict JSON output, data-seeded prompts
- DNA weights with documented priors
- Pure seeded simulator
- Thompson sampling bandit with CVR-floor kill gate
- Full loop orchestration via Convex scheduler

### Phase 2 (N1-N5)
- **N1:** Bandit drives day-over-day budget reallocation. `bandit_allocations` table + `allocationsByBatch` query for dashboard.
- **N2:** Analyst marks run complete (not simulator). Run stays "running" through analysis.
- **N3:** `startNextBatch` mutation for batch 2+. Strategist seeds from prior batch performance + analyst's nextBatchBrief.
- **N4:** `status: "failed"` + `error` field in getStatus. Agent actions catch OpenAI failures and mark run failed.
- **N5:** Full e2e validation with real OpenAI key. All checks pass.

### Contract additions (beyond CLAUDE.md)
1. `agent_reasoning` table + `agents.reasoningByBatch` query
2. `bandit_allocations` table + `simulator.allocationsByBatch` query
3. `experiments.getStatus` returns `{ status, phase, progress, error }`
4. `experiments.startNextBatch({ productId, priorBatchId })` mutation
5. `experiment_runs` has `status: "failed"` + optional `error` field
6. `openai ^6` in package.json

### Correctness checks — all passing
- [x] Bandit gated on CVR floor
- [x] Simulator internally consistent (CPC = spend/clicks, CAC = spend/conversions)
- [x] DNA weights documented with rationale
- [x] No randomness without a seed
- [x] OpenAI calls handle rate limits + retries
- [x] Analyst attribution names specific dimensions

### E2E validation (2026-06-27)
Validated against batch `batch_c69c64b7-...` (product "FocusFlow"):
- 7 hypotheses, 8 variants, 24 metric rows across 3 days
- Budget: day 1 even 12% each → day 3: 5 survivors at 31/22/19/16/12%, 3 killed
- 29 dimension attribution entries (e.g. benefit CAC +180%, shock-stat -45%)

---

## Nothing remaining for Nori

Backend is feature-complete. Waiting on Steven for:
- "Run Next Batch" button (uses `startNextBatch`)
- Failed state UI (uses `status: "failed"` + `error`)
- BudgetAllocator using `allocationsByBatch` (optional upgrade)