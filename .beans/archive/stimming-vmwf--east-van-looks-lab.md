---
# stimming-vmwf
title: East Van looks lab
status: completed
type: spike
created_at: 2026-11-10T10:15:19Z
updated_at: 2026-11-10T10:15:19Z
parent: stimming-guw5
---

Question: which look and layout carry East Van under the poke-everything verb?

One house lot, three looks, in eastvan/looks.html (noindex, unlinked).

- [x] Spec: docs/plans/eastvan.md
- [x] eastvan/lot.js: the lot as plain data
- [x] Look A: Paper theatre (depth layers, parallax)
- [x] Look B: Toy-town low-poly (true 3D, orbit)
- [x] Look C: Print poster (ink post pass, on A or B)
- [x] Three pokes in every look: porch light, crow, bin lid
- [x] Readout: fps and draw calls
- [x] Checkpoint with Tom: stills at 1280 and 375; Tom picks look and layout

## Summary of Changes

- `eastvan/lot.js` holds one house lot as plain data.
- `eastvan/looks.html` draws it three ways: Paper theatre, Toy-town, Print poster (on layers or on 3D).
- Pokes: porch lamp, crow, two bin lids. Readout: fps, draw calls, triangles.
- Answer (Tom, 2026-11-10): Toy-town, true 3D. "Full force"; the other looks wait.
- Toy-town at blockout level: about 104 draw calls, 10k triangles.
