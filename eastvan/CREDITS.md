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

Notes:
- The storefront extract leaves out business names. The toy shows no real shop name.
- The building outlines and heights date from 2009.
- The toy is not endorsed by the City of Vancouver.
