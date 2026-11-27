---
# stimming-pmsi
title: 'East Van: the Drive at East 4th'
status: completed
type: task
created_at: 2026-11-10T11:09:49Z
updated_at: 2026-11-10T11:09:49Z
parent: stimming-guw5
---

Tom: start the Drive. The real block at Commercial Drive and East 4th Avenue, from city data, as a third zone file.

- [x] Find the datasets and their licences (City of Vancouver open data, OpenStreetMap)
- [x] List the downloads; Tom says yes
- [x] eastvan/bake/: fetch and bake the block to eastvan/data/drive.json; eastvan/CREDITS.md
- [x] eastvan/drive.js: shopfronts from the footprints, sidewalk, street trees, trolley wires, the roadway
- [x] Pokes and life on the Drive; camera stop 3
- [x] Check in the browser; stills to Tom

## Notes

- Tom, 2026-11-10: the Drive is its own diorama on its own plinth. `buildTown(sky, zones, life)` now takes its zones.
- Intersection (street-intersections): two points, the avenue jogs: -123.069669, 49.267094 and -123.069673, 49.266885.
- Datasets, all Open Government Licence - Vancouver, within 170 m of the corner:
  - `building-footprints-2009`: 162 footprints with `hgt_agl`, `rooftype`, `med_slope`.
  - `property-parcel-polygons`: 177 lots.
  - `public-trees`: 132 trees with species, height, diameter.
  - `street-lighting-poles`: count not read yet.
  - `storefronts-inventory`: 521 rows over several years; category and civic number. Business names are left out.
- `eastvan/bake/drive.py` is written and not run. It waits for Tom's yes on the downloads.

## Summary of Changes

- Tom said yes to the downloads. Five extracts, 318 KB, in `eastvan/bake/raw/`; baked to `eastvan/data/drive.json` (65 KB).
- `eastvan/CREDITS.md` lists them. The licence page was read: Open Government Licence - Vancouver 1.0. The page shows the credit line on the Drive.
- `eastvan/drive.js` builds the Drive as its own diorama: the west side of Commercial Drive from East 4th north for 70 m.
  - Real: building outlines and heights, the frontage split, the trade of each shop unit, tree positions, sizes and kinds, lamp pole positions.
  - Invented: shopfront detail, neon icons in place of names, the bus, cars, road paint, trolley wires, the kerb line (snapped to 8 m from the centre).
- Pokes: five shops (glass and sign), three sets of upper windows, the street lamps, the trolley bus (it drives off and comes back), the fruit stand.
- `eastvan/town.js`: outlines (`poly`), slabs, standing rings, long wires, a `run` act, a sun sized by each diorama.
- The page holds two dioramas. Drive is stop 3 (key 3, `?at=drive`); it loads on the first visit.
- Measured in the pane (1380 x 1968): 50 draw calls, 28.5k triangles, about 75 frames each second.
- Not done: people, crows, sound, shop interiors, the east side of the street.

## Rebuilt as a disc (Tom, 2026-11-10)

Tom: "it's this: the radius around Commercial and E 4th Ave". The first build showed only the west side as a strip.

- `eastvan/drive.js` now cuts a disc of 58 m radius round the corner. `R` sets the radius.
- Real: every lot (as a low slab; the bare ground is street and lane), every building outline and height on both sides, gable roofs on the pitched houses, shop units and trades on both sides, trees, lamp poles.
- Buildings stop at their lot line: the 2009 outlines take in awnings.
- One switch per shop (glass and sign); the sign is brighter through a vertex boost.
- The view runs up the Drive from the south, from high up.
- Measured in the pane (1380 x 1968): 84 draw calls, 73k triangles, about 55 frames each second.
