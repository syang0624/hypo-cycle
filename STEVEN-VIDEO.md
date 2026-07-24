# Archived video handoff

**Status:** Archived on July 24, 2026.

The asynchronous video-generation handoff previously documented here no longer
applies. The demo now plays nine bundled MP4 files from `public/reels/`:

```text
week1_slot0.mp4 ... week1_slot2.mp4
week2_slot0.mp4 ... week2_slot2.mp4
week3_slot0.mp4 ... week3_slot2.mp4
```

`lib/demoReels.ts` maps campaign entries to these local files.
`components/DemoDashboard.tsx` renders the videos and falls back to
`components/ReelPreview.tsx` if a file cannot load.

No provider job, storage URL, polling state, or backend handoff is active.
