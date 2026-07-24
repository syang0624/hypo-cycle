# STEVEN.md — Frontend owner

Read `CLAUDE.md` and `PRD.md` first.

## Current repository state

`main` currently ships two frontend surfaces:

1. A live HypoCycle/legacy HookLoop flow using Convex queries and mutations.
2. A static-data HookLoop campaign at `/demo`.

The earlier demo-only cleanup was partially reversed by later union merges.
Convex-dependent routes and components are present again and must be treated as
active until they are removed in code.

ElevenLabs is not implemented. Do not add ElevenLabs-specific UI, types, copy,
or environment assumptions. Future voice experiments remain provider-agnostic.

## Your scope

Steven owns:

```text
app/**
components/**
lib/types.ts
lib/mockData.ts
public/**
tailwind.config.ts
```

Coordinate with Nori before changing backend contracts or fixture shapes.

## Active routes

| Route | Surface |
| --- | --- |
| `/` | Landing and product entry points |
| `/programs/new` | Live program/setup flow |
| `/cycles/[cycleId]` | Live reactive experiment dashboard |
| `/setup` | Legacy compatibility route |
| `/launch/[batchId]` | Live launch/progress route |
| `/dashboard/[batchId]` | Legacy live dashboard route |
| `/demo` | Static three-week campaign |

## Live frontend contract

The live flow currently depends on Convex for:

- Product and experiment creation
- Status, phase, progress, and errors
- Hypotheses, variants, metrics, rationale, and allocations
- Starting subsequent weeks
- Reactive updates and loading states

Do not replace those calls with static data unless the user explicitly chooses
the demo-only architecture again.

## Static demo contract

The `/demo` route uses bundled data and local media:

- Three selectable weeks
- Three local reels per week
- Sample hypotheses, metrics, and analysis
- CPC trend and campaign summary
- Killed, running, and winning states
- `ReelPreview` fallback when media cannot load
- Clear disclosure that results are sample fixtures

The route is not currently isolated from the live backend provider:
`app/layout.tsx` wraps it in `ConvexClientProvider`. Therefore prerendering still
requires `NEXT_PUBLIC_CONVEX_URL`, even though `DemoDashboard` itself makes no
backend calls. Removing that global coupling is required before `/demo` can
build with all environment values blank.

## UX rules

- Never present simulated or fixture metrics as real evidence.
- Keep live and static experiences visually distinguishable.
- Preserve responsive behavior and keyboard accessibility.
- Avoid controls that imply persistence on `/demo`.
- Never expose server-side sponsor API keys through client code.
- Do not build a provider-specific voice UI without a reviewed integration.

## Verification

Run:

```bash
npm run build
```

Known validation requirement: `NEXT_PUBLIC_CONVEX_URL` must currently point to
a valid deployment. Without it, compilation succeeds but prerendering fails
when the global `ConvexReactClient` is initialized.

For UI changes, smoke-test:

1. Landing navigation.
2. Live program creation and cycle routes with the backend running.
3. Static `/demo` week switching and local video playback.
4. Missing-video fallback behavior.
5. Browser console errors on both surfaces.

## Architecture decision still required

If the product is meant to remain demo-only, the restored live routes,
components, Convex provider, backend functions, and dependency must be removed
again as one verified implementation change. Until then, frontend documentation
must reflect the union tree that actually exists.
