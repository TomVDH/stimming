---
# stimming-5j9s
title: 'Spike: Swiss open data for the Train Ride landscape'
status: completed
type: spike
priority: normal
created_at: 2026-11-10T07:59:37Z
updated_at: 2026-11-10T08:01:54Z
parent: stimming-6z3j
---

Question: which Swiss open data sets can replace or add to the Terrarium heights and OSM layers, and which one feeds the fields bake?

## Checklist
- [x] Fields: cantonal Nutzungsflächen (ZH, SZ, GL, SG): access and licence per canton
- [x] Land cover: swissTLM3D Bodenbedeckung (woods, vineyards, orchards): access, format
- [x] Near heights: swissALTI3D 2 m over the corridor: access (tile count left to the bake)
- [x] Trees: swissSURFACE3D Raster minus swissALTI3D for canopy height
- [x] Buildings: swissBUILDINGS3D 3.0 against the OSM heights (access only)
- [x] Write a recommendation and the bake plan

## Findings (2026-11-10)

Licence: swisstopo and BLW data are open use with a source credit ("© swisstopo", "Source: BLW"). The about page or annex must name them.

| Layer | Data set | Access | Verdict |
|---|---|---|---|
| Fields | BLW Landwirtschaftliche Nutzungsflächen (`lwb_nutzungsflaechen`) | Open WFS at geodienste.ch, no sign-up, GeoJSON in LV95 (EPSG 2056) | Use. Tested in ZH, SZ, GL and SG: 140 to 420 parcels per 4 km². Each parcel has `lnf_code` and `nutzung` (meadow, pasture, crop, orchard trees, vines, berries, greenhouse). |
| Land cover | swissTLM3D (2026-02) | STAC; one national GeoPackage, 2.9 GB | Use for woods, scrub, vineyards and rock where no parcel exists. Clip once with ogr2ogr; do not commit the source. |
| Near heights | swissALTI3D, 2 m | STAC, 1 km GeoTIFF tiles | Use for the strip beside the line. Terrarium stays for the far land. |
| Trees | swissSURFACE3D Raster minus swissALTI3D | STAC, 1 km tiles | Optional. It gives canopy height for tree placement. |
| Buildings | swissBUILDINGS3D 3.0 (beta) | STAC, 1 km tiles | Optional. Real roof shapes and heights; OSM footprints stay. |

Notes:
- The geodienste.ch download page asks for a form. The WFS does not; use the WFS.
- The parcel layer also holds point orchards and single trees; they can place real fruit trees.
- api3.geo.admin.ch identify returns the same parcels, but caps the count; the WFS is better.

## Recommendation

Train Ride now bakes invented field clusters (Voronoi, parent bean Round 23). Real parcels can replace them. A `tools/fields.py` pulls the WFS in 2 km tiles along `corridor.py`'s polygons, adds swissTLM3D land cover, maps each to route s and t, and writes `fields.png`: a class id per texel at the `roads.png` grid. The shader picks a tiling per class.
