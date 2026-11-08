---
# stimming-x4qk
title: 'Toy: Ink in water'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-08T10:08:28Z
updated_at: 2026-11-08T12:00:03Z
---

Ink in water (`ink`, idea 35). Ink drops fall into a tall, still tank of dark water as vortex rings, break into fingers, and glow in side light.

Plan: `docs/plans/ink.md`. D3: WebGPU only on three.js 0.186.1, as Fire (Tom, 2026-11-08). D4: Dark field is the default; dark water, glowing ink (Tom, 2026-11-08). Builds K3 from Fire's volume sim; Fire's sim stays untouched.

## Checklist

- [x] Blockout: one still frame, dark field, one indigo plume halfway down, the meniscus line; stills at 1280 and 375 px
- [x] Checkpoint: Tom signs off the blockout (2026-11-08)
- [x] Task 1: the tank at rest, K3 lifted and marked (dark field; the emitter list and MacCormack dye came in early)
- [x] Task 2: vortex-ring drops, five inks that mix by absorption (tap and Space drop, Weight, Clear)
- [x] Task 3: pipette, stir, Backlit mode in Settings, Drift, watchdog (K3 is now a factory; a quality or stage-shape change rebuilds it and resamples the ink)
- [x] Tom, 2026-11-08: no meniscus line; the tank fills the stage, its width follows the stage shape
- [x] Tom, 2026-11-08: look pass: brighter ink, soft water with no edge, finer cells, Backlit as a soft oval lightbox
- [x] Task 4: sound (drip, bloom, fizz, swish, wash; plain Web Audio on the kit; Q9: running after a tap, suspended 6 s later)
- [x] Tom, 2026-11-08: Backlit is the default light; a faint glow shows the light's side; High runs 1.6M cells
- [x] Task 5: bar, Settings, toys.json, menu Lab entry, QA (Q1, Q2, Q3, Q7 and Q9 pass; Q6 checked in code; Tom skipped Q4 and Q8, 2026-11-08)
- [x] Tom, 2026-11-08: main shelf as No. 32 (Beta); emblem in shared/emblems/ink.svg; the menu icon gains a light wedge from the upper left
- [ ] Icons: five directions in spike 16 (A porthole of glowing ink, B one drop, C three drops, D backlit watercolour slab, E brush ring), on the sheet; Tom picks
- [ ] Record the session cost


## Notes

- In a hidden Browser pane, frame callbacks almost stop. Judge motion with the pane shown.
- An inactive pane tab gets no WebGPU adapter until it shows; it is not a GPU crash.
- A visible tab ran at 120 fps on the Standard grid (72 x 120 x 36).
