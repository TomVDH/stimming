---
# stimming-2ddv
title: 'Toy: Calving'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-16T19:44:51Z
updated_at: 2026-11-22T14:27:54Z
parent: stimming-oh7b
---

Build Calving from docs/plans/calving.md (idea 57, tool-approved). Size XXXL. It starts in the Lab. A cinematic fjord: a glacier face cracks, a tower of ice falls, and the surge rolls across the water toward the camera.

## Defaults chosen (batch 4, MVP)

Tom's open question was "3D or flat, and the presentation". Answer: 3D, three.js 0.170, a long lens from a boat low on the water, 760 m from the face. A low sun behind the glacier and to the left; the face stands in its own shade and its crests glow. A dark headland on the left, the face on the right two thirds, a snow range behind, a black-green mirror of water with brash ice.

Not the shared environment runner: the fall needs moving geometry (blocks, chips, floes), and one big fragment shader links badly on D3D11. Nothing in shared/ changed; the reasons are in the plan.

Press starts a crack at once; release lets the tower go; a hold (up to 2.4 s) makes it wider and full height. Drag pans. Space calves in view. Slider: Lens. Sound late by distance (343 m/s); surge 33 m/s, about 23 s to the camera, where the boat lifts and rocks.

- [x] Plan updated: as-built architecture, Bar v3 section, later work marked
- [x] Task 1: blockout of the shot (docs/qa/calving/01-blockout-1280.jpg)
- [ ] Task 1: checkpoint with Tom
- [x] Task 2: the fall: crack along the grooves, carve, lean, blocks, splash, drops, base roll, mist
- [x] Task 3: the surge: travelling wave and foam, brash and bergs ride it, camera rock
- [x] Task 4 (MVP part): one time of day, haze, high cloud, translucent crests
- [ ] Task 4 (later): time of day choice, aurora, weather, subsurface glow, wall shadows, flare
- [x] Task 5: sound, Bar v3, QA at 1280, 375 x 812 and 812 x 375
- [ ] Task 5 (later): Dev rows for the look knobs
- [x] toys.json entry, menu Lab entry from A of spike calving-1 (Tom's pick) with its GSAP hook, sheet row
- [x] Intro emblem shared/emblems/calving.svg, favicon
- [x] docs/toys/calving.md
- [ ] Tom sets the Dutch name (draft: Kalven)
- [ ] Record the session cost

## QA (2026-11-22)

Headless Chromium 1.64 with `--use-angle=gl` on the dev PC (real GPU). Captures in docs/qa/calving/.

| Check | Result |
|---|---|
| Q1 node --check, toy modules and menu scripts | Pass |
| Q2 console, toy and ?lab with tile hover | Clean |
| Q3 1280 x 800, 375 x 812, 812 x 375, one per hero moment | Captured (01 to 13) |
| Q4 idle | 30 fps while drifting; 0 frames in 2 s at 62 s after the last input |
| Q5 hidden | 0 frames in 2 s |
| Q6 reduced motion | 0 frames at rest; a click still calves; no camera rock, fewer puffs |
| Q7 controls | 2 controls (Calve, Lens); 4 how-to rows |
| Q8 keys | Space tap and Space hold each calve |
| Q9 sound | Context runs after the gesture, suspended at the end |
| Q10 frame rate | 1280 x 800 through a big calving: median 16.6 ms, p95 17.7 ms, max 18.8 ms (60 fps) |
