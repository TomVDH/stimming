---
# stimming-auj3
title: 'Toy: Car wash'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-15T09:43:25Z
updated_at: 2026-11-15T10:32:44Z
---

Idea 234 (Group C, cinematic dioramas): "Seen from the seat: foam, brushes, water curtain, coloured light."

You sit in the driver's seat of a car on the conveyor of an automatic car wash at night. The whole picture is the windscreen. The car creeps through the stages at conveyor speed: pre-soak curtain, coloured foam, hanging mitters, wrap and top brushes, rinse, wax mist, blowers, then out into the night. Magenta, cyan and amber tunnel lights glow through the wet glass. A tap starts the run or sends the car through again; a drag or W runs the wipers.

Tier: raw WebGL2. Own pass chain in the runner's order (shared/environment.js has no per-pixel glass hook and no sim pass): glass-state sim (MRT ping-pong), procedural tunnel scene, bokeh (shared/bokeh.js), pane with shared/wetglass.js beads, runs and fog plus foam and wipers, bloom (shared/glow.js), grade (shared/grade.js), output (shared/output.js), level from shared/detail.js.

## Checklist
- [x] Blockout: page, Bar v2, conveyor timeline, tunnel and arches, camera
- [x] Glass sim: foam, sheet water, beads, hue, material offset; wipers
- [x] Look: lights, wet glass, bokeh, bloom, grade, bonnet, dash
- [x] Stage: pre-soak curtain
- [x] Stage: tri-colour foam
- [x] Stage: mitters
- [x] Stage: wrap and top brushes
- [x] Stage: rinse, wax mist
- [x] Stage: blowers
- [x] Stage: exit into the night
- [x] Sound: cabin, roof drumming, brush thump and swish, blower roar, wipers
- [x] Idle: loop stops when parked and settled; whenVisible; detail level; slow-frame step
- [x] Reduced motion
- [x] Intro fallback text and vignette
- [x] QA: console, gestures, controls, sound, 1280, 375 x 812, 812 x 375
- [x] Toy doc: docs/toys/carwash.md
- [x] Handoff: toys-entry.json, menu-li.html, menu-icon.js

## Summary of Changes

- `carwash/index.html`: a new Lab toy on Bar v2. Raw WebGL2: a glass-state sim (foam, sheet water, beads, dye, foam offset, haze, wiper smear), a procedural tunnel with eight stations and lit signs, the shared bokeh, wet glass, bloom, grade and output. Go runs an 80 s conveyor pass; drag or W runs the wipers. Synthesized cabin sound.
- `docs/toys/carwash.md`: the toy doc.
- Handoff files for the menu tile, its GSAP icon and the toys.json entry, in the batch scratchpad.
- Not used: `shared/environment.js`; it has no glass-state pass and no per-pixel hook in its glass step.
