---
# stimming-pmsi
title: 'East Van: the Drive at East 4th'
status: in-progress
type: task
created_at: 2026-11-10T11:09:49Z
updated_at: 2026-11-10T11:09:49Z
parent: stimming-guw5
---

Tom: start the Drive. The real block at Commercial Drive and East 4th Avenue, from city data, as a third zone file.

- [x] Find the datasets and their licences (City of Vancouver open data, OpenStreetMap)
- [ ] List the downloads; Tom says yes
- [ ] eastvan/bake/: fetch and bake the block to eastvan/data/drive.json; eastvan/CREDITS.md
- [ ] eastvan/drive.js: shopfronts from the footprints, sidewalk, street trees, trolley wires, the roadway
- [ ] Pokes and life on the Drive; camera stop 3
- [ ] Check in the browser; stills to Tom

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
