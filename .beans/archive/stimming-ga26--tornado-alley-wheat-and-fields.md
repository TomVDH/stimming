---
# stimming-ga26
title: 'Tornado alley: wheat and fields'
status: completed
type: task
priority: normal
created_at: 2026-11-17T08:00:13Z
updated_at: 2026-11-17T19:59:00Z
parent: stimming-dwwg
---

Own the plain's wheat and fields in tornado/main.js (envScene GLSL): the wheat albedo, gust sheen, near ears and stalks, drill rows, clumps, ripples, and the cloud shadows on the ground. The eye is 1.25 m, 35 mm, horizon at 0.382.

- [x] Wind: travelling gust waves driven by Wind, Storm and near tornadoes; wheat flattens toward a tornado
- [x] Fields: ripe wheat, stubble, fallow strips, green patches, edges and tracks, drill rows near the eye, fade to the far colour
- [x] Near wheat: stalks and heads near the eye with self-shadow, parallax and motion
- [x] 30 fps on the minimum frame with three F4.5 at 1828 x 984; console clean (moved to stimming-2ftc)
- [x] Stills in docs/qa/tornado-fields/ (golden hour, dusk, low and full Storm)

## Merge with main (2026-11-17)

Main's `tornado/wheat.js` stand (ground session, stimming-o3o5) replaces my slice stand. My wind (`gust(xz, fx)` vec4, `bend(gw, h)`, uGust, uTorF, the flatten) and the fields stay. Short forms `gust(xz)` and `bend(xz, h, g)` read the new wind, so wheat.js and line.js run on it unchanged. Both fields beside the eye are wheat. The 30 fps check waits for a quiet GPU: main alone measured 35.5 ms at best during the merge, the branch 33.7 ms.

## Summary of Changes

- Wind: `gust(xz, fx)` with lean, sheen and gust; `bend()`; uGust and uTorF. Wheat leans toward a near tornado.
- Fields: quarter-mile grid with wheat, stubble, fallow and green; strip fields, margins, drill rows. The far field filters its grain by footprint.
- Near stand: main's `wheat.js` walk, with wind, PBR light, a ragged top, nodding heads and thin patches.
- Damage track from `dmgAt()`: lodged from 30 m/s, stubble from 80 m/s, bare soil from 100 m/s.
- Final stills: `docs/qa/tornado-fields/10-final-*.jpg`, golden and dusk, Storm 0.15 and 1 with three F4.5. Console clean, no GL errors.
- Frame time, three F4.5 at 1828 x 984, back to back on one origin: 31.2 ms at 495f5157, 41.3 ms after the merge of main at f64f7b69. The fields code did not change between the two. The new cost comes from the farm, infrastructure and layered air. stimming-2ftc owns the perf pass.
