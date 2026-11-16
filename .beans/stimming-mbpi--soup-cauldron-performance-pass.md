---
# stimming-mbpi
title: 'Soup cauldron: performance pass'
status: todo
type: task
created_at: 2026-11-16T09:46:55Z
updated_at: 2026-11-16T09:46:55Z
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
- [ ] Bake the solid mask once into an R8 atlas; `VEL_FS`, `JAC_FS`, `PROJ_FS`, `FDYE_FS` fetch it. Exact result: today each Jacobi sweep runs `solidAt` (ellipsoid + three leg capsules) six times a cell, twelve sweeps, two steps a frame. No cell past the grid is solid, so out-of-range cells return false.
- [ ] Jacobi sweeps 12 to 8 (Fire's own toy uses 2); compare the flames on the belly
- [ ] Iron bump: one `ironH` Voronoi with an analytic gradient instead of three finite-difference evaluations
- [ ] Flagstone floor: one `stones()` with an analytic gradient, or bake it once into a world-space texture
- [ ] Tie fire march steps, shadow taps and steam steps to `D.level`; let `D.frame` drop the layer size
- [ ] Skip the fire solver when Fire is 0 and the volume is empty
- [ ] Before and after screenshots at the same seeded state; keep the fire on the belly, the marbled soup, the PBR iron, the steam threads
- [ ] Real rAF fps in the visible pane; numbers into the "Quality and performance" table in `docs/toys/cauldron.md`
