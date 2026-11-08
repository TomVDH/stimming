---
# stimming-x4qk
title: 'Toy: Ink in water'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-08T10:08:28Z
updated_at: 2026-11-08T10:54:07Z
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
- [ ] Task 4: sound
- [ ] Task 5: bar, Settings, toys.json, menu Lab entry, QA
- [ ] Record the session cost


## Notes

- In a hidden Browser pane, frame callbacks almost stop. Judge motion with the pane shown.
- An inactive pane tab gets no WebGPU adapter until it shows; it is not a GPU crash.
- A visible tab ran at 120 fps on the Standard grid (72 x 120 x 36).
