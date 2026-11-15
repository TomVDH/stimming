---
# stimming-tgis
title: 'Railgun: true scale spike (planet, far country, air)'
status: in-progress
type: task
created_at: 2026-11-15T09:38:27Z
updated_at: 2026-11-15T09:38:27Z
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
- [ ] 375 x 812 stills; phone frame cost
- [ ] Tom's verdict: keep, tune or drop
