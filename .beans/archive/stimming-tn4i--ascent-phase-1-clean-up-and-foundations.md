---
# stimming-tn4i
title: 'Ascent phase 1: clean-up and foundations'
status: completed
type: task
priority: normal
created_at: 2026-11-15T04:52:06Z
updated_at: 2026-11-15T04:59:59Z
parent: stimming-ng4g
---

Phase 1 of docs/plans/ascent.md.

## Checklist
- [x] shared/rocket.js: sizes, near and far detail, stage switch, light hook, flame (tail and end-on)
- [x] shared/air.js: single-scatter air GLSL and its CPU twin (fxlab card left to the library chat)
- [x] Bar: Settings (Dawn, Rocket) and Dev rows; Ten seconds' dawn curve
- [x] Archive the look spike
- [x] Performance: shared/detail.js levels, cheaper far backdrop (21 to 27 ms at 2496 x 1504, High)
- [x] Reduced motion and phone sizes
- [x] Frame time; tests/bar-v2.html 105/108 (the shell is unchanged; the three narrow-layout fails need a visible pane)
- [x] PR and merge

## Summary of Changes
shared/rocket.js (three sizes, near and far detail, stage switch, light hook, flame) and shared/air.js (single-scatter air). Ascent runs on both, with Settings and Dev rows, Ten seconds' dawn curve, exposure that follows the light, detail levels and reduced-motion steps. The look spike moved to ascent/archive/.
