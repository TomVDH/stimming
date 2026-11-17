---
# stimming-auj3
title: 'Toy: Car wash'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-15T09:43:25Z
updated_at: 2026-11-16T08:57:03Z
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

## Pass four (Tom, 2026-11-16): camera rows, less neon, better graphics

Tom: "camera pov is adjustable in a dev bar from now on -- under ?dev -- i want better graphics and less obnoxious neon everywhere lmfao".

- [x] Dev rows: eye height, eye side, seat distance, pitch, yaw, field of view, Reset view; persisted; defaults keep today's view
- [ ] Everything follows the camera: glass, frame, wipers, liquids, refraction, tunnel; ranges clamped where it breaks
- [x] Tunnel light: cool white battens, warm work lamps, the signal; no glowing outlines; plain lit sign boxes
- [x] Materials: wet concrete with puddles, galvanised steel, hazard stripes, mist in the light (pass five)
- [x] Bloom only on lamps, restrained; exposure dark but readable (pass five)
- [x] Foam: cell size and density follow thickness; soft froth with few distinct bubbles; quieter frit band
- [x] Stills before and after, desktop and phone; three camera proofs; frame time (pass five)
- [x] Toy doc and handoff (accent, menu icon) updated (pass five)

## Pass five (Tom, 2026-11-16): the place, the establishing shot, strange things

Tom: "Let's make this a shady car wash somewhere in the nevada desert -- no one really knows where it came from or who owns it but we do know it's open 24/7 -- strange things do happen when you go through it sometimes." Then: "We'd want an establishment shot splash screen almost -- the sole action is to proceed -- and then the anim starts -- we'd want a shady desert 50s car wash essentially".

- [x] Establishing shot: the lot at night from the road; wide and tall framings; Dev rows for its camera
- [x] One action, Proceed: tap, Enter or Space; a dip to the driver's seat; the run plays by itself; back to the shot
- [x] The 1950s place outside: road, poles, stucco building, glass blocks, canopy, booth, price board, sodium lamp with dust and bugs
- [x] The pylon: CAR WASH, an arrow of bulbs, most dead; OPEN 24 HRS, the only neon, buzzing, one tube dead
- [x] Sky: stars, the galaxy, far ranges, a town glow, silent heat lightning
- [x] Worn interior: painted block, rust, pipe arches, old tubes and caged bulbs that flicker or are dead, motors and belts, small painted signs, the chain, drains, moths, mist in the light
- [x] The car in its time: chrome strip, ornament, painted dash; low beams outside
- [x] Suds: white froth in heaps, a few bubbles of many sizes, lace where it drains
- [x] Blower: no light strips; warm caged lamps at the exit behind beaded glass
- [x] Sound: wind, crickets, sign buzz, lamp hum; motors, belt, loose panel, drain; a duck bus
- [x] Vignette: Open all night
- [x] Stills: shot at desktop and phone, first frame after Proceed, every station; GPU time against v4
- [x] Strange events: a set, at most one per run, a fair chance of none; each with its own sound cue
- [x] Settings: Strange (Off, Sometimes, Often); Dev: force a named event
- [x] Reduced motion: events fade; no flicker over three a second
- [x] Stills per event
- [x] Handoff: accent and menu icon

Pass five summary: the toy opens on an establishing shot of a 1950s desert car wash at night and waits for one action, Proceed. The wash then runs by itself and rolls out into the desert. Eleven strange moments, at most one per run (30 % on Sometimes), each with its own sound cue. Handoff files hold a new accent and a pylon icon. Not checked by ear or in motion with the pane in front.

## Defaults from Tom's Dev values (2026-11-16)

Tom said yes to making the view he tuned under `?dev` the default. The page now holds them as `VIEW` and `LOOK`: eye height -0.12, eye side -0.01, seat distance 0.25, pitch -0.5, exposure 1.12, bloom 1.07, grain 0.12. View Reset returns to these.
