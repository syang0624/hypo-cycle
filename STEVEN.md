# STEVEN.md — Frontend Owner

Working on `main`. Read `CLAUDE.md` first.

---

## Phase 1: COMPLETE | Phase 2 integration: COMPLETE

All original tasks (1-10) done. Design system applied. I1-I5 integration done — dashboard wired to live Convex data, mock fallbacks removed, phase display working, analyst attribution in heatmap.

---

## Files you own

```
app/page.tsx                          (landing — bento grid)
app/setup/page.tsx                    (product input form)
app/launch/[batchId]/page.tsx         (animated launch interstitial)
app/dashboard/[batchId]/page.tsx      (main dashboard)
app/layout.tsx                        (root layout, fonts, ConvexProvider)
app/globals.css
app/ConvexClientProvider.tsx
components/VariantCard.tsx
components/MetricsChart.tsx
components/AgentReasoningPanel.tsx
components/DNAHeatmap.tsx
components/BudgetAllocator.tsx
components/HypothesisList.tsx
components/CampaignTimeline.tsx       (stub — not yet implemented)
components/ProductInputForm.tsx
lib/types.ts
lib/mockData.ts
tailwind.config.ts
```

**Do NOT touch** `convex/**`, `lib/agents/**`, `lib/simulator/**`, `lib/bandit.ts`.

---

## Phase 2 integration — DONE

- [x] I1: Form calls real `products.create` + `startBatch`, navigates with real batchId
- [x] I2: Reasoning panels wired to `api.agents.reasoningByBatch`
- [x] I3: Header shows phase (Strategizing/Generating/Simulating/Analyzing/Complete) + progress bar
- [x] I4: DNAHeatmap uses analyst `cacDeltaPct` when available
- [x] I5: Mock fallbacks removed from dashboard
- [x] I6: `npm install` (openai dep)
- [x] `npm run build` passes

---

## Phase 3 — Remaining polish (demo day)

### S1 — "Run Next Batch" button (HIGH)

Nori shipped `experiments.startNextBatch({ productId, priorBatchId })`. Add a button to the dashboard that appears when `phase === "complete"`:
```ts
const startNext = useMutation(api.experiments.startNextBatch);
// onClick: const newBatchId = await startNext({ productId, priorBatchId: batchId });
//          router.push(`/launch/${newBatchId}`);
```
This closes the loop visually — judges see the system learn from itself.

### S2 — Failed state UI (MEDIUM)

`getStatus` now returns `{ status: "failed", error: "..." }`. The dashboard header doesn't handle this. Add:
- Red error badge when `status === "failed"`
- Show the error message
- A "Retry" button that calls `startBatch` again

### S3 — BudgetAllocator uses real bandit data (MEDIUM)

Nori added `simulator.allocationsByBatch(batchId)` returning exact Thompson sampling allocations per day (with scale/explore/kill status). BudgetAllocator currently approximates from metrics. Switch to:
```ts
const allocations = useQuery(api.simulator.allocationsByBatch, { batchId });
```

### S4 — CampaignTimeline (LOW)

Still a stub. Could show day-by-day events with timestamps.

---

## Contracts with Nori (final)

**Queries** (use `useQuery`):

```ts
api.products.getById(productId);
api.variants.listByBatch(batchId);
api.metrics.liveMetrics(batchId);
api.hypotheses.listByBatch(batchId);
api.experiments.getStatus(batchId);          // { status, phase, progress, error }
api.agents.reasoningByBatch(batchId);        // agent_reasoning rows
api.simulator.allocationsByBatch(batchId);   // bandit_allocations rows (NEW — for S3)
```

**Mutations** (use `useMutation`):

```ts
api.products.create(input);                  // returns { productId, batchId }
api.experiments.startBatch(productId);       // returns batchId, triggers loop
api.experiments.startNextBatch({ productId, priorBatchId }); // NEW — for S1
```
