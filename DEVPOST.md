# HypoCycle — Devpost Submission

> **Elevator pitch (200 chars):** HypoCycle gives AI agents a scientific
> method: falsifiable hypotheses, controlled experiments, evidence-based
> adoption — improving every cycle. Demo: 44% lower ad CPC in 3 self-directed
> rounds.

## Inspiration

Every AI tool we've used has the same flaw: it gives you a confident one-shot answer and no way to know if it's actually *good*. Meanwhile, the teams we know burn thousands on paid ads guessing which creative will work. We asked: what if an AI agent had to earn its conclusions the way scientists do — hypothesize, test against a control, and keep only what the evidence supports? HypoCycle was born from the belief that continuous, evidence-driven improvement should be the default operating model for AI agents, not intuition and vibes.

## What it does

HypoCycle gives AI agents a scientific method. You input your product, budget, and goals; the system then runs a closed learning loop: a hypothesis agent generates falsifiable claims about what creative will perform ("pain-point hooks beat statistic hooks for this audience"), a treatment builder produces ad variants with structured creative DNA (hook type, voice, pacing, CTA) and generates Sora video reels, a simulated campaign runs day-by-day with Thompson-sampling budget reallocation that kills losers and scales winners — gated on a CVR floor so it can't learn to buy garbage clicks — and an evaluation agent renders verdicts (supported / refuted / partial), attributes performance to specific DNA dimensions, and writes a directive that seeds the next week's hypotheses. Each cycle starts from evidence, not a blank prompt.

The dashboard shows it all live: an evidence report with hard guardrail pass/fail against your target CAC, a creative-DNA heatmap, live budget reallocation, and a cycle timeline tracing hypothesis → verdict → directive → next hypothesis. In our demo campaign, the loop cut CPC 44% and CAC 60% across three self-directed weeks. Every simulated metric is labeled as simulated — evidence over narrative is a design rule, not a disclaimer.

## How we built it

Next.js 14 + TypeScript + Tailwind on the front; Convex as the real-time control plane — every dashboard panel is a reactive `useQuery`, so hypotheses, metrics, and budget shifts stream in live as the loop runs, no polling. Three OpenAI-powered agents with strict structured outputs handle hypothesis generation, variant building, and evaluation.

The campaign simulator is deliberately defensible: seeded (no un-reproducible randomness), with documented priors for every creative-DNA weight, and internally consistent metrics (CPC = spend/clicks, CAC = spend/conversions). Budget allocation is real Thompson sampling with a CVR floor kill-gate. Sora generates the video reels asynchronously so video never blocks the loop. Braintrust instruments the app for tracing.

We split work hard: one of us owned `convex/**` and the agent/simulator logic, the other owned `app/**` and `components/**`, with a documented contract of queries and mutations between us — and a self-contained static `/demo` route that runs with zero backend for bulletproof judging.

## Challenges we ran into

**Making the simulator defensible.** Random noise dressed up as a campaign would be worthless. Getting to seeded, prior-documented, internally-consistent numbers that an LLM analyst could genuinely reason about took multiple redesigns.

**Not optimizing the wrong thing.** A naive bandit happily minimizes CPC by buying cheap, worthless clicks; gating allocation on conversion rate was a hard-won design rule.

**Mid-hackathon pivot.** We started as HookLoop, an ad-reel tool, and realized the loop — not the reels — was the product. Generalizing toward HypoCycle while keeping a working demo meant migrating vocabulary, routes, and docs without breaking anything.

**Parallel development at speed.** Two people pushing to three branches produced genuinely conflicting merges — at one point two opposite resolutions of the same merge landed within the hour. We resolved it with a union merge (live app + static demo coexisting) and wrote the decision down so it couldn't happen twice.

**Async video.** Sora generation is slow and occasionally fails; the loop treats reels as an async enrichment with graceful fallbacks, never a blocking step.

## Accomplishments that we're proud of

The loop actually closes: batch 2's hypotheses cite batch 1's verdicts, and you can watch the system get measurably better — 44% CPC reduction across three weeks — in the cycle timeline. The evaluation agent names *which* creative dimensions drove results (e.g., shock-stat hooks −45% CAC), not just which variant won. The dashboard is fully real-time on Convex with zero polling. The evidence report enforces PRD principles in the UI itself: guardrails render as hard pass/FAIL (never a weighted score), verdicts use falsification language, and observed evidence is visually separated from system inference. And we shipped a one-click demo path — judges go from landing page to a live self-improving campaign in a single click.

## What we learned

Falsifiability is a forcing function: requiring every hypothesis to state what would *disprove* it made our agents dramatically less sycophantic and more useful. Real-time infrastructure changes what you build — because Convex made live streaming free, the agent's "thinking" became the product's most compelling surface. Simulated evidence must be labeled or it becomes a lie; we now treat synthetic-vs-real labeling as a hard rule. And on team process: file-ownership contracts between humans work until direction diverges — then no amount of git discipline substitutes for a conversation.

## What's next for Hypo Cycle

The ad-creative loop is template #1. The PRD charts the generalization: prompt optimization and agent-workflow experiments on fixed regression datasets; isolated Daytona sandbox execution for every variant; Braintrust as the canonical trace and evaluation store; WorkOS organizations with role-based approval gates so a code or policy change can't be adopted without an authorized human; CodeRabbit review of agent-generated diffs before adoption; and provider-agnostic voice variants for conversational experiments.

The destination: HypoCycle as the system of record for how your AI improves — every adopted change traceable to an experiment, every experiment traceable to a falsifiable hypothesis, every hypothesis traceable to evidence.
