---
# stimming-j6e0
title: 'Railgun: volumes at 75% resolution'
status: completed
type: task
priority: normal
created_at: 2026-11-12T07:41:54Z
updated_at: 2026-11-12T07:59:12Z
parent: stimming-f793
---

Tom (2026-11-11): draw the raymarched volumes (fireball, muzzle plume and smoke, dust, vent jets, ring volumes) at 75% resolution. Follows spike stimming-gxfd.

Each draw order gets its own 75% half-float target. One quad per target lays it over the frame at the volume's old draw order, so the layering holds.

- [x] Volumes march into 75% targets; quads composite them at orders 1.9, 2.2 (two groups) and 3
- [x] Gun-depth clip reads with the target's size
- [x] QA: stills before and after the shot at 1280 x 800, clean console
- [x] Frame time of the shot before and after

## Summary of Changes

- `railgun/index.html`, block "volumes at 75% resolution" after `smokeBridge`: `lowRes(order, meshes, depthOf)` puts each group on its own layer and 75% half-float target. `drawVolumes()` runs after `drawGunDepth()` and before `composer.render()`.
- Four groups: fireball (order 1.9, depth-tested), muzzle group (2.2: plume, charge dust, shot dust, muzzle smoke, ring volumes, vent jets), smoke bridge (2.2, depth-tested), case dust (3).
- A depth-tested group's quad writes `gl_FragDepth` at the far side of the volume's proxy sphere, so mesas still stand in front of the fireball and the bridge.
- In the targets the volumes build alpha as cover (`blendSrcAlpha` One, `blendDstAlpha` OneMinusSrcAlpha); the quads keep the old blend into the frame.
- `uDRes` now holds the target size; only `VOLFX` reads it.
- `?volres=1` keeps the old full-resolution path, for A/B checks.
- The code landed inside the `stimming-wsjx` commits `956b9de` and `33e0df9`: that session committed the whole file while this change sat in the working tree.

QA, headless Edge, 1280 x 800, RTX 3070: clean console; stills of charge, shot, smoke and blast match full resolution, a touch softer at the dust rims; the gun still cuts the dust behind it.
Frozen frames, median of 40 synced redraws, full then 75%:

| Frame | Pixel ratio 1, Standard | Pixel ratio 2, High |
|---|---:|---:|
| charge held | 3.2 to 2.6 ms | 6.7 to 7.1 ms |
| 2 s after the shot | 3.8 to 3.5 ms | 11.0 to 8.6 ms |
| 6 s, the blast | 4.1 to 3.6 ms | 12.2 to 8.8 ms |
| 9 s | 4.0 to 3.2 ms | 11.8 to 8.0 ms |

The gain grows with fill: about 10 to 20% at pixel ratio 1, about 25 to 30% at pixel ratio 2 on High.
