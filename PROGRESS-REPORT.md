# HypoCycle demo progress report

**Date:** July 24, 2026

**Status:** Static demo preserved; separate live sponsor sandbox available

## Current outcome

The repository now contains a self-contained presentation experience:

- Landing page at `/`
- Interactive sample campaign at `/demo`
- Three weeks and nine bundled reels
- Week-specific hypotheses, metrics, insights, and status
- Generated visual fallback for missing media
- Live experiment runner at `/sandbox`
- Fireworks candidate generation, Daytona isolation, and Braintrust tracing

## Architecture

| Area | Current implementation |
| --- | --- |
| Framework | Next.js 14 App Router |
| UI | React, TypeScript, Tailwind CSS |
| Campaign data | `lib/demoReels.ts` |
| Media | Bundled files under `public/reels/` |
| Required backend | None |
| Required environment | None |
| Optional live route | Server-only `/api/sandbox/run` |
| Live providers | Daytona, Fireworks AI, Braintrust |

## Deliberately absent surfaces

- Persistent product and experiment creation
- Dynamic cycle and dashboard routes
- Database functions and reactive subscriptions
- Background scheduling and durable agent execution
- Persistent experiment state
- Remote video generation and storage
- Project-local tooling for the deleted backend

## Verification

```bash
npm run check:demo-only
npm run build
```

The UI is also browser-tested for navigation, week switching, and local media.

## Limitations

- Results are fixed sample data.
- The app cannot create or persist experiments.
- The live workflow is synchronous and ephemeral; it is not a durable control
  plane.
- CodeRabbit activates at the repository pull-request boundary rather than
  through the synchronous sandbox endpoint.
- Dependency audit findings are tracked separately from demo functionality.
