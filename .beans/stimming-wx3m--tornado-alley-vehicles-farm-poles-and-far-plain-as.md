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
- [ ] Vehicles as meshes, same look; Windows gets its vehicles back
- [ ] Farm buildings as meshes
- [ ] Poles, fence, pivot, tower, billboard, bales as meshes
- [ ] Far plain: belts, trees, steads as meshes
- [ ] Each program compiles under 5 s on D3D11; frame time no worse
