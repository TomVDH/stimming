---
# stimming-h8f1
title: 'Observatory: the slit centres on the hero telescope'
status: completed
type: task
created_at: 2026-11-18T03:05:59Z
updated_at: 2026-11-18T03:05:59Z
parent: stimming-wqq9
---

Tom, 2026-11-17: the telescope is not central in the slit. Cause: the German mount sets the tube 0.38 m off the polar axis.

- [x] core/mount.ts: slit azimuth where the tube's line of sight leaves the dome; fades out above 60°, capped at 12°; tests
- [x] The hero cupola and the cut framing turn by the offset; the machine and the light model stay as they are
- [x] Live: the roll shot shows the objective centred

## Summary of Changes
New core/mount.ts and tests/observatory-mount.test.mjs; world/hero.ts heroSlitAz; view/cuts.ts frames the hero slit.
