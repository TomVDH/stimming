---
# stimming-hfd6
title: 'Toy: Hook and loop'
status: in-progress
type: feature
created_at: 2026-11-22T19:18:14Z
updated_at: 2026-11-22T19:18:14Z
parent: stimming-oh7b
---

Build Hook and loop (idea 62, group D, a fidget) as a Lab toy: an MVP at high fidelity, Bar v3. The working name avoids the brand name (hard rule 11). Rip a strap open slowly or fast; the crackle follows your speed. Press it shut to seal it again. Plan: docs/plans/hookloop.md.

- [x] Plan at docs/plans/hookloop.md
- [x] Reference photos of real hook-and-loop tape (hooks, loops, the peel line)
- [x] Blockout on the stage, screenshot at 1280 x 800
- [x] Hero moment: peel with the pointer; fibres stretch and spring at the peel line; press shut to seal
- [x] Sound: crackle whose density and pitch follow speed; seal; muted by default
- [x] Bar v3 spec and copy
- [x] Icon round spike-hookloop-1 (Current, A, D), emblems, sheet row
- [x] Intro emblem, toys.json entry, Lab tile with GSAP hook
- [x] QA Q1 to Q10, docs/toys/hookloop.md
- [x] Commit and push
- [ ] Tom's sign-off
- [ ] Tom sets the Dutch name
- [ ] Record the session cost

## Notes

- Defaults (chosen in this chat, stated for Tom): 3D, three.js 0.170 (Scene type), a macro close-up in a low three-quarter view. A red hook tape on a warm off-white loop tape, on a near-black desk under one low warm key from the back left; shallow focus on the peel line. Why: the toy is the peel line, and it needs depth: the flap lifts, shades the pile, and loops stretch across the gap. A flat strip (Zipper's way) shows none of that. Red hooks and white loops are the palette of a real photomicrograph; a black strap would vanish on the dark stage.
- Gesture: drag the tab to peel; a press anywhere else is a thumb that seals. Space rips the whole strap; Enter seals it. Slider: Grip (worn to new).
- Reference photos: Wikimedia Commons, Category "Details of hook-and-loop fasteners" (hooks side-on, loops, a photomicrograph of red hooks holding white loops, a strap on a sleeping bag).
- Blockout: docs/qa/hookloop/01-blockout-1280.jpg. Hero captures: 02 to 14 in the same folder.
- Q10: 7.9 ms mean, 8.5 ms p95 through a pointer peel (headless Chromium, ANGLE D3D11, Tom's PC). ANGLE GL refused new WebGL contexts during this run while other batch sessions held the GPU. Tom checks on a real screen.
- Sound: offline render in the batch notes folder (hookloop-sounds.wav): slow peel, seal, fast rip.
- Icons: no pick in icons/picks.json, so A of spike hookloop-1 is on the menu. The intro emblem is A's emblem at 128. The favicon shared/favicons/hookloop.png comes from the menu tile.
- Open for Tom: 3D or flat (3D by default), the strap colours, the Dutch name (draft Klittenband), the icon pick.
