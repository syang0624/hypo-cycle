# HypoCycle local demo — project context

This repository contains a self-contained frontend demo and a separate,
optional live sponsor-tool sandbox. `PRD.md` describes the broader future
platform and is not the current implementation contract.

## Current experience

- `/` presents the HypoCycle experimentation thesis.
- `/demo` presents a fixed three-week Coca-Cola campaign.
- `/sandbox` runs an explicitly triggered, live sponsor workflow.
- Users can switch weeks, play bundled reels, compare CPC/CAC, and inspect the
  sample hypothesis and analysis.
- Campaign results are fixtures, not live ad-platform measurements.

## Architecture

- Next.js 14 App Router
- React 18 and TypeScript
- Tailwind CSS
- Static fixtures in `lib/demoReels.ts`
- Nine bundled MP4 files under `public/reels/`
- Optional Braintrust instrumentation
- Live Daytona, Fireworks AI, and Braintrust orchestration under `lib/sandbox/`
- Provider contracts under `lib/integrations/`

There is no required database, scheduler, authentication layer, or runtime
environment variable for `/` or `/demo`. `/sandbox` requires sponsor keys and
calls only the server-side API route.

## Active files

| Surface | Source |
| --- | --- |
| Landing | `app/page.tsx` |
| Demo route | `app/demo/page.tsx` |
| Live sandbox | `app/sandbox/page.tsx` |
| Live server endpoint | `app/api/sandbox/run/route.ts` |
| Sponsor orchestrator | `lib/sandbox/runSponsorCycle.ts` |
| Dashboard | `components/DemoDashboard.tsx` |
| Video fallback | `components/ReelPreview.tsx` |
| Shared UI | `components/ui.tsx` |
| Campaign fixtures | `lib/demoReels.ts` |
| Architecture guard | `scripts/check-demo-only.mjs` |

## Rules

- Keep the demo honest and deterministic.
- Keep all nine local reels playable.
- Preserve Week 1 → Week 3 learning and performance progression.
- Never expose sponsor credentials to client components.
- Keep live sandboxes ephemeral, bounded, and default-deny for networking.
- Do not add persistence or external-production actions without explicit scope.
- Preserve unrelated sponsor-integration adapters unless the user removes them.

## Verification

```bash
npm run check:demo-only
npm run build
```

For UI changes, verify landing navigation, all week selectors, local video
loading, fallback previews, and browser console errors.
