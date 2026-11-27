---
# stimming-w7nl
title: 'Train Ride: real fields from BLW parcels'
status: completed
type: task
priority: normal
created_at: 2026-11-10T08:13:51Z
updated_at: 2026-11-10T08:26:03Z
parent: stimming-6z3j
---

Replace the invented field clusters beside the line with the real farm parcels (BLW Landwirtschaftliche Nutzungsflächen, geodienste.ch WFS). Spike: stimming-5j9s.

## Checklist
- [x] tools/fields.py fetches the parcels along the corridor and bakes fields.png (class, seed, heading, edge distance)
- [x] Land shader reads fields.png; invented clusters stay only past the map
- [x] Real vineyards replace the invented ones inside the map
- [x] Source credit in the annex (Source: BLW, geodienste.ch)
- [x] Browser pane check, clean console
- [x] Commit and push

## Summary of Changes

- tools/fields.py pulls 18,812 BLW parcels (ZH, SZ, GL, SG) from the geodienste.ch WFS along the line and bakes fields.png (8192 x 512, 0.97 MB): class and seed, edge distance, heading per parcel. The bake repeats bit for bit.
- 14 classes from the LNF codes: meadow, extensive meadow, pasture, litter meadow, maize, cereal, oilseed, vegetables, vines, orchard, berries, plastic, hedge.
- fieldMap() in LANDMAT paints them 110 m to 4 km out; near an edge the lookup steps inward, so outlines stay smooth. The invented clusters and vines stay only past 4 km. ?nofields compares.
- Meadows spread wider in tone (a third freshly mown), so the parcel quilt reads.
- fieldMap itself landed early in 1ee59c0 (another chat committed the whole file).
