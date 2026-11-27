---
# stimming-k7f5
title: 'Train Ride: real woods from the national forest rasters'
status: completed
type: task
priority: normal
created_at: 2026-11-15T05:26:08Z
updated_at: 2026-11-15T05:30:30Z
parent: stimming-6z3j
---

Replace the invented woods (fbm on slopes) with the real ones. Source: BAFU NFI forest mix rate (10 m, broadleaf share per stand) and NFI vegetation height model Sentinel 2025 (10 m), both on the swisstopo STAC as cloud-optimised GeoTIFFs. swissTLM3D (2.9 GB) is not needed.

## Checklist
- [x] tools/woods.py bakes woods.png on the route grid at 8192 columns: cover, conifer share, canopy height
- [x] Land paint uses the real cover and the conifer share for colour
- [x] Tree placement uses the real cover; spruce or broadleaf by the conifer share; size by canopy height
- [x] Source credit in the annex
- [x] Browser pane check, clean console (live run in the pane; no A/B still: the pane closed)
- [x] Commit and push

## Summary of Changes

- tools/woods.py reads the BAFU NFI forest mix rate (10 m, broadleaf share per stand; empty where no trees) and the NFI vegetation height model (Sentinel 2025, 10 m) over the drawn land by HTTP range, and bakes woods.png (8192 x 256, 1.09 MB) on the route map rows out to 18.4 km: cover in 16 steps, conifer share in 8, canopy height in 4 m steps. Share and height spread outward from each stand, so filtered edges keep their own values.
- Cover over the drawn land: 24 %; conifer share in the woods: 47 %; median canopy 27 m.
- woodsAt() in LAND drives the land paint (cover with a frayed edge, beech to spruce colour by share) and forestAt() for every prop pass; trees take spruce or broadleaf by the share and scale by canopy height (0.6 to 1.4). The invented woods stay only when the map is missing. ?nowoods compares.
- The track rebuilt from OSM (track.py) matches route.json to 0.1 m.

## Open
- Tom to compare with ?nowoods live; a still A/B was not taken.
