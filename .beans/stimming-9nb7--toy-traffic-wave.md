---
# stimming-9nb7
title: 'Toy: Traffic wave'
status: in-progress
type: feature
created_at: 2026-11-23T10:26:20Z
updated_at: 2026-11-23T10:26:20Z
parent: stimming-oh7b
---

Build Traffic wave (idea 93, group B, a data and maths toy) as a Lab toy: an MVP at high fidelity, Bar v3. Cars circle a ring road, as in the real ring-road experiment (22 cars on a 230 m circle). Tap a car to brake; the cars behind bunch up into a jam that slides backward against the traffic and lingers long after the first car has moved on. Brake lights glow in the jam; a space-time strip draws the backward stripe as it happens. Plan: docs/plans/traffic.md.

Stack type: Shader (raw WebGL2 on shared/gl.js). The car-following model (IDM) runs on the CPU; the GPU draws the ring and the strip.

- [x] Plan at docs/plans/traffic.md
- [x] Reference: the real experiment's footage and space-time plots
- [x] Blockout on the stage, screenshot at 1280 x 800
- [x] Hero: smooth flow; tap brakes a car; the jam slides backward and lingers; brake lights glow; the strip draws the stripe
- [x] Sound: finished, muted by default
- [x] Bar v3 spec and copy
- [x] Icon round spike-traffic-1 (Current, A, D), emblems, sheet row
- [x] Intro emblem, favicon, toys.json entry, Lab tile with GSAP hook
- [x] QA Q1 to Q10, docs/toys/traffic.md
- [x] Commit and push
- [x] Tom's round 1: twin headlight cones; own stopping gap and reaction time per driver
- [ ] Tom's sign-off
- [ ] Tom sets the Dutch name
- [ ] Record the session cost

## Defaults chosen (Tom's open questions: 3D or flat, and the presentation)

- Flat, top down, at night: a high camera over a lot, as in the 2008 footage. The circle stays a true circle, so the place on the ring reads as an angle. Kept apart from Lit motorway: a high view of one ring and one wave, not a drive.
- Light carries it: one flood mast off the top left (the key), a cool moon fill, twin headlight cones along each heading, tail lights, and brake lights that flare and pool red in the jam. The car ahead blocks its follower's beam and lights up on its boot.
- The strip sits beside the ring on a wide stage, under it on a phone. Now is the edge next to the ring. Paths: blue-white in flow, amber when slow, red under brakes; a deep red field where cars crawl; a white ring at each tap.
- Model: IDM, v0 14 m/s, T 0.6 s, s0 1.3 m, a 2.2 m/s², b 1.6 m/s². Each driver has an own stopping gap (0.7 to 1.9 m) and reaction time (0.25 to 0.75 s). At 22 cars a tap leaves a jam that slows cars for about 75 s, keeps brake lights flickering about 105 s, and runs backward at about 25 km/h. Past about 25 cars the ring jams by itself.
- Bar v3: Brake (Space), Even out (E), slider Cars 12 to 30. Tap a car to brake; hold to keep it stopped.
- Sound: engine drone and tyre roar with the mean speed; a soft tyre scrub per brake light coming on, panned, so the ripple is heard; a squeal and thump on a tap; a swell for Even out.
- Icons: no pick. A = the ring as a glossy slab at a tilt, seven chunky cars, three to four in a jam with red glow; D = the ring on an iso block. On hover a queue model runs: cars stop at the back of the jam and leave its front a moment after the car ahead, so the jam slides backward.
- Draft Dutch name: Spookfile (the Dutch word for a phantom jam).

## QA (headless Edge, D3D11, RTX 3070, Tom's PC)

- Q1: node --check passes on the four modules and the menu script.
- Q2: clean console in play (tap, hold, Space, E, slider) and on the menu with the tile hovered.
- Q3: captures at 1280 x 800 and 375 x 812 in docs/qa/traffic/ (01 to 12; 11 and 12 show the icons).
- Q4: smooth flow draws at 32 rAF/s or fewer; asleep 63 s after input: 0 rAF calls in 2 s.
- Q5: hidden: 0 rAF calls in 2 s.
- Q6: reduced motion: 0 rAF calls before a gesture; a tap answers; clean console.
- Q7: two actions and one slider; four How to play rows.
- Q8: Space brakes the car at the start line; E evens the cars out.
- Q9: the context runs in play and is suspended after the toy sleeps. Output RMS 0.04 to 0.055, peaks under 0.21.
- Q10: frame time median 7.6 ms, p95 8.4 ms during the jam (headless Edge, no vsync cap).

