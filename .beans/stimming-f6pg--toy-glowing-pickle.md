---
# stimming-f6pg
title: 'Toy: Glowing pickle'
status: in-progress
type: feature
created_at: 2026-11-23T10:25:26Z
updated_at: 2026-11-23T10:25:26Z
parent: stimming-oh7b
---

Build Glowing pickle (idea 134, group A, a lab demonstration) as a Lab toy: an MVP at high fidelity, Bar v3. A brined gherkin between two fork electrodes on a plate, wired to the mains, in a dimmed room. Flip the switch: it hums and buzzes, steams, sizzles and spits, then one end ignites into a pulsing sodium-yellow glow that lights the plate and the room in monochrome orange. Switch off: the glow dies to dull red, then dark, leaving a scorched, steaming pickle. Plan: docs/plans/pickle.md.

Stack type: Scene (three.js 0.170, WebGL 2), with a raymarched steam pass (Fire's K3 lighting, after Wrecking ball's dust).

- [x] Plan at docs/plans/pickle.md
- [x] Reference photos and videos of the demonstration (Wikimedia Commons, File:Glowing_Pickle_Alejandro_Garcia.webm; Wikipedia, Glowing pickle demonstration)
- [x] Blockout on the stage, screenshot at 1280 x 800 (docs/qa/pickle/01-blockout.jpg, 02-blockout-glow.jpg)
- [x] Hero moment: hum, steam, sizzle and spit, ignition, sodium glow lights the room, glow dies, scorch
- [x] Sound: muted by default, finished
- [x] Bar v3 spec and copy
- [x] Icon round spike-pickle-1 (Current, A, D), emblems, sheet row
- [x] Intro emblem, favicon, toys.json entry, Lab tile with GSAP hook
- [x] QA Q1 to Q10, docs/toys/pickle.md
- [ ] Tom sets the Dutch name
- [ ] Record the session cost

## Defaults chosen (Tom's open question: 3D or flat, and the presentation)

- 3D, a fixed camera, low at the front right, so the glowing end faces it. Why: the glow lights real things (plate, forks, table); light on form needs 3D.
- The classroom set and nothing else: a white china plate on a dark table in a dim room, a dill pickle (12 x 3.7 cm), a steel dessert fork standing in each end at 30 degrees, a red and a black clip lead off to the sides.
- Room light: dim and cool from the upper left (a window behind blinds). The first frame is a picture: a green pickle, glints on the forks.
- The glow: a sodium point light inside the right end; the pickle casts no glow shadow (the light leaves through the flesh); the forks throw hard shadows. A grade drains colour to one orange hue as the glow takes over, and the exposure drops as the eye adapts.
- Mains: 230 V, 50 Hz (Belgium). Variac slider 90 to 230 V: a slower warm-up and a dimmer glow at low volts; under 100 V it only steams.
- Switch (Space, or a click on the stage) and Fresh (N, power off only). The power switches itself off 60 s after the last input.

## QA (2026-11-23)

- Q1 node --check: the four modules pass; the menu's hook script passes.
- Q2 console clean on the toy (Space, click, N, the Variac slider, the 60 s auto-off), at 1280 x 800, 375 x 812 and under reduced motion; on the icon round and on ?lab with the tile hovered.
- Q3 captures: docs/qa/pickle/ (01 blockout to 13 reduced motion; 08 icon round, 09 Lab tile).
- Q4 the loop stops 3 s after a short run and 13 s after a 60 s run (steam and ember out); then 0 frames in 2 s. Not a drifting toy.
- Q5 hidden while on: 0 frames in 2 s.
- Q6 reduced motion: no flicker, drop-outs or flare flashes; clean console; the loop settles.
- Q7 two actions (Switch, Fresh), one slider (Variac); three How rows.
- Q8 Space switches on and off (aria-pressed follows); N is refused while on, lays a fresh pickle when off; a click on the stage switches.
- Q9 the context runs after the gesture and is suspended at the end (also under reduced motion).
- Q10 Edge headless on D3D11, RTX 3070, while it glows with steam at 1280 x 800: frame median 7.5 ms, p95 8.2 ms (the headless cap; no rung stepped down).
- The power switches itself off 60.2 s after the last input; scorch then is full.
