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
- [x] Pick open data; tell Tom source, licence, files and sizes
- [x] Bake script and the shipped map asset
- [x] Shader: map elevation, coast, cover and relief behind ?van
- [x] Sea level water uses the ocean shader
- [x] City lights and airports sit on the real places
- [x] Flight track chosen and explained
- [x] Classic (legacy.html) still renders
- [x] QA: clean console, 30 fps at 1280 and 375, Noon and Dusk screenshots
- [ ] PR open; ask Tom: Settings option or default

## Notes (2026-11-15)

- Data: Terrarium elevation tiles, zoom 10 (Mapzen on AWS Open Data; NRCan CDEM), and ESA WorldCover 2021 v200 (CC BY 4.0), its 40 m overview by HTTP range. About 8 MB fetched; nothing but the baked map ships.
- Shipped map: `window/van-coast.png` (2048 x 1100, sea and fresh water, 162 KB) and `window/van-land.png` (three grey tiles of 1024 x 550: height, built-up, forest, 479 KB).
- The map is its own build of the outside pass (`#define VAN`). The usual pass compiles in about 31 s cold, as before; the Vancouver build takes about the same.
- Track: east at 49.13 N. The wing hides the ground ahead, so the clear view is aft and 15 to 40 km out; the city, Burrard Inlet and the North Shore pass 17 to 35 km to the north.
- Start (Tom: "make the flight start with the sound in view and the mountains north of van"): south of the city at 123.08 W, so Howe Sound and the North Shore stand aft of the wing.
- Noon over Vancouver puts the sun behind the plane (`vanAz`), so it lights the mountains' south faces. The other hours keep their sun.
- A mirrored (right-hand) seat flies west, so the map reads true.
- Open for Tom: a Settings option or the default; real turning in a bank; a silt tint for the Fraser; bridges and Highway 1.
