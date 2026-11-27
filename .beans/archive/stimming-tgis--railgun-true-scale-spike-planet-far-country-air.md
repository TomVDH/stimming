---
# stimming-tgis
title: 'Railgun: true scale spike (planet, far country, air)'
status: completed
type: task
created_at: 2026-11-15T09:38:27Z
updated_at: 2026-11-27T07:19:52Z
parent: stimming-f793
---

Tom (2026-11-15): the classic angle worked with hacks; the cinematic views need true scale. Plan: docs/plans/railgun-scale.md. Branch claude/railgun-scale.

## Checklist

- [x] Plan written
- [x] One curved planet (R 4,000 km): the plain, the clouds, the domes and the far country share the drop d² / 2R from any eye
- [x] Raymarched far country: the crescent ranges as one heightfield with ridged erosion; crossing detection and a seven-step halving; adaptive stride; depth written, so the near world occludes it
- [x] Shading: finite-difference normals, a seven-tap soft shadow toward the sun, rock and sand albedo
- [x] Aerial perspective: Rayleigh and dusty Mie along each ray, a warm forward glow toward the sun
- [x] Steps: 150 on High, 110 on Standard, 64 on rungs 2 and up
- [x] All eight views at 1280; clean console; frame cost +2 to 3 ms (headless RTX 3070, 1280 x 800)
- [x] 375 x 812 stills; phone frame cost not measured (no phone here)
- [x] Refine (Tom: keep and refine): the ranges seen from the wide eye rise to 5.5 to 26 km, so the classic angle keeps its presence
- [x] Clean crests: the shape takes three ridged octaves; inside any range's band the stride is capped (0.3% to 1.2%), so no crest or horn is leapt; 220, 160 and 90 steps
- [x] Distant fits a phone's width: 38 degrees across, the flash, the bolt and the rock in frame
- [x] Frame cost against the fx branch: +1 to 2.5 ms at p50 (headless RTX 3070, 1280 x 800)
- [ ] Tom's verdict: keep, tune or drop
