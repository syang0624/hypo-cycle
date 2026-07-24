# Local demo video contract

The demo plays nine bundled MP4 files from `public/reels/`:

```text
week1_slot0.mp4 ... week1_slot2.mp4
week2_slot0.mp4 ... week2_slot2.mp4
week3_slot0.mp4 ... week3_slot2.mp4
```

`lib/demoReels.ts` maps campaign entries to these assets.
`components/DemoDashboard.tsx` renders them and falls back to
`components/ReelPreview.tsx` when media cannot load.

There is no active remote video-generation or storage workflow.
