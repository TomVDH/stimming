---
# stimming-q8eu
title: 'Fidget board: back to the first five-control board'
status: completed
type: task
priority: normal
created_at: 2026-11-03T20:15:55Z
updated_at: 2026-11-03T20:18:29Z
parent: stimming-marx
---

Tom finds the ten-slot bento not graceful, with too many elements. The board returns to the first build's set and layout (2fad3f6): the big dial on the left; toggles and the stick, four keys and the slider on the right. No panels. The die and the bento layouts leave the page. kit.js, parts/ and the registry stay for later expansion.

- [x] Rebuild the page on five fixed cells: dial, tog, joy, keys, fader
- [x] Drop Roll, the bento layouts, the deal store and the launch wiring from the page
- [x] Keep kit.js, parts/ and parts/index.js untouched
- [x] QA: clean console, interactions, 1280px and 375px shots
- [x] Commit and push

## Summary of Changes

`fidget/index.html` mounts five fixed parts from the registry: dial, tog, joy, keys, fader. Wide stages put the dial left and the cluster right. Narrow stages stack the dial over the cluster. The cells have no panels. The die, the bento layouts, the deal and layout stores and the launch wiring leave the page. `kit.js`, `parts/` and `parts/index.js` stay as they are. To grow the board, add an id to `BOARD` and give its cell a grid area. QA: console clean at 1280px and 375px; toggles, latch key, slider, dial, stick light, Shuffle and Reset all respond.
