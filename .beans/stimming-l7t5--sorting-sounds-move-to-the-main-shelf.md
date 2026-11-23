---
# stimming-l7t5
title: 'Sorting sounds: move to the main shelf'
status: completed
type: chore
created_at: 2026-11-23T20:11:37Z
updated_at: 2026-11-23T20:11:37Z
parent: stimming-98c1
---

Tom, 2026-11-23: "lets make sorting sounds main too -- promote". Series: Maths class (the orchestrator pick; Tom may change it).

- [x] toys.json: number 74, series maths, stage alpha, version 1.5, sub null
- [x] Menu: the tile moves from the Lab to the main shelf, after Contour map
- [x] A still in shared/stills/
- [x] The intro drops "Stimming Lab"
- [x] Toy doc and plan say main shelf
- [x] Check ?all, the Clock, the Lab and the console

## Summary of Changes

- toys.json: `sorting` moves after `contour` with number 74, series maths, stage alpha, version 1.5, sub null.
- index.html: the tile moves from the Lab list to the main shelf, after Contour map; its hook stays.
- `shared/stills/sorting.webp`: 512 px, a square crop of the stage 0.4 s after the intro, with the bar hidden: Quick mid-sort, its wake warm. 12 KB at quality 90 (the stills rule for a dark still). Made with Playwright and Pillow: cwebp is not on this PC.
- The toy page's intro drops "Stimming Lab".
- Check, headless: `./?all` shows it in Maths class before Harmonograph and Dijkstra; it is in the Clock's pool (`main > .shelf`); `./?lab` does not list it; no console errors.
- The tile has no "(Alpha)" mark, as with Contour map's move. Tom decides if main-shelf alpha tiles get one.
