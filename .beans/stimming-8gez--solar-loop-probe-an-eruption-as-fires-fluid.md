---
# stimming-8gez
title: 'Solar loop: probe an eruption as Fires fluid'
status: in-progress
type: spike
created_at: 2026-11-23T22:40:20Z
updated_at: 2026-11-23T22:40:20Z
parent: stimming-e35i
---

Question (Tom, 2026-11-23): can Fire's 3D fluid carry the eruption? Probe only, behind ?fluid; Tom may not like it.

- [x] Copy the K3 fluid from cloudbottle/fluid.js into solarloop/fluid.js, trimmed
- [x] A box at the erupting site: radial up, the surface as the floor, open sides
- [x] Fill a plasma rope, feed it from the foot, lift it out
- [x] Draw it as glowing cool plasma, added before bloom
- [x] Captures: docs/qa/solarloop/27 to 29 (2, 5 and 9 s into an arch eruption)
- [ ] Tom's verdict: keep, tune or drop

## Finding

The fluid carries the eruption: the plasma lifts off the limb, billows and curls as it rises, and fades by 24 s. It reads as a smoke plume or a mushroom cloud more than as threaded plasma on field lines. Frame time unchanged on an RTX 3070 (7.8 ms median, 8.5 ms p95). Behind ?fluid only.
