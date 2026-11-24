---
# stimming-ay6n
title: 'Toy: Jet hover'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-17T22:24:06Z
updated_at: 2026-11-24T04:16:45Z
parent: stimming-oh7b
---

Idea 366 in docs/toy-ideas.md, group C. Tom added it on 2026-11-17.

A VTOL jet hovers on its turbofan engines with the afterburner lit. The exhaust is the show: heat glow, smoke, heat distortion and haze against the background. The interaction is open. Working name only; Tom sets the name.

Tom chose the VTOL craft over a jet engine on a plinth (a diorama model). Tom, 2026-11-17.

Size: XXL. Tom, 2026-11-17. Not in the S to M batch.

Near ideas, kept apart: Night catapult (220, a carrier deck launch), Drone (drone/).

Batch 3 MVP: one hero moment, the hover, at high fidelity. Plan: docs/plans/jethover.md.

## Defaults chosen (Tom's open question: 3D or flat, and the presentation)

- 3D, three.js 0.186.1 WebGPU (Compute type) since 2026-11-23. A fixed long-lens shot from 150 m at eye height, after Villeneuve. Heat shimmer needs depth.
- Blue hour on a wet apron; three far ranges in haze and far lights for the shimmer to bend.
- A generic twin-nozzle VTOL, plain dark grey, no markings or real shapes (hard rule 11).
- The hand: throttle. Hold or Space for full reheat; drag to drift and yaw; click for a blip. Slider: Throttle (the hover setting).
- Sound follows the throttle and fades after the spool-down; muted by default.

## Checklist

- [x] Development plan in docs/plans/jethover.md
- [x] Blockout on the stage, screenshot 1280 x 800
- [x] Build: craft, plumes, pad, spray, heat pass, bloom, grade
- [x] Interaction and frame loop
- [x] Sound: whine, roar, crackle
- [x] Bar v3
- [x] Icon round jethover-1, emblems, intro emblem
- [x] Lab entry: toys.json, menu tile and hook
- [x] QA Q1 to Q10 at 1280 px and 375 px
- [x] Toy doc docs/toys/jethover.md
- [x] Fidelity pass on steam, smoke and heat haze: K3 (Fire's volume fluid) ported to WebGL2 in jethover/fluid.js (Tom, 2026-11-22: "consult the fire toy fire shader"); replaced on 2026-11-23 by jethover/gas.js
- [x] WebGPU move: three.js 0.186.1, Fire's fluid and volume copied into jethover/gas.js for steam and exhaust (Tom, 2026-11-23: "truster will become webgpu", "fire shader for smoke and exhaust")
- [x] Villeneuve shot: long lens from 150 m at eye height, far ranges in haze (Tom, 2026-11-23: "more villeneuveian the camera and positioning")
- [x] Slow billows: the gas clock at 0.55 of real time, a soft wall jet, more steam (Tom, 2026-11-23: "Slower, like Fire")
- [x] Billows from the jet: the exhaust smokes the floor and spreads out as a thin sheet that rolls into billows (Tom, 2026-11-23: "the billows also come form the jet")
- [x] Time of day: Dawn, Day, Dusk, Night from the Bar, eased by dayClock (Tom, 2026-11-23: "lets add ToD -- 4 times of day")
- [x] Tight lens beside the wide shot (L): the plumes against the far country, the bend scaled to the zoom (Tom, 2026-11-23: "Yes, tight lens")
- [x] Exhaust: a fine second copy of Fire's gas pumps out of the nozzles through Fire's emitter; the pad glow capped so smoke stops glowing white (Tom, 2026-11-23: "needs to pump OUT of the jet engines", "the smoke glows white")
- [x] Photo-real backdrop in place of the drawn ranges: the Cadiz Wilderness plate, public domain, graded per time of day (Tom, 2026-11-23: "photo real backdrop here", "Photo plate")
- [x] Smoke billowing down, visible and blended (Tom, 2026-11-23): denser exhaust smoke with strong swirl, shaded from above, dims the scene behind it; billows soft at half size
- [x] Dev sheet (?dev) for heat haze, gas and look; the heat sum is blurred before the bend, so the shimmer refracts smoothly instead of pixel by pixel (Tom, 2026-11-23: "open up dev mode", "very pixelated vs smooth and refracted")
- [ ] Craft model fidelity (Tom, 2026-11-22: "low fi blockout"); not started
- [ ] Blockout, signed off by Tom
- [ ] Tom's sign-off

## QA (2026-11-22)

Headless Chromium, ANGLE GL, on Tom's PC. Captures in docs/qa/jethover/ (01 blockout to 10 Lab tile hover).

- Q1 to Q9 pass: console clean; 30 fps while drifting; 0 frames in 2 s at 65 s idle, when hidden, and in reduced motion once settled; 2 bar controls, 4 How rows; Space reheat; the audio context suspends after release.
- Q10 frame times during hold and drag: 16.7 ms median, 16.7 ms p90 (vsync bound).

- [x] Craft hidden; the emitter follows the pointer from 2 m to 14 m and stays put (Tom, 2026-11-23: "let's take the jet out for a bit -- and just have the emitter movable higher in the sky too")
- [ ] Exhaust pass, docs/plans/jethover.md: guide flow, soot, dry ground, no background haze (Tom, 2026-11-23; first try rejected)

- [x] Heat distortion from a 2D heat sim in the nozzle plane, after Schlieren candle (Tom, 2026-11-23: "heat distortion (kind of like the chemical candle toy)"): jethover/heat2d.js

- [x] Dev: Fluid and Soot rows, Show layer view (heat red, soot green); soot in the 2D plane glows hot and turns black as it cools (Tom, 2026-11-23: "can we get some controls for the fluid smoke etc?")

- [x] Low-fi Dev panel (devpanel.js) in place of the Dev sheet; the hot air at real time with a fast flicker (Tom, 2026-11-23: "low fi pop over", "far more fast and less gel like")
