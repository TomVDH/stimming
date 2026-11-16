---
# stimming-h35c
title: 'Toy: Lantern lake'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-16T21:08:16Z
updated_at: 2026-11-16T22:25:57Z
parent: stimming-oh7b
---

Idea 60 in docs/toy-ideas.md, group C. Tom picked it on 2026-11-16.

Tap to release paper lanterns over a still lake; they rise and reflect.

Rough size: M (a guess; no plan yet).

- [ ] Blockout, signed off by Tom
- [x] Development plan in docs/plans/lanterns.md (Tom took the defaults for D1 to D3, 2026-11-16)
- [ ] Build in the Lab
- [ ] QA at 1280 px and 375 px
- [ ] Tom's sign-off

## Progress

- [x] Task 1: the lake at dusk (sky, far shore of hills and pines with six warm windows, a far ridge, calm water, low mist). Stills at Dusk, Blue hour and Night, 1280 and 375 px, console clean.

Rulings in Task 1:
- The page is `index.html` plus `main.js`, as Fog horn is.
- The hour choice is on the bar now, for the stills; the rest of the bar waits for Task 5.
- Chop is 0.05, not 0.08: 0.08 broke the mirror too much.
- On a tall frame the lens widens by the square root of the aspect, and the horizon lifts only 0.04: a wider lens left half the frame black.
- The loop sleeps 60 s after the last input. The 30 fps cap while drifting waits for Task 5.

Tom, 2026-11-16: no head-on view (Train ride, Ten seconds and Fireworks have one). He picked the view from the hill above.
- The eye stands 5 m over a wooded hill, about 60 m over the lake, and looks down.
- The lake is a bowl about 1.4 km long. The land is a raymarched heightfield: low hills that level off near 110 m, slender tiered pines in stands, a smooth canopy far off.
- A lane down the slope keeps the lake clear; pines frame it at the sides.
- The mirror marches the same land, softened by the ripples. The windows are streaks in it.
- The plan's flat `shore(x)` is gone; `coast(p)` and `ground(p)` take its place.
- Open: the march is 128 steps a pixel. Task 5 checks the frame rate on High.

Tom, 2026-11-16: more angles to compare. `?cam=<name>` picks a trial camera: hill (the default), wide, fish, dutch, tele, scope (2.39 letterbox), shore, along, drone. The march now strides over open water, and the pine grid turns 31 degrees, so the far bank shows no fence.

Tom picked `tele` as the camera (2026-11-16): the long lens on the far bank from the hill. A tall frame turns 6 degrees right, so the lit windows stay in it. The other trials stay behind `?cam=`.
