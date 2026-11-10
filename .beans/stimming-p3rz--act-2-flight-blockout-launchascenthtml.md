---
# stimming-p3rz
title: 'Act 2 flight blockout: launch/ascent.html'
status: completed
type: task
priority: normal
created_at: 2026-11-10T10:37:01Z
updated_at: 2026-11-10T16:16:18Z
parent: stimming-ng4g
---

A dev page that plays the whole flight in photoreal: every state is a function of time, so a slider scrubs it.

## Checklist
- [x] flight.js: altitude, downrange, attitude, events, orbit, escape
- [x] space.js: GPU single-scatter air at any height, Earth, Moon, Sun, stars
- [x] rocket.js: stages, fairing halves, flames, trail, vapour, flakes
- [x] cams.js: hull mounts and the auto director
- [x] ascent.html: bar, scrub, loop, post; check stills along the flight
- [x] Probe ending (Tom, 2026-11-10): payload parts, wings unfold and turn to the sun, a long lonely coast; the Milky Way comes up
- [x] Watch live playback: moved to the pick-up list in docs/plans/ascent.md
- [x] Commit and push

## Summary of Changes
Ascent plays end to end in ascent/index.html: flight, sky, rocket, probe and cameras. Checked in stills only.
