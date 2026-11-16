---
# stimming-auj3
title: 'Toy: Car wash'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-15T09:43:25Z
updated_at: 2026-11-16T07:05:20Z
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

## Pass two (Tom, 2026-11-15)

Tom: "the wind shield isnt angled and this should be a surface against which the water and all liquid effects respond - bokeh -- bloom fine tuning and generally a better look for the car wash".

- [x] Glass geometry: a raked, bowed windscreen; the sim and every drop in glass coordinates; refraction through the glass Jacobian
- [x] Car frame: leaning A-pillar, header and roof lining, dash top, parked wipers on the cowl, mirror stub
- [x] Liquids: gravity down the rake, rivulets, pooling at the cowl and the parked blades
- [x] Curtains and rinse land on a line that moves along the glass; the water spreads from it
- [x] Foam as lather: body, sag, sheets, a film behind; the foam fall as lather
- [x] Brushes and mitters: real contact bands, smear, streaks in their travel; cloth in motion
- [x] Wipers: true arcs on the glass, a bow wave of water and foam
- [x] Dryer: beads pushed up the rake, shiver, tracks
- [x] Bokeh: focus on the glass; discs that sharpen where wiped, swell and smear where wet
- [x] Bloom: soft knee, hot cores, smooth halos; dithered output
- [x] Look: olive foam fixed, each station a distinct picture, the entry kept
- [x] Stills before and after at every station, desktop and phone; frame time on Standard and High
- [x] Toy doc updated

## Pass three (Tom, 2026-11-15): foam and cloth

- [x] Lather with body: thickness normals, a rounded lip, a contact shadow, light through thin and in thick foam
- [x] Bubbles at three sizes; large ones pop and leave a ring; glints that move with the lights
- [x] Thin foam turns to an iridescent soap film, then clear wet glass
- [x] Three dye streams as soft marbled bands; foam slides faster where wet beneath
- [x] Foam fall as strings and gobs
- [x] Cloth: separate rounded strips, wet sheen, dark gaps, overlap, rim light, a fringe of tips
- [x] Dry glass: dash reflection, frit band and tint strip, dried spots and dust, a sliding highlight
- [x] Wipers: a ridge in thick lather, a clean wet arc with a soapy edge
- [x] Stills checked lossless; real-loop frame time measured or said plainly
- [x] Toy doc updated
