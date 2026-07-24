# STEVEN.md — Demo frontend owner

Read `CLAUDE.md` first.

## Current scope

Steven owns:

```text
app/**
components/**
public/**
tailwind.config.ts
```

Coordinate with Nori before changing `lib/demoReels.ts`.

## Active routes

| Route | Purpose |
| --- | --- |
| `/` | Product thesis and demo entry point |
| `/demo` | Interactive three-week sample campaign |

Both routes must remain statically renderable.

## Interaction contract

Preserve:

- Three week selectors
- Three reel cards per week
- Hypothesis, results, and analysis per week
- CPC trend and campaign summary
- Killed, running, and winning states
- Local playback with `ReelPreview` fallback
- Clear sample-data disclosure

## UX rules

- Do not imply that fixture metrics are live evidence.
- Do not add controls that imply persistence.
- Keep responsive and keyboard-accessible behavior.
- Keep the frontend working with all environment values blank.
- Do not expose server-side sponsor keys through browser code.

## Verification

```bash
npm run check:demo-only
npm run build
```

Also smoke-test landing navigation, week switching, local video playback,
fallback behavior, and browser console errors.
