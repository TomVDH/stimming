---
# stimming-g0wy
title: 'Toy: Smoke ring cannon'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-09T07:48:01Z
updated_at: 2026-11-09T08:41:54Z
---

Smoke ring cannon (`vortex`, Lab). Vortex rings of smoke fly through haze; a laser light sheet cuts a bright plane, and each ring flares as it crosses it. Plan: docs/plans/vortex.md (vortex filaments, Biot-Savart on the CPU; smoke particles advected on the GPU).

- [x] Plan: docs/plans/vortex.md
- [x] Task 1: blockout (scene, haze, sheet, pre-rolled rings, bloom), toys.json and Lab menu entry
- [x] Blockout stills at 1280 and 375 px; Tom signs off (2026-11-09)
- [x] Task 2: aim, charge, Pair, Collide, breakup
- [x] Task 3: Along and Scan sheets, Settings, frame loop
- [x] Task 4: sound (thup, flare tick, room); not heard yet
- [x] Task 5: QA and watchdog; session cost not visible to the agent (Tom to fill)

## Blockout notes (2026-11-09)

- Stills: canvas captures from a throwaway probe page; the pane was hidden, so no bar overlay in them.
- Tap fires a plain ring now. Pair, Collide and Clear work. Along shows; Scan falls back to Across until Task 3.
- Counts: 8 slots x 8192 particles. Frame times not measured yet.

## QA (2026-11-09, browser pane hidden, timer-driven QA page)

| Check | Result |
|---|---|
| Q1 syntax (toy, menu) | pass |
| Q2 console over tap, drag, hold, cancel, chips, Settings, Reset | clean |
| Q4 drift / asleep | 21 fps / 0 frames after 62 s; smoke settles in 4.8 s |
| Q5 hidden | 0 frames; sim clock stops |
| Q7 controls / keys | 5 / 4 |
| Q8 Space, P, C, X | pass |
| Q9 audio context | running after a real click, suspended at rest |
| Ladder rungs 1 to 3 | no GL errors |
| Q6 reduced motion | not run (no media emulation in the pane) |
| Q10 frame times | not measured; needs a real device |

Fixes from QA: one frame chain only (a queued fire woke a second one); drift frames paced by a timer; tendrils fade in about 4 s.
