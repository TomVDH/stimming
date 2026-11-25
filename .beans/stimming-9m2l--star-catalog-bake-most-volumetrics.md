---
# stimming-9m2l
title: 'Star catalog: bake most volumetrics'
status: in-progress
type: task
priority: normal
created_at: 2026-11-25T02:57:48Z
updated_at: 2026-11-25T03:09:18Z
parent: stimming-e35i
---

Tom, 2026-11-24: "For the most part we can bake most volumetrics."

- [x] Bake the haze and the corona into a spherical 3D texture in the star's frame, once per star and on a Dev change (256 x 128 x 64, RGBA16F: haze, its light at two strengths, corona)
- [x] The march samples the bake: 72 steps, no dither
- [ ] The holes' volumes: with stimming-cbfy
- [ ] A binary's gas and a pulsar's beams: still live, with the dither
- [ ] Frame times checked
- [ ] Build, show, Tom looks
