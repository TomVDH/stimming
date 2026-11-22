---
# stimming-ay6n
title: 'Toy: Jet hover'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-17T22:24:06Z
updated_at: 2026-11-22T13:04:58Z
parent: stimming-oh7b
---

Idea 366 in docs/toy-ideas.md, group C. Tom added it on 2026-11-17.

A VTOL jet hovers on its turbofan engines with the afterburner lit. The exhaust is the show: heat glow, smoke, heat distortion and haze against the background. The interaction is open. Working name only; Tom sets the name.

Tom chose the VTOL craft over a jet engine on a plinth (a diorama model). Tom, 2026-11-17.

Size: XXL. Tom, 2026-11-17. Not in the S to M batch.

Near ideas, kept apart: Night catapult (220, a carrier deck launch), Drone (drone/).

Batch 3 MVP: one hero moment, the hover, at high fidelity. Plan: docs/plans/jethover.md.

## Defaults chosen (Tom's open question: 3D or flat, and the presentation)

- 3D, three.js 0.170 (Scene type). A fixed low three-quarter camera, a diorama with no orbit. Heat shimmer needs depth.
- Blue hour on an open plain over a damp pad; far ridge and far lights for the shimmer to bend.
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
- [ ] Blockout, signed off by Tom
- [ ] Tom's sign-off

## QA (2026-11-22)

Headless Chromium, ANGLE GL, on Tom's PC. Captures in docs/qa/jethover/ (01 blockout to 10 Lab tile hover).

- Q1 to Q9 pass: console clean; 30 fps while drifting; 0 frames in 2 s at 65 s idle, when hidden, and in reduced motion once settled; 2 bar controls, 4 How rows; Space reheat; the audio context suspends after release.
- Q10 frame times during hold and drag: 16.7 ms median, 16.7 ms p90 (vsync bound).
