---
# stimming-faow
title: 'Toy: Crinkle foil'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-08T10:28:16Z
updated_at: 2026-11-08T10:43:25Z
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
