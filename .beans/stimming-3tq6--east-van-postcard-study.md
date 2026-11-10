---
# stimming-3tq6
title: East Van postcard study
status: completed
type: spike
priority: normal
created_at: 2026-11-10T10:23:33Z
updated_at: 2026-11-10T10:40:40Z
parent: stimming-guw5
---

Question: does a still postcard carry East Van, and which framing?

One house lot from the street, three postcards, in eastvan/postcard/index.html (noindex, unlinked). Keys 1 to 3 switch.

- [x] Lot: house, porch, yard, boulevard tree, pole and wires, crow, bins
- [x] Postcard 1: across the street, rain, blue hour
- [x] Postcard 2: down the sidewalk, low sun
- [x] Postcard 3: on the wire, fog, dawn
- [x] Slow loops; no work when hidden; reduced motion holds one frame
- [x] Check in the browser pane at 1280 and 375 x 812; clean console
- [x] Stills of each framing to Tom
- [x] Commit and push

## Summary of Changes

eastvan/postcard/index.html: one block-out lot in three.js 0.170.0, three postcards on keys 1 to 3.

| Key | Framing | Hour and weather | Loop |
|---|---|---|---|
| 1 | Across the street, shift lens | 4:52 pm, rain | Rain, rings on a mirror road, TV flicker, crow commute |
| 2 | Down the sidewalk, into the sun | 3:38 pm, clear | Falling leaves, long shadows, a crow that pecks |
| 3 | On the wire, beside the crow | 7:14 am, fog | Wire sway, a caw, chimney smoke |

- Tom saw the stills in the pane: "they are looking very very good".
- Carry forward: postcard 1. The wet road doubles every light, and the frame holds the whole lot at 1280 and at 375.
- Cost at 1280 x 800: 7 to 10 ms a frame on Standard. On High, a slow-frame step falls back to Standard.
- Not checked: reduced motion (the pane cannot emulate it), real phones.
- No downloads. All geometry is primitives; all textures are canvas.
