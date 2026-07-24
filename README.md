# HypoCycle local demo

This repository is a self-contained, frontend-only demonstration of an
evidence-driven experimentation loop. It uses bundled campaign fixtures and
local video assets.

## Demo video

[Watch the HypoCycle demo on YouTube](https://youtu.be/dGonTvEqKDE)

## Requirements

- Node.js 20 or newer
- npm

No backend, database, account, or API key is required.

## Run in development

```bash
npm install
npm run dev
```

Open:

- [http://localhost:3000](http://localhost:3000) — landing page
- [http://localhost:3000/demo](http://localhost:3000/demo) — campaign demo
- [http://localhost:3000/sandbox](http://localhost:3000/sandbox) — live sponsor-tool workflow

Stop the development server with `Ctrl+C`.

## Run the production build locally

```bash
npm install
npm run build
npm start
```

The production server also runs at
[http://localhost:3000](http://localhost:3000) by default.

## Current scope

- Static three-week Coca-Cola campaign
- Three selectable weeks and nine bundled reels
- Sample hypotheses, metrics, and analysis
- No backend, database, login, or required API key
- Optional, separately routed live sandbox execution

Campaign metrics are presentation fixtures, not live ad-platform results.

## Environment

The demo works with every environment variable blank. Do not create an
environment file for normal local use.

For optional tooling only:

```bash
cp .env.example .env.local
```

- `DAYTONA_API_KEY` creates the ephemeral isolated runtime used by `/sandbox`.
- `FIREWORKS_API_KEY` generates live experiment candidates.
- `BRAINTRUST_API_KEY` records and flushes the live execution trace.
- `BRAINTRUST_PROJECT_NAME` overrides the default telemetry project name.
- `FIREWORKS_MODEL` overrides the default inference model.
- `OPENAI_API_KEY` is used only by the optional local reel-generation script.

The static landing and demo routes do not consume provider credentials. The
server-only `/api/sandbox/run` endpoint is the explicit live integration path.

## Regenerate the bundled reels (optional)

The repository already includes all nine MP4 files, so this is not needed to
run the demo. Generating replacements can consume OpenAI API credits.

```bash
OPENAI_API_KEY=your_key_here node scripts/generate-demo-reels.mjs
```

Existing nonempty reel files are skipped. Delete only the specific reel files
you intentionally want to regenerate.

## Verify

```bash
npm run check:demo-only
npx tsc --noEmit
npm run build
```

`check:demo-only` confirms the application has no backend dependency and that
the fixture references match all nine bundled, nonempty reel files.

See `CLAUDE.md` for the active architecture and `PROGRESS-REPORT.md` for current
verification evidence.
