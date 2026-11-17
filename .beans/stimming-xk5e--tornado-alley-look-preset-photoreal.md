---
# stimming-xk5e
title: 'Tornado alley: Look preset, Photoreal'
status: in-progress
type: task
priority: normal
created_at: 2026-11-17T08:40:45Z
updated_at: 2026-11-17T08:55:45Z
parent: stimming-dwwg
---

Tom: photoreal ACES, lighting and post FX preset. Dev row Look: Stimming (default) or Photoreal.

- [x] Look row and preset values; ?look= for one load
- [x] Camera step at the end of the scene pass: white balance, saturation, contrast
- [x] A/B stills at golden hour and dusk in docs/qa/tornado-look/
- [ ] Tom's look; then the default and the merge

## Materials (Tom: photoreal anisotropy, PBR, colours)

One visual change at a time:
- [x] 1. Near wheat: anisotropic straw sheen, light through backlit heads (superseded by main's wheat.js rewrite; uPbr removed at the merge)
- [ ] 2. Road: wet-look asphalt micro-roughness, painted-line retroreflection (road.js)
- [ ] 3. Colours: real-world albedos for wheat, verge, road and soil under Photoreal
- [ ] 4. Wires: brushed-aluminium anisotropy (line.js; power-line session owns it)

## Tom's fixes (verge, road, stalks)
- [x] Dark strip between berm and grass: the verge's normal used the ditch's height; now a swale's slope
- [x] Road tiling: rdW drifts through the noise volume's depth; long stains with the traffic
- [x] Soft stalks: a 3 mm aperture blur on every stalk edge
