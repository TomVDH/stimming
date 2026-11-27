---
# stimming-3a36
title: 'Toy: Leaf shadows'
status: completed
type: feature
created_at: 2026-11-23T00:28:44Z
updated_at: 2026-11-27T07:19:52Z
parent: stimming-oh7b
---

Build Leaf shadows (idea 76, group F, a calm ambient piece) as a Lab toy: an MVP at high fidelity, Bar v3. Dappled light through a tree's leaves on a warm plaster wall (komorebi). Each gap in the leaves acts as a pinhole, so the bright spots are round, soft images of the sun; near leaves cast sharper shadows. The breeze slider takes it from still to a gusty shiver; the pointer casts a soft hand shadow. Plan: docs/plans/leafshadows.md.

Stack type: Shader (raw WebGL2 on shared/gl.js, bloom from shared/glow.js), with instanced leaves in masks.

- [x] Plan at docs/plans/leafshadows.md
- [x] Reference photos (Wikimedia Commons: leaf shadows on plaster, dappled light on walls)
- [x] Blockout on the stage, screenshot at 1280 x 800 (docs/qa/leafshadows/01-blockout.jpg)
- [x] Hero moment: dapples by the sun's disc, layered sway and flutter, gusts, the hand's shadow
- [x] Sound: muted by default, finished
- [x] Bar v3 spec and copy
- [x] Icon round spike-leafshadows-1 (Current, A, D), emblems, sheet row
- [x] Intro emblem, favicon, toys.json entry, Lab tile with GSAP hook
- [x] QA Q1 to Q10, docs/toys/leafshadows.md
- [ ] Tom sets the Dutch name
- [ ] Record the session cost

## Defaults chosen (Tom's open questions: 3D or flat, and the presentation)

- Flat: the stage is the wall, seen square on; the tree stays out of view, only its shadow shows. Why: the subject is the light on the wall; a visible tree is a prop.
- Late-afternoon sun from the upper left, 28 degrees up and 58 degrees off the wall's normal: warm gold light, a cool grey-blue sky fill in the shade. Why: the reference photos show warm cream plaster with grey-olive shadows, never black; the slant stretches each dapple into an ellipse.
- Four leaf layers by distance (5.5 m and 3.6 m crown rosettes, a 1.3 m mid branch, a 0.55 m near sprig). Each far layer blurs by the sun's disc at its distance (an ellipse kernel with limb darkening), so gaps become images of the sun: round dapples far off, crisp leaves near.
- The crown shades the upper left; the sun falls open to the lower right; the near sprig hangs into the open sun from the upper right. A tall stage slides right to keep the sprig in the shot.
- Breeze slider 0 to 1 (default 0.35). Gust (Space) sends a front from the left; a tap sends one from just upwind of the tap. The pointer's hand casts a shadow at 0.6 m from the wall, drawn 1.4 times life size so it reads among the leaves.

## QA (2026-11-22)

- Q1 node --check: five modules and the six menu scripts pass (also HEAD plus only this bean's hunks).
- Q2 console clean on the toy (tap, hand sweep, Space, slider), at 1280 x 800, 375 x 812 and 812 x 375, under reduced motion, on the icon round and on the Lab hover. Intro and monogram show the emblem. The only warning is the test's own ScriptProcessor tap.
- Q3 captures: docs/qa/leafshadows/ (01 blockout to 09 Lab tile hover).
- Q4 drift 28.5 frames a second; 0 frames 62 s after the last input. Q5 hidden: 0 frames in 2 s; back at 29 a second.
- Q6 reduced motion: no drift; a gust plays a slow soft sway, then 0 frames.
- Q7 one action (Gust), one slider (Breeze); three How rows. Q8 Space sends a gust.
- Q9 context running after the gesture, suspended at the end (also under reduced motion). Bed RMS about 0.03 at breeze 0.35, 0.1 in a gust; peak 0.42.
- Q10 Edge headless on D3D11, RTX 3070, during a gust at 1280 x 800: frame median 7.6 ms, p95 8.5 ms (the headless frame cap; no rung stepped down).
