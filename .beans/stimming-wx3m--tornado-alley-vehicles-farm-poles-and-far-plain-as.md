---
# stimming-wx3m
title: 'Tornado alley: vehicles, farm, poles and far plain as meshes'
status: in-progress
type: feature
created_at: 2026-11-22T20:28:16Z
updated_at: 2026-11-22T20:28:16Z
---

Tom, 2026-11-22: solid objects become meshes, the far plain too ('yes bake as meshes'; 'do all'). Approach A: the toy rasterizes each group into its own targets in before(); one layer pass lays the group in at its slot. Design: docs/plans/tornado-meshes.md. Vehicles first; Windows runs without them until then (stimming-azxj).

- [x] Design signed off by Tom (2026-11-22)
- [x] Vehicles as meshes, same look; Windows gets its vehicles back
- [ ] Farm buildings as meshes
- [ ] Poles, fence, pivot, tower, billboard, bales as meshes
- [ ] Far plain: belts, trees, steads as meshes
- [ ] Each program compiles under 5 s on D3D11; frame time no worse

## Vehicles, 2026-11-22

Built: `tornado/vshape.js` (the shape tables), `tornado/vmesh.js` (meshes; tests/vmesh.test.mjs checks them against a JS port of vHit on 5000 rays per kind: at most 4 differ, on facet edges), `tornado/vdraw.js` (the renderer).
D3D11 compile (d3dcompiler_47, level 1): body 0.1 s, road shadow 0.4 s, shadow map trivial. The GLSL car passes keep the spray and trail: 14.9 s.
App pane, D3D11, cold: first frame at 26 s, no freeze; the vehicles draw. The vehicles cost about 1.5 ms a frame.
Frame time, headless ANGLE GL, same GPU and scene: main 103 ms, this branch 57 ms.
Look: as the ray tracer, side by side. Changed by design: the depth buffer sorts the vehicles (the wagon's bumper now covers the van behind it); thin masts read fainter (multisampling in place of the widened rods).
