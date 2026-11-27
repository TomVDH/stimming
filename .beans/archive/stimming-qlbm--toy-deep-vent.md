---
# stimming-qlbm
title: 'Deep vent: Lab toy, a black smoker lit only by the lure light'
status: completed
type: feature
created_at: 2026-11-16T21:08:16Z
updated_at: 2026-11-27T07:19:52Z
parent: stimming-oh7b
---

Idea 19 in docs/toy-ideas.md, group C. Tom picked it on 2026-11-16.
Black water, falling marine snow, a hydrothermal vent. The pointer is a lure light.
Plan: docs/plans/deepvent.md. Toy id `deepvent`. Batch 1 of the 14 Lab builds.

## Defaults chosen (Tom's open question)

- 3D, fixed camera. One raw WebGL2 shader raymarches the chimney, the floor and the plume.
  Why: the reveal is light that wraps a form. Only 3D gives the knobs, the shadows and the falloff.
- No life at the vent. Rock, minerals, smoke and snow only.
  Why: the Look rule cuts props, and the MVP has one hero: the dark opens under the hand.
- Stack type: Shader (raw WebGL2 on shared/gl.js).

## Checklist

- [x] Read the house rules and reference photos of black smokers
- [x] Plan in docs/plans/deepvent.md
- [x] Blockout on the stage, screenshot 1280 x 800
- [x] Hero: lure light, chimney, plume, marine snow, backscatter
- [x] Sound, muted by default
- [x] Bar v3 spec
- [x] Icon: Tom's pick A of spike vent-1 on the menu; sheet GALLERY row
- [x] Intro emblem shared/emblems/deepvent.svg; toys.json emblem
- [x] Lab entry: toys.json, menu li and GSAP hook
- [x] QA Q1 to Q10
- [x] docs/toys/deepvent.md
- [x] Commit and push (0c145793, 875cbc6b)
- [ ] Tom's sign-off

## Notes

- Icon: Tom had already picked A of `icons/spike-vent-1.html` (2026-11-16), so no new round was drawn. The picks key moves from `vent` to `deepvent`, the toy id. The emblem is that round's `vent-a.svg`, copied to `shared/emblems/deepvent.svg`.
- Blockout: `docs/qa/deepvent/blockout-1280.jpg`. Hero: `hero-1280.jpg`, `plume-1280.jpg`, `flash-1280.jpg`, `phone-375.png`.
- Q10, 2026-11-22: median frame 16.7 ms, p90 16.7 ms at 1280 x 800 while the lure sweeps (headless Chromium, ANGLE GL, Tom's PC). Tom checks a phone.
- Draft Dutch name for Tom: Diepzeebron /ˈdipseːˌbrɔn/.
