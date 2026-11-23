---
# stimming-vxno
title: 'Gas giant dive: MVP, the plunge (idea 367)'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-23T09:38:54Z
updated_at: 2026-11-23T20:55:00Z
parent: stimming-oh7b
---

Idea 367, group C, size XXXL (Tom's picks, 2026-11-23). Plan: docs/plans/gasgiant.md (Tom approved 2026-11-23, defaults Q1 to Q5 hold).

MVP: the plunge from 260 km over the cloud deck to 20 bar. Raw WebGL2 on shared/gl.js, five passes with one output each.

## Tasks
- [x] Plan doc docs/plans/gasgiant.md
- [x] Blockout: sky, rings, map, deck; stills in docs/qa/gasgiant/
- [x] March, light table, storm, filaments, lightning
- [x] Bar v3, sound, frame loop, ladder
- [x] Tom, 2026-11-23: the capsule window, voids between the decks with far towers, hue and brightness wipes on the glass
- [x] Tom, 2026-11-23: green, teal and purple palette; storm swirl after Tornado alley; tiling broken
- [x] Tom, 2026-11-23: angled capsule view, GI, entry plasma on Fire's ramp, washing and flashing in the decks
- [x] Icon round spike-gasgiant-1 (Current, A, D), emblems, GALLERY row
- [x] Intro emblem shared/emblems/gasgiant.svg, favicon, toys.json, Lab li and hook
- [x] QA Q1 to Q10, docs/toys/gasgiant.md
- [ ] Tom's look pass: the capsule interior crop, the storm, the decks
- [ ] Record link times, frame times and the session cost


## QA, 2026-11-23 (Edge headless, ANGLE D3D11, RTX 3070)

- Links: bake 245 ms, map 116, march 120, cabin 151, others under 2; all in 0.6 s.
- Q2: no page errors. Q4: 0 frames in 2 s after 66 s idle; drifting at 33 a second. Q5: 1 frame in 2 s hidden.
- Q6: reduced motion, shake 0. Q7: one action, one slider. Q8: Space dives (9.9 km/s at 6 s).
- Q9: the context is suspended at the end. Q10: 6.1 ms a frame during the dive (median and p90), before the cabin pass grew.
- Stills: docs/qa/gasgiant/.


## Look pass: storm and outside, 2026-11-23

Spiral storm with arms, lanes and folds; hue drift; exposure 0.3; saturation lift; three sun taps; holes in the belts. Links 1.1 s on D3D11. Next: cloud-top relief at Juno's scale for the near deck.


## Look pass: the near deck, 2026-11-23

Tom: "Yes, near deck". Popcorn heads, folded ridges along the bands, a crisp top near the eye, darker and deeper-coloured valleys, more sun and less diffuse. Dive 7.6 ms a frame median, 8.2 p90 (with the cabin pass); links 0.9 s. Stills 09 and 10 in docs/qa/gasgiant/.
