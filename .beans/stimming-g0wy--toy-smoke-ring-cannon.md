---
# stimming-g0wy
title: 'Toy: Smoke ring cannon'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-09T07:48:01Z
updated_at: 2026-11-09T08:10:44Z
---

Smoke ring cannon (`vortex`, Lab). Vortex rings of smoke fly through haze; a laser light sheet cuts a bright plane, and each ring flares as it crosses it. Plan: docs/plans/vortex.md (vortex filaments, Biot-Savart on the CPU; smoke particles advected on the GPU).

- [x] Plan: docs/plans/vortex.md
- [x] Task 1: blockout (scene, haze, sheet, pre-rolled rings, bloom), toys.json and Lab menu entry
- [x] Blockout stills at 1280 and 375 px; Tom signs off (2026-11-09)
- [x] Task 2: aim, charge, Pair, Collide, breakup
- [x] Task 3: Along and Scan sheets, Settings, frame loop
- [x] Task 4: sound (thup, flare tick, room); not heard yet
- [ ] Task 5: QA and watchdog; record the session cost

## Blockout notes (2026-11-09)

- Stills: canvas captures from a throwaway probe page; the pane was hidden, so no bar overlay in them.
- Tap fires a plain ring now. Pair, Collide and Clear work. Along shows; Scan falls back to Across until Task 3.
- Counts: 8 slots x 8192 particles. Frame times not measured yet.
