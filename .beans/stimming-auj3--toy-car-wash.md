---
# stimming-auj3
title: 'Toy: Car wash'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-15T09:43:25Z
updated_at: 2026-11-15T10:21:17Z
---

Idea 234 (Group C, cinematic dioramas): "Seen from the seat: foam, brushes, water curtain, coloured light."

You sit in the driver's seat of a car on the conveyor of an automatic car wash at night. The whole picture is the windscreen. The car creeps through the stages at conveyor speed: pre-soak curtain, coloured foam, hanging mitters, wrap and top brushes, rinse, wax mist, blowers, then out into the night. Magenta, cyan and amber tunnel lights glow through the wet glass. A tap starts the run or sends the car through again; a drag or W runs the wipers.

Tier: raw WebGL2. Own pass chain in the runner's order (shared/environment.js has no per-pixel glass hook and no sim pass): glass-state sim (MRT ping-pong), procedural tunnel scene, bokeh (shared/bokeh.js), pane with shared/wetglass.js beads, runs and fog plus foam and wipers, bloom (shared/glow.js), grade (shared/grade.js), output (shared/output.js), level from shared/detail.js.

## Checklist
- [x] Blockout: page, Bar v2, conveyor timeline, tunnel and arches, camera
- [x] Glass sim: foam, sheet water, beads, hue, material offset; wipers
- [ ] Look: lights, wet glass, bokeh, bloom, grade, bonnet, dash
- [ ] Stage: pre-soak curtain
- [ ] Stage: tri-colour foam
- [ ] Stage: mitters
- [ ] Stage: wrap and top brushes
- [ ] Stage: rinse, wax mist
- [ ] Stage: blowers
- [ ] Stage: exit into the night
- [ ] Sound: cabin, roof drumming, brush thump and swish, blower roar, wipers
- [ ] Idle: loop stops when parked and settled; whenVisible; detail level; slow-frame step
- [ ] Reduced motion
- [ ] Intro fallback text and vignette
- [ ] QA: console, gestures, controls, sound, 1280, 375 x 812, 812 x 375
- [ ] Toy doc: docs/toys/carwash.md
- [ ] Handoff: toys-entry.json, menu-li.html, menu-icon.js
