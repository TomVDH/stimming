---
# stimming-c7nv
title: 'Toy: Opal turn'
status: completed
type: feature
created_at: 2026-11-23T10:25:34Z
updated_at: 2026-11-27T07:19:52Z
parent: stimming-oh7b
---

Build Opal turn (idea 116, group F, quiet to use and rich to look at) as a Lab toy: an MVP at high fidelity, Bar v3. One polished precious opal cabochon on dark velvet under one soft light. Drag slowly to tilt the stone; play-of-colour patches (harlequin and pinfire) of saturated red, green and blue flare, slide with parallax through its depth, and fade, under a glossy dome highlight. Plan: docs/plans/opal.md.

Stack type: Shader (raw WebGL2 on shared/gl.js, bloom from shared/glow.js).

- [x] Plan at docs/plans/opal.md
- [x] Reference photos (Wikimedia Commons: black opal cabochons; harlequin and pinfire patches, a window highlight on the dome)
- [x] Blockout on the stage, screenshot at 1280 x 800 (docs/qa/opal/01-blockout.jpg)
- [x] Hero moment: tilt, play-of-colour by domain, parallax depth, dome highlight, body tone
- [x] Sound: muted by default, finished
- [x] Bar v3 spec and copy
- [x] Icon round spike-opal-1 (Current, A, D), emblems, sheet row
- [x] Intro emblem, favicon, toys.json entry, Lab tile with GSAP hook
- [x] QA Q1 to Q10, docs/toys/opal.md
- [ ] Tom sets the Dutch name
- [ ] Record the session cost

## Defaults chosen (Tom's open questions: 3D or flat, and the presentation)

- Black opal, semi-translucent (a black crystal). Why: the dark body gives the most saturated flashes and suits the dark stage; the clear crown keeps the depth, so patches slide with parallax. A crystal opal is pale and washes out on dark velvet.
- 3D: one oval cabochon on a tray of deep indigo velvet, seen from above and 26 degrees in front. Why: the tilt is the toy, and a flat stone cannot tilt. The tray tilts with the stone, so the stone never leaves its velvet.
- One soft box behind the stone, 50 degrees up: its window on the dome, a pool of light and a soft shadow on the velvet. Lamp slider moves it from behind left to behind right.
- Play-of-colour by Bragg diffraction: four colour layers of warped Voronoi domains over black potch, each with a lattice normal, a spacing and a lobe; pinfire in two fine layers. A patch shifts toward blue as the tilt grows.
- Drag tilts up to 26 degrees and holds; a tap rocks the stone; arrows tilt a step; Turn (Space) rocks it once in 7 s. A tall stage turns the stone lengthwise.
- Sound: a patch that flares rings a small glass tone, red low and blue high on a pentatonic scale, panned by place; velvet rustles under a fast tilt.

## QA (2026-11-23)

- Q1 node --check: five modules and the menu scripts pass.
- Q2 console clean on the toy (drag, tap, arrows, Space, Lamp), at 1280 x 800, 375 x 812 (touch) and 812 x 375, under reduced motion, on the icon round and on the Lab hover. Intro and monogram show the emblem.
- Q3 captures: docs/qa/opal/ (01 blockout to 13 Lab tile hover).
- Q4 drift 26.5 to 29 frames a second; 0 frames 62 s after the last input. Q5 hidden: 0 frames in 2 s; back at 29 a second.
- Q6 reduced motion: 0 frames at rest; a tap and a Turn answer, then 0 frames.
- Q7 one action (Turn), one slider (Lamp); four How rows. Q8 arrows tilt; Space turns.
- Q9 context running after the gesture, suspended once the stone settles. A fast 3 s drag rang 17 tones before the 0.28 s gap; the gap now caps it near 3 a second.
- Q10 Edge headless on D3D11, RTX 3070, during a slow drag at 1280 x 800, pixel ratio 2: frame median 7.6 ms, p95 8.2 ms (the headless cap; no rung stepped down).

