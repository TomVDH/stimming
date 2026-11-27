---
# stimming-mbpi
title: 'Soup cauldron: performance pass'
status: completed
type: task
priority: normal
created_at: 2026-11-16T09:46:55Z
updated_at: 2026-11-16T16:26:15Z
parent: stimming-fskg
---

Performance pass on the Soup cauldron (`cauldron/index.html`, raw WebGL2) before Tom moves it to the main shelf.
Goal: 30 fps or better on a laptop at Quality High and Standard, with a full pot (about 14 things), Fire at 1 and while stirring. The idle simmer stays at 30 fps. A hidden tab does no work.

## Baseline (2026-11-16, not yet in the toy doc)

Apple M3 Pro, Chrome headless with the Metal GPU flags, 1280 x 720 at device ratio 2, 17 things, Fire 1, arrow-key stir, Quality High (3.35 M px).
The browser pane was hidden, so its timings were noise; the numbers below come from headless Chrome.

| Measure | ms a frame |
|---|---|
| Whole frame, GPU-bound throughput (readPixels sync) | 5.7 to 6.4 |
| CPU only (all GL passes skipped) | 1.2 |
| Saved by skipping the fire solver (two steps a frame at 30 fps) | about 1.9 |
| Saved by skipping the layer pass | about 2.6 |
| Saved by skipping the scene pass | about 2.3 |
| Rest (bloom, out, dye, ripples) | about 1.8 |

Notes for the measurer:
- `gl.finish()` does not block on ANGLE Metal. Sync with a 1-pixel `readPixels` on the target the pass writes.
- Timer queries (`EXT_disjoint_timer_query_webgl2`) gave noise in the hidden pane.
- Headless rAF runs near 30 Hz, so `D.frame` falsely drops High to Standard there. Use throughput, not rAF fps, in headless. Real rAF fps needs the pane visible.
- The probe was a copy of the page (`cauldron/probe-perf-tmp.html`, deleted) with wrappers on `fireSim`, `dyeStep`, `rippleStep`, `layerPass`, `scenePass`, `outPass`, a seeded `Math.random`, and a `thru(n)` frame loop.

## Plan (safest first)

- [x] Baseline measured (above)
- [x] Bake the solid mask once into an R8 atlas; `VEL_FS`, `JAC_FS`, `PROJ_FS`, `FDYE_FS` fetch it. Exact result: today each Jacobi sweep runs `solidAt` (ellipsoid + three leg capsules) six times a cell, twelve sweeps, two steps a frame. No cell past the grid is solid, so out-of-range cells return false.
- [x] Jacobi sweeps 12 to 8: tried; saves 0.1 ms, kept at 12
- [x] Iron bump: measured at 0.1 ms; left alone
- [x] Flagstone floor: one `stones()` with an analytic gradient
- [x] Steam skips its noise outside the column and the puffs (march steps already follow `D.level`)
- [x] The solver rests after 20 s at Fire 0
- [x] Before and after screenshots at the same seeded state
- [x] Real rAF fps (headed Chrome; the pane stayed hidden); numbers in `docs/toys/cauldron.md`
- [x] Frame gate: 2 ms slack for rAF jitter

## Summary of Changes

GPU time a frame, stirring a full pot at Fire 1: High 5.71 to 4.86 ms, Standard 4.70 to 3.85 ms (M3 Pro). Real frame rate: 29.5 / 55.7 fps to 30.0 / 60.0 fps (simmer / stirring); the frame gate dropped frames on rAF jitter. Changes: a baked solid mask for the fire solver, a steam early exit, a one-Voronoi floor bump, the solver at rest after 20 s at Fire 0, 2 ms gate slack. The look holds: soup, things, iron and floor match; only the chaotic flames move. Table: docs/toys/cauldron.md.
