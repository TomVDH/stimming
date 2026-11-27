---
# stimming-ejct
title: 'Menu: smart instancing, loading, and lockstep 30 fps for Signal Dial'
status: completed
type: task
priority: normal
created_at: 2026-11-27T06:03:24Z
updated_at: 2026-11-27T06:08:37Z
---

Improve Signal Dial menu performance with smart tile instancing, lazy loading, GPU/media optimization, and a unified 30 fps frame scheduler (Tom, 2026-11-26).

- [x] Unify all menu WebGL loops (CRT, top mesh, footer mesh, Lab CRT) under one 30 fps scheduler with strict pause-on-sheet, pause-on-hidden, and 60 s idle sleep
- [x] Optimize WebGL rendering: crop CRT canvas and FBOs to the dial circle, remove per-frame video generateMipmap, drop footer mesh back to 0.4 scale and top mesh to 0.25 scale, cap Lab CRT DPR to 1.0
- [x] Implement smart tile instancing: hold unmounted tiles off-DOM in a detached pool (no .sm-bin), virtualize All Toys and Lab sheet grids with IntersectionObserver, lazily upgrade harmono/marble icons on first mount, and stop hidden-Dial hover work during All Toys
- [x] Implement smart media loading: LRU still cache with idle prefetch for the 12-toy hand, single recycled video element with 180 ms dwell gate and currentTime change check, cached fitTitle and dial geometry
- [x] Eliminate boot layout thrashing in index.html (batch fitAll reads/writes, skip fallback reveal/shuffle in dial views) and gate standby backdrop-filter / off-sheet CSS animations at 30 fps
- [x] Verify syntax, tsc type check on dial.js, and zero console/runtime issues

## Summary of Changes

Unified all Signal Dial WebGL render loops (CRT, top mesh, footer mesh, Lab CRT) under one 30 fps scheduler with strict pause-on-sheet/hidden and 60 s idle sleep; cropped the CRT canvas and FBOs to the dial circle, dropped redundant per-frame `generateMipmap` on video textures, restored footer mesh 0.4 scale and 0.25 top mesh scale; replaced `.sm-bin` with an off-DOM tile pool and IntersectionObserver sheet virtualization with lazy icon preparation; added LRU still cache with idle hand prefetch, single recycled video element with 180 ms dwell gate, cached `fitTitle` and dial geometry, batched `fitAll` in `index.html`, and removed hidden-Dial hover work during All Toys.
