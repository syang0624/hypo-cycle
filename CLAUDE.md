# HookLoop local demo — project context

This repository currently contains a self-contained, frontend-only HookLoop
demo. Read this file first, then `README.md` for run instructions. `PRD.md`
describes a possible future HypoCycle product and is not the current
implementation contract.

## Current product

The app presents a fixed Coca-Cola campaign that demonstrates the HookLoop
story across three weeks:

1. Test three creative directions.
2. Compare CPC, CAC, spend, conversions, and reel status.
3. Carry the winning creative pattern into the next week.
4. Finish with a 44% CPC reduction and a 60% CAC reduction.

The displayed campaign is sample data. The current app does not accept product
inputs, run agents, generate experiments, persist records, or stream live
metrics.

## Architecture

- Next.js 14 App Router
- React 18 and TypeScript
- Tailwind CSS
- Static campaign data in `lib/demoReels.ts`
- Nine bundled MP4 files in `public/reels/`
- Optional Braintrust instrumentation already configured by the repository

There is no application backend, database, scheduler, authentication layer, or
required runtime environment variable.

## Active routes and files

| Surface | Source |
| --- | --- |
| Landing page | `app/page.tsx` |
| Interactive demo | `app/demo/page.tsx` |
| Demo dashboard | `components/DemoDashboard.tsx` |
| Video fallback | `components/ReelPreview.tsx` |
| Campaign fixtures | `lib/demoReels.ts` |
| Architecture guard | `scripts/check-demo-only.mjs` |

## Product rules

- Keep the demo honest: describe results as sample campaign data, not a live run.
- Keep all nine reels playable locally; the generated preview is the fallback.
- Preserve week switching and the Week 1 → Week 3 performance narrative.
- Do not introduce a backend or mandatory external service without an explicit
  architecture change from the user.
- Preserve unrelated Braintrust configuration unless the user asks to remove it.
- Historical implementation plans under `docs/superpowers/` are reference-only.

## Verification

Run:

```bash
npm run check:demo-only
npm run build
```

For UI changes, also verify:

1. `/` renders and **Explore Demo** opens `/demo`.
2. Week 1, Week 2, and Week 3 buttons update the campaign content.
3. The three reels for each selected week load or show their visual fallback.
4. The browser console has no application errors.

## Future product work

`PRD.md` describes the broader HypoCycle vision, including sandbox execution,
evaluation, policy, and enterprise controls. None of those capabilities are
implemented in this demo. Moving toward that PRD requires an explicit
architecture decision rather than assuming the removed backend still exists.
