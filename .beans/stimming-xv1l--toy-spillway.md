---
# stimming-xv1l
title: 'Toy: Spillway'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-16T21:08:16Z
updated_at: 2026-11-22T11:19:58Z
parent: stimming-oh7b
---


Idea 101 in docs/toy-ideas.md, group C. Tom picked it on 2026-11-16.

A concrete dam in a gorge. Drag to open the gates; water thunders down and mist climbs the walls.

Rough size: L to XL as an idea. Built as an MVP at high fidelity (batch 1, 2026-11-22).

Defaults chosen (Tom's open question, "3D or flat, and the presentation"):
- 3D, one fixed low camera at the plunge pool. Raw WebGL2: the rock, dam and pool raymarch once into a G-buffer; each frame shades it.
- Late afternoon, the sun low behind the camera, so the spray holds a rainbow.
- Gates by drag on the dam itself; no lever (a lever is a prop).
- Stack type: Shader (raw WebGL2), with shared gl, sky, glow, grade, output and detail modules.

- [x] Development plan in docs/plans/spillway.md
- [x] Blockout screenshot at 1280 x 800
- [x] Hero moment: gates, trickle to roar, mist, drain and drip
- [x] Sound, muted by default
- [x] Bar v3 spec, keys, frame loop states, slow-frame step
- [x] Icons: Tom already picked A of spike spillway-1 (2026-11-16); menu tile from it, sheet row, intro emblem shared/emblems/spillway.svg, favicon
- [x] toys.json entry and menu Lab entry with GSAP hook
- [x] QA Q1 to Q10 at 1280 px and 375 px
- [x] docs/toys/spillway.md
- [ ] Blockout, signed off by Tom
- [ ] Tom's sign-off
- [ ] Tom sets the Dutch name
- [ ] Tom listens to the sound
- [ ] Record the session cost

## QA, 2026-11-22

Headless Chromium on the dev PC, ANGLE GL (real GPU). Captures in docs/qa/spillway/.

| Check | Result |
|---|---|
| Q1 | node --check passes: main.js, shaders.js, sound.js, and the six menu scripts |
| Q2 | Console clean on the toy (drag, tap, Space, arrows, slider) and on ?lab with a hover on the tile |
| Q3 | 1280 x 800: first frame, trickle, roar, hang, drain and drip. 375 x 812 with touch: first frame, roar |
| Q4 | Drifting: 47 rAF calls in 2 s. 62 s after the last input: 0 in 2 s |
| Q5 | Hidden page: 0 frames in 2 s |
| Q6 | Reduced motion: console clean; the loop stops once the gates rest (0 in 2 s) |
| Q7 | One action, one slider; four How to play rows |
| Q8 | Space opens and closes all; Up and Down step all; a click toggles one gate |
| Q9 | The context runs after a gesture and is suspended at the end |
| Q10 | During a drag: median frame 16.7 ms, p95 16.7 ms (60 fps). First frame 3.4 s after load on ANGLE D3D11 |

## Questions for Tom

- The menu icon (your pick A) has three gates; the toy has five bays. Keep both, or match them?
- Defaults: 3D, late afternoon with the sun behind the camera, gates by drag on the dam. Change any?
- Dutch name: draft Overlaat.

