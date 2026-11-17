---
# stimming-doqy
title: 'Terrarium: hybrid, a three.js garden under the toy''s glass'
status: completed
type: task
priority: normal
created_at: 2026-11-16T21:58:07Z
updated_at: 2026-11-16T22:06:53Z
parent: stimming-ral1
---

Tom: "ok let's try hybrid" (2026-11-16). three.js draws the garden (moss strands, leaflet fronds, stones, soft shadows) into a picture on the toy's own WebGL context, only when something changes; the toy's ray-marched jar and wet glass draw on top and look through the glass at it. From the probe (stimming-g266).

- [x] environment.js: live scene textures and a before hook (opt-in)
- [x] terrarium/garden.js from the probe
- [x] The jar shader reads the garden; the old plant shapes go
- [x] Wake, growth, Plants (Fern, Moss, Bog), Light and poke drive the garden
- [x] Look tuned; QA at 1280 and 375; sleep and reduced motion hold

## Summary of Changes

Built and QA'd headless (clean console at 1280 and 375; sleeps after a mist; reduced motion draws no frames; poke settles). Garden redraws only on a change; wake goes in 0.02 steps. Frame: 2.7 ms at 1x, 7.7 ms at 2x while misting. Real-device check still open with Tom.
