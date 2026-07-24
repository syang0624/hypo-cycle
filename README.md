# HookLoop local demo

This repository is a self-contained, frontend-only demonstration of HookLoop's
three-week ad experimentation experience. It uses bundled sample campaign data
and local video assets, so no backend service or environment variables are
required.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), then select **Explore Demo**.

## Current scope

- Static Coca-Cola sample campaign
- Three selectable weeks and nine bundled reels
- No backend, database, login, or required API key
- No product creation or live experiment execution

Campaign metrics are presentation fixtures, not live ad-platform results.

## Verify

```bash
npm run check:demo-only
npm run build
```

See `CLAUDE.md` for the active architecture contract and
`PROGRESS-REPORT.md` for current verification evidence.
