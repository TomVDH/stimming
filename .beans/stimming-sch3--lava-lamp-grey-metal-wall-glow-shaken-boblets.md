---
# stimming-sch3
title: 'Lava lamp: grey metal, wall glow, shaken boblets'
status: completed
type: task
created_at: 2026-11-03T20:51:30Z
updated_at: 2026-11-03T20:51:30Z
---

Tom asked for an always grey brushed metal base, a soft lamp glow on a faint back wall, and snow globe physics: shaking throws small wax boblets that swirl.

- [x] Grey brushed metal base and cap in every palette
- [x] Faint plaster wall lit by the lamp's glow
- [x] Hand spring and stir energy, ported from the snow globe
- [x] Curl-noise swirl moves blobs and boblets
- [x] Boblets shed by a shake, drawn as lit points, taken back by blobs and the pool
- [x] Space shakes; the finger heat replaces the warm key
- [x] QA at 1280px and 375px, mass conserved, stress run clean

## Summary of Changes

- `lava/index.html`: `sdMetal` and `shadeMetal` replace the clay; `wall()` lights a plaster wall from four points up the glass.
- The lamp now follows the hand on a spring; jolts and fast turns pump `LQ.E`, which drives a curl-noise field.
- Up to 160 boblets shed from blobs and the pool, ride the swirl, and rejoin; they draw in a second point-sprite pass.
