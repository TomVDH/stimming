---
# stimming-4wnw
title: 'Toy: Volcano'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-17T22:10:22Z
updated_at: 2026-11-22T13:05:57Z
parent: stimming-oh7b
---

Idea 365 in docs/toy-ideas.md, group C. Tom added it on 2026-11-17 as a high fidelity toy.

A volcano erupts. The interaction is open.

Its own toy, apart from Lava coast (99).

Size: XXXXXL. A three.js parade piece at Railgun scale. Tom, 2026-11-17. Not in the S to M batch.

## Defaults chosen (batch 3)

3D, three.js 0.170. Blue hour, facing the afterglow. One Vulcanian blast that opens into a short fountain: bombs, ash column lit from below, lightning. Hold to build pressure, release to erupt; a longer hold makes a bigger blast. Slider: Wind. Full reasons in docs/plans/volcano.md.

- [x] Development plan in docs/plans/volcano.md
- [x] Blockout on the stage, 1280 x 800 capture
- [x] Sim: pressure, bombs, fountain, ash column, lightning, pressure ring
- [x] Render: sky, cone, haze, streaks, puffs, bloom, grade
- [x] Sound: tremor, delayed boom, roar, thunder, landings
- [x] Bar v3: Erupt (Space, hold), Wind slider
- [x] Icon round volcano-1, emblems, intro emblem
- [x] Lab tile and hook, toys.json entry
- [x] QA Q1 to Q10 at 1280 px and 375 px
- [x] docs/toys/volcano.md
- [ ] Blockout, signed off by Tom
- [x] Stage 2: Java range from a village, raymarched summit collar and deck, plume on Fire's fluid and shading
- [ ] Tom's sign-off

## QA (2026-11-22)

Headless Chromium 1.64 with `--use-angle=gl` on the dev PC. Captures in docs/qa/volcano/.

| Check | Result |
|---|---|
| Q1 node --check, toy modules and menu scripts | Pass |
| Q2 console, toy and ?lab with tile hover | Clean (the favicon 404 is gone once shared/favicons/volcano.png is in) |
| Q3 1280 x 800, 375 x 812, 812 x 375 | Captured |
| Q4 idle | 0 frames in 2 s at 62 s after the last input |
| Q5 hidden | 0 frames in 2 s |
| Q6 reduced motion | 0 frames at rest; Space still erupts, softer, no shake |
| Q7 controls | 2 controls (Erupt, Wind); 4 how rows |
| Q8 keys | Space hold builds and erupts |
| Q9 sound | Context runs after the gesture, suspended at the end |
| Q10 frame rate | 60 fps through a full eruption at 1280 x 800 (SwiftShader not used; real GPU via ANGLE GL) |

Stage 2 (2026-11-23): console clean; 60 fps through hold, blast and tail at 1280 x 800; idle 0 frames in 3 s at 64 s; hidden 0 frames; reduced motion 0 frames at rest. Captures 14 to 19.

