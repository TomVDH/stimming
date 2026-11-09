---
# stimming-3y30
title: 'Window seat: storm towers big effort pass'
status: completed
type: task
priority: normal
created_at: 2026-11-09T08:13:24Z
updated_at: 2026-11-09T08:43:12Z
parent: stimming-w1nd
---

Follows stimming-fres (towers and bolts). Rework the cumulonimbus towers in window/: cauliflower tops, sheared anvil, dark rain-shaft base, overshooting tops, soft inner scatter, lightning lit from inside. No blocky edges, banding or tiling. Hold High frame cost.

- [x] Baseline frame time and before shots (dusk, night, dawn, storm max)
- [x] Rewrite tower density (tnoise, towerDens, towerBound)
- [x] Rewrite tower lighting and inner lightning
- [x] Tune spawn and drive JS (cells, flashes)
- [x] After frame time and after shots
- [x] Commit on branch

## Summary of Changes

- Storm cells are shape fields: four capsule turrets, a flat base, a wedge anvil fan that thins to a frayed ice veil downwind, and an overshooting dome on the core.
- Billows are Worley lumps at three sizes from one fetch, turned and shifted per tower; a finer octave on High. Lumps rise slowly, so tops boil.
- Light: sky dome (zenith, sun-side glow, far side), crease shading from the shape depth, an outward sky tap (High), a lumpy and a smooth tap toward the sun, an even multi-scatter term.
- Lightning: a hot core round the flash and a wide glow through the tower. Flashes sit inside the core; some cross the anvil.
- A rain shaft hangs under the base: four analytic taps, grey streaks, hidden by the deck in front. Tower parts below the deck top sink behind the deck.
- Cells grow over 20 s (congestus, then anvil) and decay over 15 s. JS towerGeom mirrors the shader for taps and sun cover.
- The impact stem keeps the old code path; its frames are pixel-identical.
- Cost (interleaved A/B, 2496x1368): High dusk 3.0 vs 3.1 ms, night 1.0 vs 1.1 ms; Standard 0.4 vs 0.4 ms.
