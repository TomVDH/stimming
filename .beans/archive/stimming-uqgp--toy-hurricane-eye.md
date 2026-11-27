---
# stimming-uqgp
title: 'Toy: Hurricane eye'
status: completed
type: feature
created_at: 2026-11-23T09:40:13Z
updated_at: 2026-11-27T07:19:52Z
parent: stimming-oh7b
---

Idea 368 in docs/toy-ideas.md, group C, size XXXL. Tom's pick, 2026-11-23: fly a weather plane through the eyewall, then the eye opens. Plan: docs/plans/hurricane.md (Tom approved 2026-11-23, defaults: cockpit, punch into the eye, Category slider, midday). Tier: raw WebGL2 (Environment).

- [x] Plan in docs/plans/hurricane.md
- [x] Blockout: stadium, sea, cockpit frame; screenshot (docs/qa/hurricane/01-blockout.jpg)
- [x] The wall run: march inside the wall, rain, drops and wipers, jolts, lightning
- [x] The break and the eye: light, hush, bank
- [x] Sound; Bar v3; frame loop; reduced motion; ladder
- [x] Icon round hurricane-1 (A and D emblems, GALLERY row), intro emblem shared/emblems/hurricane.svg
- [x] toys.json entry, Lab li with its GSAP hook
- [x] QA Q1 to Q10; docs/toys/hurricane.md
- [ ] Tom looks at the MVP in the Lab

## QA (2026-11-23, Edge headless on D3D11, RTX 3070)

| | Result |
|---|---|
| Q1 | node --check passes on every toy module and every menu script |
| Q2 | Clean console: Punch, drag, arrows, Space, Category 2 and 5 |
| Q3 | docs/qa/hurricane/: 02-wall, 03-break, 04-eye, 05-stadium at 1280 x 800; 06-eye-375 |
| Q4 | 32 frames a second while drifting in the eye; 0 frames after 60 s idle |
| Q5 | 0 frames in 2 s while hidden |
| Q6 | Clean; no shake; the plane holds 9 s after the break, then 0 frames |
| Q7 | Two controls (Punch, Category); three how-to rows |
| Q8 | Drag and arrows turn the head; Space restarts the run |
| Q9 | AudioContext running after the gesture, suspended after sleep |
| Q10 | Frame time in the wall: median 6.1 ms, 95th percentile 6.2 ms at 1280 x 800; six programs link in about 1 to 4 s |

D3D11 compile per program (tools/fxc, d3dcompiler_47, level1, 2026-11-23): march 0.8 s; world 0.2 s; drops 0.2 s; cockpit 0.2 s; blur, final and bloom under 0.1 s.
