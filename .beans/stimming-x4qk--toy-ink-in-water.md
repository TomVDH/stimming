---
# stimming-x4qk
title: 'Toy: Ink in water'
status: completed
type: feature
priority: normal
created_at: 2026-11-08T10:08:28Z
updated_at: 2026-11-09T07:33:14Z
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
- [x] Icons: five pointer-driven directions in spike 16 (A Stir, B Drop, C Thread, D Light, E Mix), on the sheet; Tom picks A, Stir: on the menu, emblem swapped, pick recorded
- [x] Record the session cost: the app shows no cost per session. The session ran on Opus 5.5, compacted once, and stands at 250k tokens of context.


## Notes

- In a hidden Browser pane, frame callbacks almost stop. Judge motion with the pane shown.
- An inactive pane tab gets no WebGPU adapter until it shows; it is not a GPU crash.
- A visible tab ran at 120 fps on the Standard grid (72 x 120 x 36).

- Menu icon pass 2: inertia, smear along the stroke, denser plume and curled tendrils, wisps, a sliding glint; spike 16 A matches.

- Ink grid: the dye runs on its own grid, finer than the flow (x2 on Standard, x1.5 on the others), so threads and ring rims come out sharper. Step cost rose about 12% on Standard.

## Rename (2026-11-09)

Tom renames the toy to Ink Water. The Dutch name is Inktwater, ˈɪŋktˌʋaːtər.

- [x] Logo redo: a square faux bloom mark, as if taken from the toy (direction F, Bloom: a captured frame traced into four bands; menu icon, emblem, gallery, pick)

## Speed pass (2026-11-09)

- The march reads one texel in clear water; noise and light run only in ink.
- A ray stops once it is opaque.
- The page draws only after a sim step; catch-up is two steps at most.
- Standard's ink grid is 1.5x, not 2x.
- High, Backlit: a draw falls from about 68 ms to about 5 to 8 ms (probe, background tab).

## Summary of Changes

Tom signs off Ink Water on 2026-11-09. It carries `data-done` on its intro and menu entry. The version steps to 0.7, codename Inktwater.
The toy runs K3 on WebGPU, with the ink on a finer grid than the flow. Backlit is the default light. The menu logo is a bloom traced from the toy.
