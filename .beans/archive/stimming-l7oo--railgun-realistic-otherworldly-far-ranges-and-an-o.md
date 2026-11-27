---
# stimming-l7oo
title: 'Railgun: realistic, otherworldly far ranges and an outline lab'
status: completed
type: task
priority: normal
created_at: 2026-11-16T20:20:38Z
updated_at: 2026-11-27T07:19:52Z
---

Tom, 2026-11-16: a dedicated landscape pass: more realistic ranges with some otherworldly features, smooth; and a dev tool that shows the outlines without opening the app. Shared with the far-ranges session (stimming-75xm).

- [x] Move RANGES and the height GLSL to railgun/ranges.js
- [x] Outline lab: railgun/rangelab.html (far-ranges session, 1fc745c9)
- [x] Reshape the ranges: realistic, otherworldly, smooth (first pass; Tom to review)
- [ ] QA in the lab and the app

## Even layers (Tom, 2026-11-16: "landscape looks profoundly weird -- even, nicely distributed topography, a bit more realistic, still alien")

- RANGES is four layers across the whole view at about 64, 100, 150 and 205 km; each centre sits off to one side, so a layer nears the eye on that side.
- The alien forms sit among the layers: tilted slabs left of the middle, a spire field right of the middle, the far volcano. No gap and no lone arcs.
- The near layer keeps a ridge of 1 to 2 degrees in front of the far guns (bearings about 61, 47 and -10).
