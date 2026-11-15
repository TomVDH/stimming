---
# stimming-ouak
title: 'Train Ride: aerial photo projected softly on the land'
status: in-progress
type: spike
created_at: 2026-11-15T08:46:17Z
updated_at: 2026-11-15T08:46:17Z
parent: stimming-6z3j
---

Tom asked (2026-11-15): can satellite imagery project softly on the landscape?

## Checklist
- [x] Rebuild dem/track.json from OSM (tools/fetch.sh rail query, track.py); route metres differ from todays OSM by 300 to 600 m, so the strip anchors on the stations
- [x] Fetch a 3 km SWISSIMAGE test strip at Lake Zurich (route 22.5 to 25.5 km, out to 4.6 km), 2 m, by WMS; resample onto the route rows
- [x] Blend it in the land bake (landMat), eased at the strip edges; dev hook S.sat(img, k, gain)
- [x] Stills: afternoon off, 60 %, 100 %; evening off, 100 % (trainride/dev/fx-sat.png)
- [x] Tom picks: palette-mapped (2026-11-15)
- [x] Palette map in the bake: grey (roofs, roads) to town ground, red-brown to roof tile in towns and bare earth in fields, dark to wood, the rest to the toy's meadow with the photo's light and dark patches; mapped woods keep their colour
- [x] Fixed: the first stills sampled the lake (three.js flipped the image) and skipped the sRGB decode; trainride/dev/fx-sat-map.png is the right one
- [x] Tom picks the next step: the whole route (2026-11-15)
- [x] tools/sat.py over the whole route: sat-near.webp (5 m columns, 4 m rows, to 1.2 km, 842 KB) and sat-far.webp (10 m, to 7 km, 1027 KB); 2 x 2 photo samples a texel; WMS images cached in dem/sat/
- [x] The page loads both (?noaerial leaves them out); a GPU with small textures halves them; dev S.aerial(k) sets the strength
- [x] The photo skips water, the line's own bank, steep faces, rock and snow; grey counts only in towns or on flat ground, and from 40 m out; the dark class is gone (the mapped woods cover trees)
- [x] Credit: SWISSIMAGE © swisstopo in annex.json
- [x] QA: 1280, 375 x 812, 812 x 375; clean console; first frame about 0.2 s later warm; frame time unchanged (the photo lives in the bake)
- [ ] Tom checks
