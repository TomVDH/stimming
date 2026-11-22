---
# stimming-2s2a
title: 'Toy: Water wheel'
status: in-progress
type: feature
created_at: 2026-11-17T22:10:21Z
updated_at: 2026-11-17T22:10:21Z
parent: stimming-oh7b
---

Idea 73 in docs/toy-ideas.md, group E. Tom picked it on 2026-11-17.

Pour water; it runs through sluices and turns a chain of wheels.

Size: S to M (Tom's limit, 2026-11-17). docs/toy-plan.md rates it L and high risk, because of particle water against moving wheels. The plan must cut the scope to fit M.

Defaults (chosen in this chat, stated for Tom): flat side elevation, a section through the race; raw WebGL2 (Shader type); three overshot wheels in a cascade, large to small; low evening sun behind the scene; hold to pour at the pointer. Plan: docs/plans/waterwheel.md.

- [x] Development plan in docs/plans/waterwheel.md (cut to M)
- [x] Blockout on the stage, screenshot at 1280 x 800
- [x] Particles, floors, buckets, wheel dynamics
- [x] Shading: wheels, water, spray, bloom, grade
- [x] Sound: splash, gurgle, creak; muted by default
- [x] Bar v3 spec
- [x] Icon round spike-waterwheel-1 (Current, A, D), sheet GALLERY row
- [x] Emblems a and d; intro emblem shared/emblems/waterwheel.svg; favicon
- [x] toys.json entry and Lab li with GSAP hook
- [x] QA Q1 to Q10 at 1280 px and 375 px
- [x] Toy doc docs/toys/waterwheel.md
- [ ] Commit and push
- [ ] Tom's sign-off

## Notes

- Blockout: docs/qa/waterwheel/01-blockout-1280.jpg. Hero captures: 02 to 09 in the same folder.
- Q10: 16.7 ms mean, 16.7 ms p95 during a pour (headless Chromium, ANGLE GL, Tom's PC). Tom checks on a real screen.
- Settle: the toy sleeps about 35 s after a long pour stops; the loop then does no work.
- Icons: no pick in icons/picks.json, so A of spike waterwheel-1 is on the menu.
- Open for Tom: 3D or flat (flat by default), the Dutch name (draft Waterrad), the icon pick.
