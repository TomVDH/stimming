---
# stimming-0h67
title: 'Icons: chunk 1, ten main-shelf toys with no round'
status: in-progress
type: task
created_at: 2026-11-23T08:46:43Z
updated_at: 2026-11-23T08:46:43Z
parent: stimming-6vbt
---

Part of stimming-6vbt. A new icon round for each, one at a time, on the sheet.

- [x] Lava lamp (lava-2)
- [x] Googly eyes (eyes-1)
- [x] ShadyOS (shadyos-1)
- [x] Cloud chamber (chamber-1)
- [x] Ink in water (ink-1)
- [x] Frietkot (frietkot-5)
- [x] Railgun (railgun-3)
- [x] Train Ride (trainride-3)
- [x] Lit motorway (motorway-2)
- [x] Kintsugi (kintsugi-1)
- [x] Each round checked against tornado-3 and the reference icons, live on the sheet
- [ ] Commit the chunk through tools/commit.sh, sheet hunks only
- [ ] Report to Tom
- [ ] Record his marks in icons/picks.json (Tom, 2026-11-23: the vote comes later, on all rounds)
- [ ] Install only the picks: menu li, intro emblem, toys.json emblem

## Notes

- The sheet now keeps every round: `GALLERY` takes a list, oldest first; earlier rounds sit on rows under the newest. Marks carry the round, as `Shaded object (lava-2)`. Tom asked for this mid-chunk (2026-11-23).
- Earlier rounds on the sheet: lava-1, railgun-1, railgun-2, motorway-1. The galleries for Ink (spike-35), Frietkot 1 to 4 and Train Ride 1 and 2 use an older layout the sheet cannot split into cards; their picked icons stay in the Current column.
- Emblems for Ink and Kintsugi are `ink1-*.svg` and `kintsugi1-*.svg`: `ink-a`, `ink-d` and `kintsugi-a` belong to earlier work.
- Ink in water needs WebGPU, so its look comes from `shared/stills/ink.webp`.
- The Railgun Current copies the menu tile, with its empty-cx console errors (known in stimming-yrcx).
