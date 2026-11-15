---
# stimming-z0t5
title: 'East Van: real roofs and trees at the Corner from LiDAR'
status: in-progress
type: task
priority: normal
created_at: 2026-11-15T05:45:47Z
updated_at: 2026-11-15T05:52:48Z
parent: stimming-guw5
---

Tom, 2026-11-14: the corner looks good; get real or approximated geometry. Tom said yes to LiDAR + Mapillary.

- [x] LiDAR 2022 tile 494000_5457000 (City of Vancouver, Open Government Licence - Vancouver): Cloudflare blocks scripted download; Tom downloaded it by hand
- [x] eastvan/bake/lidar.py: roof height grids per building, canopy per tree, ground level
- [x] Draw real roofs and canopies on the Corner (and the Drive module)
- [ ] Mapillary reference for facades: the coverage layer does not draw in the pane; the API needs an account token
- [x] Credits: CREDITS.md rows

## Notes

- Bake: 50.8 M points in 25 s, plain Python; 24 roof grids, 25 canopies; the footprints shift (-0.5, 1.0) m to meet the scan.
- Render: walls on the true outline to the eave; a smoothed roof grid (median of 3 x 3, 20 cm steps) above. Corner: about 70 to 90 calls, 171k triangles.
- Open: roofs still read lumpy and dark; facades are still invented; Mapillary reference not gathered.
