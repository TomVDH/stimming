---
# stimming-86ye
title: 'Star Chart: audio wakes on closer-than-full zoom, not mouse move'
status: in-progress
type: task
created_at: 2026-11-25T22:48:41Z
updated_at: 2026-11-25T22:48:41Z
parent: stimming-e35i
---

Tom, 2026-11-25: remove mouse movement from waking rested/idle audio; zoom wakes audio only when zooming closer than full star view (z < NOTCH).

- [x] Remove mouse move and pointerleave from calling hear()
- [x] Call hear() on zoom only when z < NOTCH
- [x] Update docs/toys/starchart.md
- [ ] Tom checks live
