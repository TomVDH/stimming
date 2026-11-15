---
# stimming-ayfd
title: 'Window seat: PBR wing skin (seams, fasteners, walkway, wear)'
status: completed
type: task
priority: normal
created_at: 2026-11-15T05:57:03Z
updated_at: 2026-11-15T07:09:23Z
---


Tom (2026-11-14): PBR wing too.
The wing is already a MeshPhysicalMaterial, but its skin is one flat grey.
This pass gives the skin baked PBR maps: albedo, roughness and normal.

- [x] Bake the maps off the main thread, in planform space (span by chord fraction)
- [x] Slat seams and cuts, spar and rib fastener rows, access panels
- [x] Walkway outline and non-slip pad near the root
- [x] Wear: leading-edge erosion, flow grime aft, per-panel tone
- [x] Subtle skin waviness between ribs, for the glancing glint
- [x] Wing, spoilers and flaps take the maps; winglet, nacelle and pods stay plain
- [x] QA: clean console, 30 fps or better, 1280 px and 375 px screenshots
- [x] Screenshots to Tom: Golden hour (with A/B), Noon, Midnight with the wing light, 375 px

## Notes

- `window/skin.js` bakes three 2048 x 1024 RGBA8 maps in a worker: about 0.35 to 0.45 s on the dev PC.
- UVs: u is the span from root to tip; v is the chord fraction. Only the wing box, tip, spoilers, shroud and flaps take the maps.
- three.js scales the tangent frame by the larger UV gradient, so the bake grows the span slope by span over chord.
- Normals store four times the slope for 8-bit precision; `normalScale` takes it back out. Albedo and roughness store scaled factors; the material divides them back out.
- `?skin=0` keeps the plain paint, for an A/B check.
- QA (headless shell, ANGLE D3D11, 2026-11-14): 52 to 60 fps in every case; no console errors.
- Cold start on Direct3D: the first frame takes about 35 s with or without the skin (shader compile, no cache). The skin adds about 2.7 s of compile there. This is a separate issue.

## Summary of Changes

- `window/skin.js` bakes the wing skin's albedo, roughness and normal maps in a worker.
- `window/wing3.js` gives the skin UVs (span by chord fraction) and two mapped materials, for the box and the flaps.
- `window/index.html` bakes the maps before the wing is built; `?skin=0` keeps the plain paint.
- Tom (2026-11-14): keep the wear subtle, as built.

