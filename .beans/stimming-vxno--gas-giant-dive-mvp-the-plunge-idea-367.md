---
# stimming-vxno
title: 'Gas giant dive: MVP, the plunge (idea 367)'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-23T09:38:54Z
updated_at: 2026-11-24T01:10:00Z
parent: stimming-oh7b
---

Idea 367, group C, size XXXL (Tom's picks, 2026-11-23). Plan: docs/plans/gasgiant.md (Tom approved 2026-11-23, defaults Q1 to Q5 hold).

MVP: the plunge from 260 km over the cloud deck to crush depth, 640 km down (Tom, 2026-11-23: a deep, majestic, abyssal dive). Raw WebGL2 on shared/gl.js, five passes with one output each.

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
- [x] Tom, 2026-11-23: low side sun; the abyssal dive to 640 km, fourteen layers
- [x] Tom, 2026-11-23: voids to the horizon, twisters, storm curtains
- [x] Tom, 2026-11-23: light into the clouds; clustered towers; rare twisters at curtain edges
- [ ] Void ceilings after Tornado alley's storm base (first pass in; relief not yet at Tornado alley's level)
- [x] Lo-fi diagram of all possible layers to the crush (docs/plans/gasgiant-layers.svg)
- [x] Dev sheet: go to a layer, free look, light tuning (?dev)
- [x] Tom, 2026-11-23: god rays through breaks, light pools, scale
- [x] Tom, 2026-11-23: haze lid, mushball fall, gyre, lightning nest (first pass)
- [x] Tom, 2026-11-23: staged loading (three march zones) and resume on reload
- [ ] Focus: the dive from above, first touch, the first two layers (polished: thunderheads, veils, billows inside; the window weather still covers the interior)
- [ ] More weirdness in the voids
- [x] Tom, 2026-11-23: the window's two layers (near fog after Window seat, shared wet pane), cracks, the crush
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


## The abyssal dive, 2026-11-23

Low side sun (az 65, el 10), four sun taps. Fourteen layers to -500 km, dark gas to crush depth at -640 km (about 1,000 bar). Light fades slowly and fails under the last deck; eye gain up to 8; flashes dim to match. A held dive takes 200 s. Frame 7.7 ms median at 60, -200 and -300 km. Stills 11 to 15.


## The voids to the horizon, 2026-11-23

Void march window 1,600 km, haze 470 to 870 km, twisters and curtains. 7.8 ms a frame in the voids; links 1.5 s. Stills 16 to 19.
