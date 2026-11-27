---
# stimming-3ekx
title: 'East Van Alley: shadows flip when the hour is scrubbed'
status: completed
type: bug
priority: normal
created_at: 2026-11-22T10:12:21Z
updated_at: 2026-11-22T10:41:02Z
parent: stimming-guw5
---

Tom (2026-11-22 01:52): shadows awkwardly flip when scrubbing ToD.

Cause: lightAt() switched the key light from the sun (south) to the moon (north, in view) in one frame at day 0.3 (18:33), at full strength. The sun was also lifted to 6 percent above the horizon, so it lit from 9 degrees under it. The shared clock blends only the colour.

- [x] handOver(): the sun's key fades out just under the horizon; the moon's fades in from zero; the side changes at zero strength
- [x] The moon side uses moonlight's colour, read from the shared clock at midnight
- [x] The clouds hand over later (sun to 4.6 degrees under), so they keep sunset light
- [x] The sun disc keeps its full colour
- [x] Tom (02:22): no graceful hand-over between dawn and dusk; the pole still looks waxy
- [x] Two keys for the parts, sun and moon, each with its shadows; each fades over its last 9 degrees to 3 under the horizon, so they cross-fade at dawn and dusk
- [x] Waxy wood: a roughness-aware Fresnel on the key lights; Oren-Nayar diffuse (Fujii) for rough faces
- [x] Waxy wood: deeper, darker checks; the lane's bounce follows the sun's height (15 percent albedo)
- [x] The wood's displacement keeps the outer surface where the sunk one misses (no discard)
- [x] Tom (02:36): the sky GIs the pole way too much: sky fill halved (the alley hides about half the sky)
- [x] Tom's look on the dawn and dusk sweeps, the wood and the fill (02:40: keep, commit)
- [x] Commit

## Summary of Changes

The parts take two key lights, sun and moon, each with its shadows; each fades over its last 9 degrees to 3 under the horizon, so they cross-fade at dawn and dusk. The moon uses moonlight's colour from the shared clock at midnight. The clouds hand over at zero strength, later than the pole. The sun disc keeps its full colour. Wood: a roughness-aware Fresnel on the key lights, Oren-Nayar diffuse, deeper checks, a lane bounce that follows the sun's height, and the sky fill halved. shared/ is untouched.
