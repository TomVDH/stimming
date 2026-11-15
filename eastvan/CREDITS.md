# East Van: credits

Every asset that is not written for this toy has a row here.

## City data: the Drive

Contains information licensed under the [Open Government Licence – Vancouver](https://opendata.vancouver.ca/pages/licence/) (version 1.0).

All five extracts cover 170 m around Commercial Drive and East 4th Avenue.
`eastvan/bake/drive.py` fetches them and bakes `eastvan/data/drive.json`, the file the page loads.

| File | Source | Author | Licence | Fetched |
|---|---|---|---|---|
| `bake/raw/footprints.geojson` | <https://opendata.vancouver.ca/explore/dataset/building-footprints-2009/> | City of Vancouver | Open Government Licence – Vancouver 1.0 | 2026-11-10 |
| `bake/raw/parcels.geojson` | <https://opendata.vancouver.ca/explore/dataset/property-parcel-polygons/> | City of Vancouver | Open Government Licence – Vancouver 1.0 | 2026-11-10 |
| `bake/raw/trees.geojson` | <https://opendata.vancouver.ca/explore/dataset/public-trees/> | City of Vancouver | Open Government Licence – Vancouver 1.0 | 2026-11-10 |
| `bake/raw/poles.geojson` | <https://opendata.vancouver.ca/explore/dataset/street-lighting-poles/> | City of Vancouver | Open Government Licence – Vancouver 1.0 | 2026-11-10 |
| `bake/raw/stores.geojson` | <https://opendata.vancouver.ca/explore/dataset/storefronts-inventory/> | City of Vancouver | Open Government Licence – Vancouver 1.0 | 2026-11-10 |

| `bake/raw/lidar/494000_5457000.zip` (not in git; 1 GB) | <https://opendata.vancouver.ca/explore/dataset/lidar-2022/> | City of Vancouver | Open Government Licence – Vancouver 1.0 | 2026-11-14 |

| `bake/raw/heritage.geojson` | <https://opendata.vancouver.ca/explore/dataset/heritage-sites/> | City of Vancouver | Open Government Licence – Vancouver 1.0 | 2026-11-14 |
| `bake/raw/tax.json` (build years) | <https://opendata.vancouver.ca/explore/dataset/property-tax-report/> | City of Vancouver | Open Government Licence – Vancouver 1.0 | 2026-11-14 |
| `bake/raw/osm.json` (building floors, roofs, start dates, names; named places) | <https://www.openstreetmap.org/copyright> via the Overpass API | OpenStreetMap contributors | ODbL 1.0 | 2026-11-14 |

`bake/raw/stores.geojson` now carries `business_name` (refetched 2026-11-14).

`eastvan/bake/lidar.py` bakes the LiDAR tile to `eastvan/data/lidar.json`: roof heights per building on a half-metre grid, and the height and spread of each street tree.

Notes:
- Shop signs show the business names on record (Tom, 2026-11-14), as plain text, with no logos. The names belong to their businesses.
- The building outlines and heights date from 2009.
- The toy is not endorsed by the City of Vancouver.

## Textures: the realistic postcard

`eastvan/postcard/real/` uses five texture sets from [Poly Haven](https://polyhaven.com/), all CC0 1.0. Each set is three 1k JPG files in `eastvan/postcard/real/assets/`: colour (`_diff`), normal (`_nor_gl`) and AO, roughness, metal (`_arm`). Tom approved the list on 2026-11-14.

| Files | Source | Author | Licence | Size | Fetched |
|---|---|---|---|---|---|
| `asphalt_02_*_1k.jpg` | <https://polyhaven.com/a/asphalt_02> | Rob Tuytel | CC0 1.0 | 2.3 MB | 2026-11-14 |
| `white_planks_clean_*_1k.jpg` | <https://polyhaven.com/a/white_planks_clean> | Rob Tuytel | CC0 1.0 | 1.4 MB | 2026-11-14 |
| `concrete_floor_02_*_1k.jpg` | <https://polyhaven.com/a/concrete_floor_02> | Rob Tuytel | CC0 1.0 | 1.1 MB | 2026-11-14 |
| `bark_brown_02_*_1k.jpg` | <https://polyhaven.com/a/bark_brown_02> | Rob Tuytel | CC0 1.0 | 1.9 MB | 2026-11-14 |
| `leafy_grass_*_1k.jpg` | <https://polyhaven.com/a/leafy_grass> | Charlotte Baglioni | CC0 1.0 | 3.7 MB | 2026-11-14 |

