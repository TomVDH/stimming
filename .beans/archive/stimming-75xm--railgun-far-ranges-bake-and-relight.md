---
# stimming-75xm
title: 'Railgun: far ranges, bake and relight'
status: completed
type: task
priority: normal
created_at: 2026-11-16T19:23:54Z
updated_at: 2026-11-16T21:52:40Z
---

Tom: will the mountains benefit from cards or a baked landscape instead of the raymarch? Elegant, smart performance savings. Earlier: redo the ranges a little; they are too smooth.

- [x] Measure the far pass now (Standard, High; 1280x720, 375x812)
- [x] Prototype bake and relight behind a Dev switch
- [x] Compare with cards and a baked mesh; recommend (docs/plans/railgun-far-bake.md)
- [x] Stills before and after: dawn, day, dusk, night
- [x] Tom signs off the numbers and the look (2026-11-16)
- [x] Richer shapes: ridged erosion in the height

- [x] More varied forms: mesa line, lone cone, knife ridge (Dev row Forms)

## Summary of Changes

- The far ranges bake: one march fills a buffer a little wider than the view; each frame only lights it. Default since Tom's pick; Live stays on the Dev row Far ranges and ?far=live.
- Erosion carves gullies and crags into the height; a baked cavity term darkens the cuts.
- New forms (mesa, cone, knife), later reshaped by the landscape session in railgun/ranges.js.
- A height grid lets the march leap empty air: about twice as fast on the vast ranges.
- No bake stalls a frame: a quarter-size bake shows at once, the full one fills over 8 passes.
- Range lab (railgun/rangelab.html): the config tool for the ranges (with stimming-l7oo).
- Numbers and decisions: docs/plans/railgun-far-bake.md.
