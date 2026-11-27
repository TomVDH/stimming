---
# stimming-xymd
title: 'Train Ride: sharper, fainter cabin reflection'
status: completed
type: task
priority: normal
created_at: 2026-11-15T09:45:56Z
updated_at: 2026-11-15T09:49:53Z
parent: stimming-6z3j
---

Tom (2026-11-15): the baked cabin cube map should be higher resolution and less obvious in the window.

## Checklist
- [x] Cube map 512 to 1024 px a face; the pane reads it at the same mip, so the cabin is twice as sharp
- [x] The cabin in the pane at a third of its strength; the fog veil and the double-glazing ghost lower too
- [x] The baked sun patches half as bright: they made pale blobs low in the day window
- [x] Stills before and after: tunnel, night, day (trainride/dev/fx-cube.png)
- [x] Tom checks: merged to main (2026-11-15)

## Summary of Changes

Cube map at 1024 px a face; the cabin shows at a third of its strength; baked sun patches half as bright.
