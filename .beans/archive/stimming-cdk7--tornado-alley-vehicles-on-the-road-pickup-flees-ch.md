---
# stimming-cdk7
title: 'Tornado alley: vehicles on the road (pickup flees, chasers rush in)'
status: completed
type: task
priority: normal
created_at: 2026-11-17T08:37:22Z
updated_at: 2026-11-17T08:42:11Z
parent: stimming-dwwg
---

Tom (via the lead, 2026-11-17): vehicles on the road as a scene. (1) A pickup races out of the action from the far end toward and past the eye, dust and spray behind it, headlights on, slight sway, motion blur by speed. (2) A little later two storm chasers rush in from behind the eye toward the storm: a wagon with roof gear and a van with an instrument rack, amber lights flashing, close together. Blockout: lit shapes in envScene, hazed and shadowed like the poles, true road geometry and lanes, 25-35 m/s, nothing hiding the touchdown area. No brand names. Trigger: a Dev row and a key; it also runs once after the first tornado touches down.

- [x] Traffic state, sequence, trigger
- [x] Bodies, wheels, lights
- [x] Dust, spray, motion blur, sway
- [x] Stills, perf, commit

## Summary of Changes

traffic.js (blockout): the pickup flees and passes the eye; the chasers rush in from behind. Ray-traced boxes and wheels, paint, glass, tyres, lamps with a lens bloom, amber flashers, dust puffs, a contact shadow, motion blur from three jittered shutter samples, roll and pitch. Dev Road > Vehicles, key V, and once by itself after the first touchdown. Next: shapes beyond boxes (hood slope, cab and bed of the pickup, grille), spray in rain.
