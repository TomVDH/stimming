---
# stimming-2rr5
title: 'Clock: Re-roll inside the clock, name on a fixed line'
status: completed
type: task
priority: normal
created_at: 2026-11-17T05:56:58Z
updated_at: 2026-11-17T06:00:17Z
---

Tom, 2026-11-16: the Re-roll sits inside the clock, low middle, always on after 5 s. The toy's name sits on one fixed line in the middle; a two-line name grows up, the motto hangs below.

- [x] Tube caption: name on a fixed line
- [x] Page words: name on a fixed line
- [x] Re-roll inside the clock, scaled to the face
- [x] docs/menu.md
- [x] Verify at three sizes

## Summary of Changes

- `tube.js` `write()`: the name's last line sits on a fixed line above the middle; the motto hangs below.
- `clock.css`: the page words follow the same rule (two grid rows); the Re-roll sits absolute in the face at 73%, sized in cqw; the 34 px kept place under the clock is gone, so the clock gains that height.
- `clock.js`: the Re-roll goes into the face.
- Headless check at 1440x900, 1280x720, 390x844: name foot fixed for all twelve toys; button clear of the motto and the six o'clock toy; click and R deal; Tab goes from toy 12 to the Re-roll.
