---
# stimming-tnjr
title: 'East Van Alley: bake the clouds, smooth the frame pacing, volumetric shadows'
status: todo
type: task
created_at: 2026-11-18T02:53:21Z
updated_at: 2026-11-18T02:53:21Z
parent: stimming-guw5
---

Carried over from stimming-2b59 (Tom, 2026-11-17).

- [ ] Bake the clouds at five cloudiness levels (thickness textures; slide and relight per frame)
- [ ] Bake as much as we can for a big perf gain, judged live with Tom, one change at a time
- [ ] Smooth the frame pacing (30 fps drift, the cloud redraw every third frame, the car rebake)
- [ ] Volumetric shadows: A screen-space rays, B Railgun-style fitted blobs, C ray-marched haze on baked clouds. Recommended: bake clouds, then C at low resolution. Tom to pick.
