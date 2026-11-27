---
# stimming-na7m
title: 'Crow wires: East Van alley pole at a Dutch angle, crows murmurate'
status: completed
type: task
created_at: 2026-11-17T19:51:54Z
updated_at: 2026-11-27T07:19:52Z
parent: stimming-guw5
---

New Lab toy in the East Van series, from the series icon Wires (shared/series/shots.js).

Stack type: Shader (raw WebGL2, shared/gl.js).

Tom (2026-11-17): the power line from a Dutch angle, wires, crows flying over with the murmuration shader, a static anime-style vignette of the East Van alley poles.

Design (Tom said ok, then dive in):
- Look up at one alley pole at dusk, frame tilted about 14 degrees.
- Cel-shaded sky and clouds, pole, crossarms, transformer, wires to the frame edges, roof edges at the bottom.
- Crows sit on the wires. A tap startles them into a murmuration (the flock sim from flock/index.html, copied, not shared).
- After a while each crow flies back to its own spot on a wire. Then the loop stops.
- No sound in this pass.

- [x] Page on Bar v2, toys.json entry (Lab, series eastvan)
- [x] Sky: shared time of day (daytime.js, sky.js), raymarched drifting clouds, a random sky each visit
- [x] Pole from a reference photo: two crossarms, post insulators, fuse cutouts, a three-can transformer bank, ray traced PBR wood and metal
- [x] Wires sway in the wind; a click plucks a span
- [x] Crow highway on the murmuration sim, densest at dusk
- [x] Sneakers thrown over the west drop, pendulums in the wind
- [x] Time slider, Now, Car (headlights after dark), Scatter
- [ ] QA: 1280, 375x812, 812x375, console, reduced motion, hidden tab, load time
- [ ] Split main.js (about 1,800 lines) into modules
- [ ] Toy doc docs/toys/wires.md
- [x] Icon A (spike wires-1, Tom's pick): menu Lab tile in the East Van row, intro emblem shared/emblems/wires.svg
