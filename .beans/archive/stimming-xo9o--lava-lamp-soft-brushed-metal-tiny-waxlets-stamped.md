---
# stimming-xo9o
title: 'Lava lamp: soft brushed metal, tiny waxlets, stamped version switch'
status: completed
type: task
created_at: 2026-11-03T20:55:55Z
updated_at: 2026-11-03T20:55:55Z
---

Tom asked for softer brushed metal and tinier waxlets, and called the Classic / Fresh pill cheap.

- [x] Soft brushed metal: faint rings, wide gentle highlights
- [x] Tinier waxlets, more of them, and one shake already throws some
- [x] Stamped version switch on lava only, through STAMPED in stim.js
- [x] QA: flip, shake, switch both ways, Pop keeps its pill, 375px

## Summary of Changes

- `lava/index.html`: softer `shadeMetal`; `tiny()` sizes waxlets from 0.0032 to 0.009; NB is 220; stir gain is 0.024.
- `shared/stim.js`: `STAMPED` lists toys with the new switch; others keep the pill.
- `shared/stim.css`: `.vers` styles, in slab caps; the current build is a hard block, white for Fresh, amber for Classic.
