---
# stimming-81vs
title: 'Drone: faux flight sim spike, mouse control'
status: in-progress
type: spike
priority: normal
created_at: 2026-11-17T21:13:01Z
updated_at: 2026-11-17T21:32:17Z
---

Question: can mouse control fly a heavy-lift quad as a faux drone sim that feels right?

Tom, 2026-11-17: "mouse control -- just try out for now -- maybe accurate lift yaw pitch etc -- make it a faux drone sim".

Stack type: Scene (three.js 0.170). Throwaway spike page, not a Lab toy yet. No toys.json entry.
Airframe: ported from the hubspot-nightly intro (procedural, no .glb). No brand name, no fuselage lettering.

- [x] Port the airframe to drone/airframe.js, lettering removed
- [x] Flight model: 8 rotors with spin-up lag, mixer, rigid body, drag, ground effect, wind, ground contact
- [x] Flight controller: Position, Angle and Acro modes
- [x] Mouse sticks: left drag pitch and roll, right drag throttle and yaw; touch halves
- [x] World: dusk field, landing pad, poles, trees, windsock, haze
- [x] Cameras: chase, gimbal, pilot
- [x] HUD: altitude, speed, climb, heading, mode, motor bars
- [x] Check in the browser pane: clean console, controls, 375 x 812
- [ ] Tom tries it; keep, change or drop


## Notes

- Files: drone/index.html, drone/airframe.js (port, no lettering), drone/flight.js (no dependencies).
- Checked headless (Playwright, d3d11): arm, climb, hover, forward, brake, yaw, land, auto-disarm; 61 fps; clean console; 1280, 375 x 812, 812 x 375.
- Node checks: hard drop crashes, a tree crashes, the container roof takes a landing.
- Tom, 2026-11-17: "push to GH lab so I can show to coworker". The page moves to drone/index.html with a Lab entry in toys.json.
- No menu tile yet: a tile is a menu edit, which needs its own bean and Tom's yes. The page opens at drone/.
