# HookLoop

## What it demonstrates

HookLoop is an interactive product demo for a CAC-first ad experimentation
workflow. It shows how a hypothetical autonomous system could test creative
ideas, identify weak reels, carry learnings into the next week, and explain the
winning creative pattern.

The current build is intentionally deterministic and frontend-only. It does not
run live agents, purchase ads, or stream new experiment data.

## Problem

Marketing teams often optimize for cheap clicks instead of acquired customers.
A reel can produce a low CPC while attracting people who never convert. Small
teams also test too few creative variants to learn which hook, voice, pacing, or
scenario caused the result.

HookLoop demonstrates a more systematic approach: optimize for CAC, keep a CVR
quality floor, and use each week’s evidence to shape the next creative round.

## Demo flow

The bundled Coca-Cola scenario contains three weeks and nine reels:

1. **Week 1 — Initial test:** compare pain-point, statistic, and contrarian
   directions.
2. **Week 2 — Apply learnings:** focus on customer voice and irreverent,
   anti-wellness framing.
3. **Week 3 — Optimize the scenario:** test gym, date-night, and office
   variations of the winning formula.

Users can switch between weeks, play the local reels, inspect CPC and CAC, see
which variants were cut or marked best, and read the corresponding hypothesis
and analysis.

## Sample campaign result

| Metric | Week 1 | Week 2 | Week 3 | Change |
| --- | ---: | ---: | ---: | ---: |
| Average CPC | $1.04 | $0.78 | $0.62 | -40% average |
| Best reel CPC | $0.82 | $0.71 | $0.58 | -29% |
| Average CAC | $4.65 | $2.98 | $2.07 | -55% |
| Best reel CAC | $2.95 | $2.40 | $1.85 | -37% |

The summary card reports a 44% reduction from the starting average CPC to the
final winning reel CPC, and a 60% reduction from the starting average CAC to the
final winning reel CAC.

Winning formula:

> Contrarian hook + customer voice + fast pacing + anti-wellness humor

These numbers are sample campaign fixtures for demonstration, not claims from a
live ad platform.

## Notable product ideas

- CAC-first creative evaluation
- Visible killed, running, and winning variants
- Week-over-week hypothesis refinement
- Per-reel performance comparison
- Clear narrative explanation of why a creative direction won
- Local video playback with a resilient generated-preview fallback

## Implementation

- Next.js 14 App Router
- React 18 and TypeScript
- Tailwind CSS
- Static campaign fixtures
- Nine bundled vertical MP4 reels
- No backend, database, authentication, scheduler, or required API key

## Run and verify

```bash
npm install
npm run dev
```

Open `http://localhost:3000` and choose **Explore Demo**.

```bash
npm run check:demo-only
npm run build
```

## Scope boundary

HookLoop currently demonstrates the user experience and product thesis. Product
input, real campaign execution, AI orchestration, persistence, and live media
generation would require a future backend architecture.
