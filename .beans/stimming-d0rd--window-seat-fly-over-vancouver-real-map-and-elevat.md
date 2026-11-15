---
# stimming-d0rd
title: 'Window seat: fly over Vancouver (real map and elevation, ocean shader sea)'
status: in-progress
type: feature
created_at: 2026-11-15T10:27:43Z
updated_at: 2026-11-15T10:27:43Z
---

Tom, 2026-11-15: "can we have it fly over vancouver -- get map and altimetry data for the lower mainland (ft ocean shader too)".

A map-driven world for the outside pass, behind the test hook `?van`. Real elevation and land cover for the Lower Mainland; the sea uses the classic ocean shader.

## Checklist
- [ ] Pick open data; tell Tom source, licence, files and sizes
- [ ] Bake script and the shipped map asset
- [ ] Shader: map elevation, coast, cover and relief behind ?van
- [ ] Sea level water uses the ocean shader
- [ ] City lights and airports sit on the real places
- [ ] Flight track chosen and explained
- [ ] Classic (legacy.html) still renders
- [ ] QA: clean console, 30 fps at 1280 and 375, Noon and Dusk screenshots
- [ ] PR open; ask Tom: Settings option or default
