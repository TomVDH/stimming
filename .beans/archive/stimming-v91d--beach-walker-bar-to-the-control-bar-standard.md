---
# stimming-v91d
title: 'Beach walker: bar to the control bar standard'
status: completed
type: task
priority: normal
created_at: 2026-11-03T20:34:08Z
updated_at: 2026-11-03T20:36:54Z
parent: stimming-i6a3
---

Bring the Beach walker bar to the Control bar standard in AGENTS.md (a8a95fd). It has 12 visible controls now.

- [x] Time of day becomes one stepper, `‹ Sunset ›`, in place of eight icons
- [x] Wide/Close view moves into Settings
- [x] Reset moves into Settings
- [x] Settings and (i) sit at the right edge
- [x] QA at 1280 and 375 px, clean console
- [x] Commit through a private index and push

## Summary of Changes

The bar shows one choice and two right-edge icons: `‹ Sunset ›`, then Settings and (i).

- The stepper walks eight looks and wraps at each end. The longest name sets its width, so the arrows stay put. Arrow keys step it while it has focus.
- Settings opens from the right edge. It holds View (Wide, Close), Legs, Haze, Cycle the day, Foot path and Reset.
- The stepper and the right-edge group are styled in the toy, not in `shared/stim.css`.
