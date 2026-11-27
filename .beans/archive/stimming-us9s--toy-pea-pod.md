---
# stimming-us9s
title: 'Toy: Pea pod'
status: completed
type: feature
created_at: 2026-11-22T13:03:46Z
updated_at: 2026-11-27T07:19:52Z
parent: stimming-oh7b
---

Idea 67 in docs/toy-ideas.md, group D. Batch 3 of the Lab toy run (Tom: MVP at high fidelity, icons for the lab and intro, bar v3).

Squeeze a pod; it splits along its seam, and the peas pop out and roll.

Defaults (chosen in this chat, stated for Tom): 3D, three.js 0.170 (Scene type). One pod lies on a dark table under a low warm key light, seen from a high three-quarter view. Press and hold on the stage to squeeze; the dent follows the pointer along the pod. The seam gives, the two valves fall open like a book, and the peas spring out to both sides and roll. A new pod comes in by a pan along the table. Plan: docs/plans/peapod.md.

- [x] Development plan in docs/plans/peapod.md
- [x] Blockout on the stage, screenshot at 1280 x 800
- [x] Pod shell, peas, table, light, shadows
- [x] Squeeze, swell, seam crack, open, pea launch, roll, settle
- [x] New pod: pan along the table
- [x] Sound: creak, snap, pea hits, roll; muted by default
- [x] Bar v3 spec
- [x] Icon round spike-peapod-1 (Current, A, D), sheet GALLERY row
- [x] Emblems a and d; intro emblem shared/emblems/peapod.svg; favicon
- [x] toys.json entry and Lab li with GSAP hook
- [x] QA Q1 to Q10 at 1280 px and 375 px
- [x] Toy doc docs/toys/peapod.md
- [x] Commit and push (toy, then menu)
- [ ] Tom's sign-off

## Notes

- Blockout: docs/qa/peapod/01-blockout-1280.jpg and 02-blockout-snap-1280.jpg. Hero captures: 03 to 15 in the same folder.
- Q10: 16.7 ms mean, 16.8 ms p95 through the snap (headless Chromium, ANGLE GL, Tom's PC). Tom checks on a real screen.
- Settle: about 2 s after the snap the peas sleep; 1.8 s later the view pans to the next pod; then the loop stops.
- K4 is not used. A cloth shell from the kit needs shape matching to hold a pod form, and its snap would depend on solver passes. Each pod number is a damped spring instead.
- Icons: no pick in icons/picks.json, so A of spike peapod-1 is on the menu.
- Open for Tom: 3D or flat (3D by default), the Dutch name (draft Peul), the icon pick.
