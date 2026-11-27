---
# stimming-kxtx
title: 'Train ride: building PBR, bump and wet'
status: completed
type: task
priority: normal
created_at: 2026-11-16T23:23:06Z
updated_at: 2026-11-17T00:09:37Z
parent: stimming-6z3j
---

Tom (2026-11-16): PBR and procedural bump on the buildings; rain wets them.

- [x] propLitPBR for buildings only
- [x] Bump per surface: tile, slate, copper, plaster, timber, concrete
- [x] Roughness and f0 per material; window glint
- [x] Wet: darken, sheen on roofs, streaks under sills and eaves
- [x] Bench before and after; QA Zurich, village, farmland

## Summary of Changes

- PBRL joins every prop shader; buildings light through propLitPBR: GGX sun and moon, the sky mirrored by roughness (damped on rough faces), town-pool glints on wet or glossy faces.
- Bump and material per surface: clay tile, slate, copper seams, gravel tops, timber boards, concrete joints, plaster; glass panes, painted shutters. bumpFade hides it before it can shimmer.
- Dry dirt runs under sills and a damp band under the eaves.
- uWet: roofs wet whole, walls in streaks; porous faces darken; roughness drops; the bump flattens.
- QA param ?fov= narrows the outside view.
