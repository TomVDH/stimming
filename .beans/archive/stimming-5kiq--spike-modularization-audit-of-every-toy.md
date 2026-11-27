---
# stimming-5kiq
title: 'Spike: modularization audit of every toy'
status: completed
type: spike
priority: normal
created_at: 2026-11-15T06:21:47Z
updated_at: 2026-11-15T06:32:08Z
parent: stimming-3s8z
---

Write docs/plans/modularize.md: inventory, repeats, candidate modules ranked by payoff, adoption order, drift flags.

- [x] Sweep every toy
- [x] Find repeated GLSL and JS
- [x] Map repeats to shared/
- [x] Write docs/plans/modularize.md

## Summary of Changes

Seven agents swept 87 toy folders; a script grouped equal function bodies (62 groups in 3+ toys, about 2,900 exact redundant lines; most repeats are families). docs/plans/modularize.md ranks ten candidate modules, maps drift against shared/, lists bugs found on the way, and gives an adoption order with a reference port per step.
