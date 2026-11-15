---
# stimming-jp71
title: 'East Van: the alley'
status: completed
type: task
created_at: 2026-11-10T10:59:29Z
updated_at: 2026-11-10T10:59:29Z
parent: stimming-guw5
---

Tom: start the alley. The plinth grows back from the house: backyard, garage, lane.

- [x] Zone files: town.js reads lot.js and alley.js (parts, wires, pokes, moves, acts, lamps)
- [x] Backyard: back door and stoop, kitchen window, raised beds, trampoline, cedar fences, back gate
- [x] Garage: roll-up door with a band room behind it, mural, hoop, sensor light
- [x] Lane: pole, wires, lamp, bins with a raccoon, puddles, a free couch and a TV, the far fence
- [x] Camera stops: House and Alley (keys 1 and 2); free turn
- [x] Check in the browser; stills to Tom

## Summary of Changes

- `eastvan/alley.js`: the alley zone as data. `eastvan/town.js` now reads zone files: PARTS, WIRES, POKES, MOVES, ACTS, LAMPS.
- `eastvan/lot.js` holds its own moves, acts and lamps; the plinth runs from the far side of the lane to the road.
- Backyard: back door and stoop, kitchen window, two raised beds, a trampoline with a ball, cedar fences, a back gate.
- Garage: a roll-up door over a lit band room, a mural, a hoop, a sensor light.
- Lane: pole, wires, a lamp, two bins (a raccoon in the green one), puddles, a free couch and a TV, brambles.
- 13 new pokes (34 in all). A basketball in the lane flies to the hoop (`eastvan/life.js`).
- Camera stops House and Alley on keys 1 and 2; the turn is free; `?at=alley` opens on the alley.
- Measured in the pane on High (2048 x 1536): 118 draw calls, 43.9k triangles, about 56 frames each second.
- Seen in stills: garage door, back gate, sensor light, lane lamp, bin lid, ball. Raccoon, puddle ring, TV, greens and trampoline ball: the target resolves; too small in the still to judge.
