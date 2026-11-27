---
# stimming-q3u1
title: 'Prism: sensor pictures beside their pads, tap to enlarge, band readout'
status: completed
type: task
created_at: 2026-11-09T20:18:43Z
updated_at: 2026-11-09T20:18:43Z
parent: stimming-ubwe
---

Tom's third light-table UX slice (2026-11-09). Desktop first, responsive checked.

- [x] Each picture rides beside its own pad, outside the selection ring, on the spot that hides the least light (was: a stack in the top-left corner).
- [x] Tap or click a picture to enlarge it (2.2x, capped at 0.3 of the stage); tap again to shrink. Enlarging lets go of the pad.
- [x] A readout under the picture names the band that lands: WHITE, or a span in nm.
- [x] Ring controls and the remove button keep priority over the picture.
- [x] Checks: 1280, 375 x 812, 812 x 375; tests/bar-v2.html 98 pass; carry and grip still work.
