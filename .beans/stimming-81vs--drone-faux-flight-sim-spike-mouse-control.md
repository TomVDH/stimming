---
# stimming-81vs
title: 'Drone: faux flight sim spike, mouse control'
status: in-progress
type: spike
priority: normal
created_at: 2026-11-17T21:13:01Z
updated_at: 2026-11-17T22:35:27Z
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


## Round 2 (Tom, 2026-11-17)

Tom's asks: motor sound, downwash, model and graphics, refine the scene, an obstacle course in it, keys and a gamepad, haze discs on the lower rotors, Bar v3, a video feed on the onboard view with less grain, a flight HUD with a velocity vector, a horizon, speed and altitude tapes, the HUD text burned in as in Railgun.

- [x] Bar v3: the shell spec, opted in with signal: true; How to play rows in help
- [x] Haze discs on every rotor, upper and lower
- [x] Keys (W S A D, arrows, I J K L, Shift for fine) and a gamepad (two sticks, Mode 2)
- [x] Rotor sound: a blade tone per rotor, air wash, downwash rumble, distance, pan, Doppler; muted by default
- [x] Gimbal view as the onboard feed through the NVG tube: fine grain, no dead spots
- [x] Flight HUD: heading tape, horizon and ladder, velocity vector, speed and altitude tapes, burned in
- [x] Telemetry panel, rotor map and stage text removed (Bar v3: nothing written on the stage)
- [x] A crash returns to the pad after 3 s
- [x] Downwash: dust and grass flung out under the craft, ripples in the grass, the windsock blown by a close craft
- [x] HUD marks white, still engraved (Tom, 14:13)
- [ ] Model and graphics, from the reference photos
- [ ] Refine the dusk field
- [ ] Obstacle course inside the field (design to Tom first)

Known: on Windows D3D11 the tube shaders log X4000 notes once; they come from nvg/tube.js.


## Scope ahead (Tom, 2026-11-17 14:21)

Tom: "this toy will probably become an XXXXXL too". Four parts to come, each its own piece of work:

- [ ] Power washing: the craft cleans surfaces with a spray
- [ ] Surveying: fly a site and map it
- [ ] Military intelligence: reconnaissance with the onboard feed
- [ ] Warehouse logistics: carry and deliver loads

Not designed yet. Each part gets a design talk with Tom before a line of code.
Round 3 asks (14:16): the HUD responds as in real flight; the Gimbal view costs too much; the downwash takes a cloud texture; the model waits.

- [x] Gimbal feed rebuilt light: one render and one pass (ACES, mono, fine grain, wide lens, sharpening); about 11 times faster than the NVG tube, no D3D notes
- [x] HUD as in flight: a three-axis gimbal with lag, stops and motor buzz; horizon and ladder fixed to the world; a waterline at the nose; filtered values; trend bars on both tapes; the picture tears and fades on a crash
- [x] Downwash clouds: billowing puffs that grow, turn and drift
- [x] Pressed grass as noise blown outward, not rings (Tom, 14:26); no wash at idle, none on the pad or a roof


## Name: Zena (Tom, 2026-11-17 14:31)

Tom: "it is a brand name exception for now -- may rename". The toy is Zena; its id and folder stay drone.
Rule 11 and its copies (AGENTS.md, PRODUCT.md, DESIGN.md, docs/standards/code.md) list Zena as an exception for now.
The vault decision note waits for adjudant; this bean holds Tom's words.
