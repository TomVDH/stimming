---
# stimming-8gez
title: 'Solar loop: probe an eruption as Fires fluid'
status: completed
type: spike
priority: normal
created_at: 2026-11-23T22:40:20Z
updated_at: 2026-11-24T00:03:01Z
parent: stimming-e35i
---

Question (Tom, 2026-11-23): can Fire's 3D fluid carry the eruption? Probe only, behind ?fluid; Tom may not like it.

- [x] Copy the K3 fluid from cloudbottle/fluid.js into solarloop/fluid.js, trimmed
- [x] A box at the erupting site: radial up, the surface as the floor, open sides
- [x] Fill a plasma rope, feed it from the foot, lift it out
- [x] Draw it as glowing cool plasma, added before bloom
- [x] Captures: docs/qa/solarloop/27 (the arch at rest) and 28 (6 s into its eruption)
- [x] Round two (Tom: a block forms; follow the prominences): guide field along the prominence, condensing plasma, drain and sink at the feet, soft box faces, lift with the threads
- [x] Tom's verdict (2026-11-23): keep it flagged. The fluid haze stays behind ?fluid; the toy's default is unchanged.

## Finding

The fluid carries the eruption: the plasma lifts off the limb, billows and curls as it rises, and fades by 24 s. It reads as a smoke plume or a mushroom cloud more than as threaded plasma on field lines. Frame time unchanged on an RTX 3070 (7.8 ms median, 8.5 ms p95). Behind ?fluid only.

## Round two

The fluid now lives on the prominence in view as its haze: it condenses along the arch, drains down the legs, and lifts with the threads when the arch erupts. No box edge shows. The haze trails a little inside the threads during the lift.
