---
# stimming-wn0c
title: 'Star Chart: invert scroll zoom direction and smoothen controls with less inertia'
status: completed
type: task
priority: normal
created_at: 2026-11-27T06:50:55Z
updated_at: 2026-11-27T06:52:06Z
---

Invert wheel zoom direction and smoothen Star Chart camera controls with less inertia (Tom, 2026-11-26).

- [x] Invert wheel scroll direction in `starchart/main.js`
- [x] Reduce zoom inertia (`ZOOM_T`, `ZOOM_IN`, `LEAD`) and smoothen drag/return/sway (`dragGoal`, `BACK_T`, `SWAY_T`) in `starchart/main.js`
- [x] Update `docs/toys/starchart.md` where control timings changed
- [x] Verify syntax on `starchart/main.js`

## Summary of Changes

Inverted wheel scroll zoom direction, reduced zoom inertia (`ZOOM_T` 0.35 -> 0.22, `ZOOM_IN` 1.4 -> 1.18, `LEAD` 1 -> 0.75), added tight critically damped drag smoothing (`DRAG_T = 0.08`), tightened drag return (`BACK_T` 0.9 -> 0.65) and far-out lens sway (`SWAY_T` 0.9 -> 0.6), and updated `docs/toys/starchart.md`.
