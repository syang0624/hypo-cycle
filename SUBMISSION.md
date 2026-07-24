# HookLoop

## Problem We're Solving

Brands burn **$190B annually** on paid ads that don't convert. The root cause: marketing teams optimize for **CPC (Cost Per Click)** — cheap attention — instead of **CAC (Cost to Acquire a Customer)** — actual revenue.

A curiosity-hook reel might get millions of clicks at $0.10 CPC, but if nobody buys, that money is gone. Meanwhile, the team tested 3 creatives this month, picked the "best" one based on gut feeling, and moved on. No systematic experimentation. No feedback loop. Just vibes.

Creative fatigue compounds the problem — ads that worked last month silently stop converting. By the time someone notices, thousands are wasted.

## How the App Works

HookLoop is an **autonomous ad experimentation agent**. You input your product and budget. The system does the rest:

1. **AI Strategist** analyzes your product and generates testable hypotheses (e.g., "contrarian hooks outperform benefit hooks for Gen Z")
2. **AI Generator** produces 8 unique short-form video reels using **Sora 2**, each testing a different creative DNA combination (hook type, voice, pacing, CTA)
3. **Campaign Simulator** runs a 3-day experiment with real budget allocation. Metrics stream into the dashboard in real-time via Convex reactivity
4. **Thompson Sampling Bandit** reallocates budget between reels — killing underperformers (high CPC, low conversion) and scaling winners. The kill gate is on **CVR (conversion rate)**, not click rate, so the system can't be fooled by cheap clicks
5. **AI Analyst** explains what worked and why — attributing performance to specific creative dimensions ("narrator voice reads as corporate to Gen Z — CAC +180%")
6. **The loop repeats** — new reels are generated from revised hypotheses, each batch measurably better than the last

In our Coca-Cola demo: **9 reels tested across 3 weeks, CPC dropped 44% ($1.04 to $0.58), CAC dropped 60%**. The winning formula (contrarian hook + customer voice + anti-wellness humor) was discovered automatically — no human creative direction needed.

## Notable Features

- **Real AI-generated video reels** — Sora 2 produces vertical 9:16 MP4 reels from AI-written scripts. Each reel has distinct creative DNA (hook type, voice style, pacing, music, CTA)
- **CAC-first optimization** — the bandit is gated on a CVR floor. High-CTR but low-converting reels get killed, not scaled. This is the core design principle that prevents the system from buying garbage clicks
- **Live-streaming dashboard** — Convex reactive queries update the UI in real-time as the simulator inserts metrics day-by-day. No polling, no WebSockets — just `useQuery`
- **Week-over-week iteration** — each batch generates entirely new creative from revised hypotheses. The strategist seeds from the prior batch's analyst brief, so the system genuinely learns from itself
- **Thompson sampling with CVR kill gate** — seeded PRNG for reproducible results, batch-relative threshold (kills variants below 55% of the best performer's CVR)
- **Per-dimension attribution** — the analyst outputs `cacDeltaPct` per creative dimension, so you know exactly which hook type / voice / pacing combo drives CAC down

## Why We Built This

We've watched startups and brands waste money on ad creative that "feels right" but doesn't convert. The gap isn't creative talent — it's **experimentation infrastructure**.

No one runs 27 ad variants in 3 weeks and systematically attributes which creative dimension drove the result. That's what a machine should do. HookLoop replaces the manual cycle of brief-produce-launch-wait-analyze with a self-driving loop that gets measurably better each iteration.

The thesis: **the best ad creative isn't designed — it's discovered through systematic experimentation.**

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Recharts
- **Backend**: Convex (database, real-time queries, scheduled functions, file storage)
- **AI Agents**: OpenAI GPT-4o with strict structured outputs (JSON schema) — 3 agents (Strategist, Generator, Analyst)
- **Video Generation**: OpenAI Sora 2 — vertical 9:16 reels, ~4s each
- **Optimization**: Thompson sampling bandit (Beta posterior, Marsaglia-Tsang gamma sampling, seeded PRNG)
- **Design System**: Bento grid layout inspired by Canva, 24px radius cards, SF Pro typography

Convex is the backbone — its reactivity means metrics stream into the dashboard the instant the simulator writes them. The day-by-day campaign simulation uses `scheduler.runAfter(2000, ...)` to create visible delays, and each write triggers a live UI update via `useQuery`. This is the "Best Use of Convex" in action.

## Challenges We Ran Into

- **CPC vs CAC tension in the bandit**: Early versions optimized CPC, which learned to buy cheap but useless clicks. We fixed this by gating the Thompson sampling allocation on a CVR floor — variants must convert above a threshold to receive budget, regardless of their click rate
- **OpenAI strict mode constraints**: `perDimensionAttribution` had to be an array of `{dimension, value, cacDeltaPct}` instead of a nested map, because strict JSON schema mode doesn't support dynamic keys. This turned out to be a better design anyway
- **Sora API integration**: The Videos API has different parameter names than documented (`seconds` vs `duration`, model is `sora-2` not `sora`). We built a provider abstraction so the video source is a single swap point
- **Parallel development**: Steven (frontend) and Nori (backend) worked on separate branches with a strict file ownership contract. The Convex schema was the source of truth, and contract changes were flagged via `TODO(other-person)` comments
- **Demo realism**: Showing all 8 reels simultaneously looked fake. We restructured the dashboard into a week-by-week timeline where each iteration generates new creative from revised hypotheses, with real Sora videos cached locally for instant demo playback

## Success Stories & Metrics

**Coca-Cola demo campaign (3 weeks, 9 reels):**

| Metric | Week 1 | Week 2 | Week 3 | Improvement |
|--------|--------|--------|--------|-------------|
| Avg CPC | $1.04 | $0.78 | $0.58 | **-44%** |
| Avg CAC | $4.65 | $2.98 | $1.85 | **-60%** |
| Conversions | 1,149 | 2,295 | 3,860 | **+236%** |

- **Bandit killed 2 variants** by Week 2 (narrator voice + statistic hook — read as "corporate ad" to Gen Z)
- **Winner identified**: contrarian hook + customer voice + fast pacing ("My nutritionist said cut out soda...")
- **29 dimension attributions** generated by the analyst (e.g., "benefit hook: CAC +180%", "shock-stat hook: CAC -45%")
- **Budget concentration**: Day 1 even 12% each → Day 3 five survivors at 31/22/19/16/12%, three killed
- **Full pipeline execution**: strategist → generator → simulator (3 days with 2s delays) → analyst — all self-chaining via Convex scheduler
