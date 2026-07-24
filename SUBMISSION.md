# HypoCycle / HookLoop demo

## What it demonstrates

The demo presents a CAC-first creative experimentation workflow. It shows how a
hypothetical autonomous system could test creative directions, cut weak reels,
carry evidence into the next week, and identify a winning formula.

The campaign demo is deterministic and frontend-only. A separate `/sandbox`
surface can run an explicitly triggered sponsor-tool workflow, but it does not
purchase ads or present its output as campaign performance.

## Demo flow

1. Week 1 compares three creative directions.
2. Week 2 applies the first round of learning.
3. Week 3 tests scenario variants of the strongest formula.

Users can switch weeks, play local reels, inspect CPC and CAC, see cut/winning
states, and read the sample hypothesis and analysis.

## Sample result

| Metric | Week 1 | Week 2 | Week 3 |
| --- | ---: | ---: | ---: |
| Average CPC | $1.04 | $0.78 | $0.62 |
| Average CAC | $4.65 | $2.98 | $2.07 |

Winning formula:

> Contrarian hook + customer voice + fast pacing + anti-wellness humor

These values are fixtures for demonstration, not results from a live ad
platform.

## Implementation

- Next.js 14
- React and TypeScript
- Tailwind CSS
- Static campaign fixtures
- Nine bundled vertical MP4 reels
- No required backend or API key
- Optional live Daytona + Fireworks AI + Braintrust workflow

## Verify

```bash
npm install
npm run check:demo-only
npm run build
```
