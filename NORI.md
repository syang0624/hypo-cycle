# NORI.md — Backend and integration owner

Read `CLAUDE.md` and `PRD.md` first.

## Current repository state

`main` currently contains a union of two product surfaces:

1. A live legacy experiment flow backed by Convex.
2. A deterministic static campaign demo at `/demo`.

The earlier demo-only commit removed Convex, but subsequent all-branch union
merges restored the Convex dependency, backend directory, provider, live routes,
and reactive frontend components. Treat Convex as active until a new cleanup
commit removes those restored files.

ElevenLabs remains removed. Voice work in the PRD is provider-agnostic and has no
current implementation.

## Your scope

Nori owns:

```text
convex/**
lib/agents/**
lib/simulator/**
lib/bandit.ts
lib/video/**
lib/integrations/**        # future
instrumentation.ts
next.config.mjs
.env.example
```

Nori also owns the contract consumed by Steven's live frontend:

- Products and experiment lifecycle
- Hypotheses, variants, metrics, rationale, and allocations
- Scheduled simulation and analysis work
- Video generation and storage
- Error, phase, and progress state

Coordinate with Steven before changing public function names, arguments,
returned fields, phases, or loading semantics.

## Active integrations

| Capability | Current status |
| --- | --- |
| Convex | Active legacy backend and reactive data layer |
| Braintrust | Optional instrumentation configured |
| OpenAI/Sora | Legacy agent and reel-generation utilities |
| Daytona | Roadmap only |
| Fireworks AI | Roadmap only |
| CopilotKit | Roadmap only |
| CodeRabbit | Roadmap only |
| WorkOS | Roadmap only |
| Voice provider | Unselected; no implementation |

Environment placeholders do not prove an integration is implemented.

## Static demo contract

The `/demo` content is static:

- `lib/demoReels.ts` contains three weeks of static campaign data.
- `public/reels/` contains nine local MP4 assets.
- `components/DemoDashboard.tsx` must not require Convex.
- `components/ReelPreview.tsx` remains the media fallback.

However, `app/layout.tsx` currently wraps every route in
`ConvexClientProvider`. As a result, even `/demo` and the landing page require
`NEXT_PUBLIC_CONVEX_URL` during prerendering. Decoupling the static routes from
that provider is still required before they are truly backend-independent.

## Backend verification

Before changing Convex code, read:

```text
convex/_generated/ai/guidelines.md
```

Then run the smallest relevant backend validation followed by:

```bash
npm run build
```

The build currently requires a valid `NEXT_PUBLIC_CONVEX_URL`. Without it,
compilation completes but static page generation fails when
`ConvexReactClient` is initialized. This is a known restored-coupling issue,
not a documentation-only failure.

Also smoke-test both surfaces:

- Live flow: `/programs/new` → launch → `/cycles/[cycleId]`
- Static-content flow: `/demo` (currently still wrapped by the global provider)

## Architecture decision still required

The current union tree conflicts with the earlier direction to make the product
demo-only. If Convex should be removed again, that is an implementation task:
delete the restored backend and live frontend together, update dependencies, and
verify the static demo. Documentation alone must not claim that migration has
already happened.
