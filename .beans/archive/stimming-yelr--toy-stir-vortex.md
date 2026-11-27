---
# stimming-yelr
title: 'Toy: Stir vortex'
status: completed
type: feature
created_at: 2026-11-23T10:30:11Z
updated_at: 2026-11-27T07:19:52Z
parent: stimming-oh7b
---

Build Stir vortex (idea 85, group A, a lab experiment) as a Lab toy: an MVP at high fidelity, Bar v3. Toy id stirbar. A glass beaker of water stands on a magnetic stirrer on a dark lab bench, a white stir bar at the bottom. Turn the knob and the bar spins up; the free surface dips into a smooth funnel that deepens toward the bar as the speed rises. Tap to drop dye from a pipette: it spirals in, wraps into helical threads and is drawn down the funnel. Spin down: the funnel relaxes and the swirl decays slowly. Plan: docs/plans/stirbar.md.

- [x] Plan at docs/plans/stirbar.md
- [x] Reference photos of the real thing
- [x] Blockout on the stage, screenshot at 1280 x 800 (docs/qa/stirbar/01-blockout.jpg)
- [x] Hero moment: knob, spin-up, funnel, dye drop, helical threads, spin-down
- [x] Sound: motor, swirl, knob ticks, pipette and drop; muted by default
- [x] Bar v3 spec and copy
- [x] Icon round spike-stirbar-1 (Current, A, D), emblems, sheet row
- [x] Intro emblem, favicon, toys.json entry, Lab tile with GSAP hook
- [x] QA Q1 to Q10, docs/toys/stirbar.md
- [ ] Tom sets the Dutch name
- [ ] Record the session cost

Stack type: Shader-like, raw WebGL2 (shared/gl.js, bloom from shared/glow.js, grade from shared/grade.js). No shared module changed.

## Defaults chosen (Tom's open questions: 3D or flat, and the presentation)

- 3D, a fixed camera a little above the water line: the funnel shows as a silver V through the glass and as a dip in the surface. A portrait stage crops the stirrer's sides.
- The stirrer: a black body, a white ceramic plate, one knob on the front, an amber lamp that glows with the speed. A 600 mL style beaker with a rolled rim; a white PTFE bar with a pivot ring.
- Light: a dark room with a soft glow on the backdrop close behind the beaker, so the water is backlit and the dye reads as colour, as in lab photos. A cool key from the back left casts the beaker's and the bar's shadows on the plate.
- The funnel: a volume-keeping vortex height field, depth with the square of the spin; at full speed the tip stops 3.5 mm over the bar. Total internal reflection gives it its silver.
- The dye: 12,000 CPU tracers per drop in a stirred flow (a vortex with a core, an Ekman cell, smooth eddies), splatted into a 3D atlas and read by Beer-Lambert. A helical pattern that turns with the core gives the threads.
- Three dyes: Blue (food dye), Violet (permanganate), Green (fluorescein, it glows).
- Bar v3: Dye choice (1, 2, 3), Drop (Space), Rinse (R), Speed slider (the knob). Drag the knob, the wheel or the arrows also turn it.
- Icon: no pick existed. Round stirbar-1 (Current, A, D); A is on the menu; the intro emblem is A's emblem.
- Draft Dutch name: Roerkolk /ˈrurkɔlk/. Accent oklch(0.7 0.14 258).

## Reference

Lab photos of a beaker on a stirrer against a dark backdrop (a silver V funnel to the bar), blue food dye wound round a vortex in feathery helices, a top view of blue rings; Flow Vis 2014 (a funnel with dye ribbons); Halasz and others, Am. J. Phys. 2007 (an ideal vortex outside a core, a downwelling jet on the axis).

## QA (headless Edge, D3D11, RTX 3070)

- Q1: node --check passes on the four modules, the menu scripts and the icon page.
- Q2: clean console in play, on the menu with the tile hovered, and on the icon page.
- Q4: drift 32 rAF per second; 62 s after the last input, 0 frames in 2 s.
- Q5: hidden tab, 0 frames in 2 s.
- Q6: reduced motion: clean console; the gestures answer, slower, no eddies.
- Q7: Dye choice, Drop, Rinse, Speed slider (4 controls); How to play has 4 rows.
- Q8: arrows, 1 to 3, Space and R each do their job.
- Q9: the context runs after a gesture and is suspended once the toy sleeps.
- Q10: frame times through a drop at full speed: median 7.6 ms, p95 8.2 ms.
- Load: first frame 2.3 s cold (tools/loadtime.mjs).
- Captures: docs/qa/stirbar/.
