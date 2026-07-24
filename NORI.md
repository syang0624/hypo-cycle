# NORI.md — Demo infrastructure and data owner

Read `CLAUDE.md` first.

## Current scope

Nori owns:

- `lib/demoReels.ts`
- `public/reels/**`
- `scripts/check-demo-only.mjs`
- Optional asset-generation scripts
- Optional Braintrust instrumentation
- Provider-adapter experiments under `lib/integrations/`
- Environment templates and architecture documentation

The static demo has no backend-owner workstream. The separate `/sandbox` route
calls Daytona, Fireworks AI, and Braintrust through a server-only endpoint;
provider keys must never enter browser code.

## Demo data contract

`DEMO_CAMPAIGN` contains three ordered weeks with three reels per week.
`DEMO_OVERALL` contains the cross-week summary and winning formula.

Video paths follow:

```text
/reels/week{1..3}_slot{0..2}.mp4
```

Coordinate with Steven before changing fixture shapes consumed by
`components/DemoDashboard.tsx`.

## Verification

```bash
npm run check:demo-only
npm run build
```

Confirm all nine MP4s exist and `/` plus `/demo` work with every environment
variable blank. Live-route verification is separate and may consume provider
credits.

## Future platform work

Persistence, authentication, background orchestration, and live agents still
require a reviewed control-plane architecture. Do not revive deleted legacy
implementation plans.
