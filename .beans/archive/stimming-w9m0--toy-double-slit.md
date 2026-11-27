---
# stimming-w9m0
title: 'Toy: Double slit'
status: completed
type: feature
created_at: 2026-11-22T18:46:44Z
updated_at: 2026-11-27T07:19:52Z
parent: stimming-oh7b
---

Build Double slit (idea 123, group A) as a Lab toy: an MVP at high fidelity, Bar v3. Fire single photons through two slits; each lands as one random dot, and only the crowd of dots shows the interference fringes. Plan: docs/plans/doubleslit.md.

Stack type: Shader (raw WebGL2 on shared/gl.js, bloom from shared/glow.js, K1 phosphor plate from trails/).

- [x] Plan at docs/plans/doubleslit.md
- [x] Blockout on the stage, screenshot at 1280 x 800 (no checkpoint: batch 4 ran unattended)
- [x] Hero moment: true two-slit sampling, flashes, plate, fringes build up
- [x] Sound: a soft click per landing, never the same; muted by default
- [x] Bar v3 spec and copy
- [x] Icon round spike-doubleslit-1 (Current, A, D), emblems, sheet row
- [x] Intro emblem, favicon, toys.json entry, Lab tile with GSAP hook
- [x] QA Q1 to Q10, docs/toys/doubleslit.md
- [ ] Tom sets the Dutch name
- [ ] Record the session cost

## Defaults chosen (Tom's open questions: 3D or flat, and the presentation)

- Flat, face on: the stage is the face of a photon-counting camera, as the real build-up photos show it. A 3D bench would make the dots small and add props.
- No apparatus on the stage: the slits and the source stay off the frame. A dark blue glass plate in a matte frame, a darker room, one sheen of room light.
- Each dot keeps its photon's colour. The slider is Colour (420 to 660 nm): it changes the dot colour and the fringe spacing together.
- Default 470 nm, a blue LED (Harvard's demo uses one). Apart from Cloud chamber's white tracks and Night vision's green.
- The hand: tap fires one, hold or Space streams (60 a second), 1 covers a slit, 2 opens both, C clears. The idle source drips 3 a second.
- Slit width to gap 1 to 5, as in Harvard's demo: nine fringes in the central envelope.
- Icon: no pick existed. Round doubleslit-1 (Current, A, D); A is on the menu.

## QA (headless Chromium, --use-angle=gl, Tom's PC)

- Clean console in play and on the menu with the tile hovered.
- Drifting: 30 rAF per second. 62 s idle: 0. Hidden: 0. Reduced motion: 0 after 2.5 s.
- Sound: the context runs after a tap and is suspended once the toy sleeps.
- Q10 frame times during a hold: median 16.7 ms, p95 16.7 ms.
- Optics: `node --test tests/doubleslit-optics.test.mjs` passes 5 of 5.
