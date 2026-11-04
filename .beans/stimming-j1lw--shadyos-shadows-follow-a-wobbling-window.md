---
# stimming-j1lw
title: 'ShadyOS: shadows follow a wobbling window'
status: todo
type: task
priority: normal
created_at: 2026-11-04T21:50:00Z
updated_at: 2026-11-04T21:50:00Z
parent: stimming-shdy
---

The jelly bends the window, but its shadow stays a rectangle. See docs/plans/shadyos.md, Polish 2.

- [ ] Draw the shadow from the window mesh itself: offset, widened and softened, so it bends with the window.
- [ ] Keep the scissor bound, so the pass stays cheap.
- [ ] Screenshot a fling mid-wobble to check.
