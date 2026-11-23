---
# stimming-l8sg
title: 'Toy: Desire paths'
status: in-progress
type: feature
created_at: 2026-11-23T10:25:18Z
updated_at: 2026-11-23T10:25:18Z
parent: stimming-oh7b
---

Build Desire paths (idea 14, group B, a data toy) as a Lab toy: an MVP at high fidelity, Bar v3. The pointer wears trails into a park lawn over the session: blades bend and spring back after light use, repeated passes flatten them, yellow them, then wear through to bare compacted earth. The shortcuts the hand prefers become desire paths that cut the corners of the planned paths. Plan: docs/plans/desirepaths.md.

- [x] Plan at docs/plans/desirepaths.md
- [x] Reference photos of real desire paths (Wikimedia Commons, Category:Desire paths: Toulouse corner cut, Deurne olifantenpaadjes, ANU lines)
- [x] Blockout on the stage, screenshot at 1280 x 800 (docs/qa/desirepaths/01-blockout.jpg)
- [x] Hero: wear field, bend and spring back, flatten, yellow, bare earth, slow recovery
- [x] Sound: muted by default, finished
- [x] Bar v3 spec and copy
- [x] Icon round spike-desirepaths-1 (Current, A, D), emblems, sheet row
- [x] Intro emblem, favicon, toys.json entry, Lab tile with GSAP hook
- [x] QA Q1 to Q10, docs/toys/desirepaths.md
- [ ] Tom sets the Dutch name
- [ ] Record the session cost

Stack type: Shader (raw WebGL2 on shared/gl.js, bloom from shared/glow.js): a wear field sim and a full-screen lawn shade, four small programs.

## Defaults chosen (Tom's open questions: 3D or flat, and the presentation)

- Flat: a plan view, straight down, no camera motion. Why: a desire path is a line on a plan, the planner's right angles against the feet's diagonal; from above the pointer stands on the spot it wears, one to one. A high oblique squeezes the far paths into a few pixels.
- 7.5 m of lawn tall on a wide stage (12 m across at 16:10), 5.4 m wide on a phone; a tall stage slides onto the crossing.
- Two paths of pale concrete flags, 1.8 m wide, cross at right angles. The lawn is mown in 0.9 m stripes (the same physics as trampling: the lean changes the sheen).
- Morning sun from the upper left, 24 degrees up; slow cloud shadows. The turf casts its shadow into a worn trough and onto the flags.
- The first frame shows an old line already worn across the main corner.
- The pointer is a walker: a print each stride, left and right. One pass bends the grass (springs back in about 5 s); about 10 passes flatten it; about 70 yellow it; about 170 wear it to bare earth. Heals over minutes of awake time.
- Bar: Mow (M), Footfall slider 0.25 to 4 (default 1). Hover walks, drag sends a crowd, tap stands.

## QA (2026-11-23)

- Q1 node --check: five modules and the six menu scripts pass (also HEAD plus only this bean's hunks).
- Q2 console clean on the toy (hover walk, drag, tap, M, slider), at 1280 x 800, 375 x 812 and 812 x 375, under reduced motion, on the icon round and on the Lab hover.
- Q3 captures: docs/qa/desirepaths/ (01 blockout to 09 Lab tile hover).
- Q4 drift 25.5 frames a second; 0 frames 62 s after the last input. Q5 hidden: 0 frames in 2 s.
- Q6 reduced motion: prints bend and spring back; 0 frames once settled.
- Q7 one action (Mow), one slider (Footfall); three How rows. Q8 M mows.
- Q9 context running after the gesture, suspended at the end.
- Q10 Edge headless on D3D11, RTX 3070, during a hover walk at 1280 x 800: frame median 7.6 ms, p95 8.4 ms (the headless frame cap; no rung stepped down).
