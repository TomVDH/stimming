---
# stimming-faow
title: 'Toy: Crinkle foil'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-08T10:28:16Z
updated_at: 2026-11-08T11:32:37Z
---

Build Crinkle foil (idea 107): drag to scrunch a sheet of foil, then smooth it flat again; the wrinkles catch moving specular light. Folder `foil`. It starts in the Lab. Raw WebGL2. It follows the Look rule: one sheet, no props.

- [x] Blockout: a still of a half-scrunched sheet under one strip light
- [x] Checkpoint 1: Tom signs off the blockout
- [x] Sheet: slope field in a float texture, fine crinkles, edge pull-in
- [x] Gesture: drag scrunches across the pull; tap pinches; Smooth presses flat with a soft sweep
- [x] Light: the strip light and soft box drift; they stop after 60 s idle
- [x] Bar: Silver, Gold, Holo, Creases slider, Smooth, Shuffle, Settings (Quality)
- [x] Frame loop: full rate while lively, 30 fps drift, idle sleep, hidden stop, reduced motion, watchdog
- [ ] Sound: crinkle ticks and a rustle follow drag speed; a hiss for Smooth (built; Tom to hear)
- [x] toys.json entry and menu Lab entry with an icon and a GSAP hook
- [ ] QA: 1280 and 375 px, clean console, idle stop, hidden tab stops the loop
- [ ] Record the session cost

## Round 2 (Tom: much better material and interactivity)

- [x] Displacement map: drag pulls the foil along, hold crushes it into a ball, tap pinches; the edge really moves
- [x] Creases live in material space and travel with the foil; squeezed foil crinkles by itself
- [x] Material: brushed highlights, crease shading, warm key and cool rim strips, Holo colour fringes, lifting shadow
- [x] The key light follows the mouse or the finger
- [x] Smooth lays the foil back out flat as well as pressing the creases

## Round 3 (Tom: the foil reads as a liquid)

- [x] No warp carries foil sideways: a drag buckles it along the push in discrete steps
- [x] Hold crushes in sharp snaps along random axes, with crackles in time
- [x] Squeezed foil turns to sharp folds across the squeeze axis, not smeared cells
