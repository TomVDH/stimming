---
# stimming-j1lw
title: 'ShadyOS: shadows follow a wobbling window'
status: completed
type: task
priority: normal
created_at: 2026-11-04T21:50:00Z
updated_at: 2026-11-16T08:44:07Z
parent: stimming-shdy
---

The jelly bends the window, but its shadow stays a rectangle. See docs/plans/shadyos.md, Polish 2.

- [x] Draw the shadow from the window mesh itself: offset, widened and softened, so it bends with the window.
- [x] Keep the pass cheap: the shadow draws on the window mesh only, so no scissor is needed.
- [x] Screenshot a fling mid-wobble to check.

## Summary of Changes

Done inside stimming-r6g1 (the ShadyOS overhaul).
