---
# stimming-faow
title: 'Toy: Crinkle foil'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-08T10:28:16Z
updated_at: 2026-11-08T10:34:57Z
---

Build Crinkle foil (idea 107): drag to scrunch a sheet of foil, then smooth it flat again; the wrinkles catch moving specular light. Folder `foil`. It starts in the Lab. Raw WebGL2. It follows the Look rule: one sheet, no props.

- [x] Blockout: a still of a half-scrunched sheet under one strip light
- [ ] Checkpoint 1: Tom signs off the blockout
- [ ] Sheet: height field in a float texture, faceted creases, edge pull-in
- [ ] Gesture: drag scrunches toward the pointer; smoothing flattens it
- [ ] Light: the strip light sweeps; the facets flash in turn
- [ ] Bar: foil chips, one slider, Smooth, Shuffle, Settings
- [ ] Frame loop: 30 fps or better, idle sleep, hidden stop, reduced motion
- [ ] Sound: crinkle bursts that follow drag speed (Tom to confirm)
- [ ] toys.json entry and menu Lab entry with an icon and a GSAP hook
- [ ] QA: 1280 and 375 px, clean console, idle stop, hidden tab stops the loop
- [ ] Record the session cost
