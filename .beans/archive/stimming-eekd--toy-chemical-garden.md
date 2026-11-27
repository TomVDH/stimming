---
# stimming-eekd
title: 'Toy: Chemical garden'
status: completed
type: feature
priority: normal
created_at: 2026-11-17T22:10:21Z
updated_at: 2026-11-27T07:19:52Z
parent: stimming-oh7b
---

Idea 124 in docs/toy-ideas.md, group A. Tom picked it on 2026-11-17.

Drop salts in the tank; coloured stalks grow upward.

Size: M. Stack type: Scene (three.js 0.170), a 3D tank. Tom, 2026-11-17.

Plan: `docs/plans/chemgarden.md`. Batch 2 of the Lab toy runs (MVP at high fidelity, Bar v3, icons).

## Defaults chosen (Tom's open question: 3D or flat, and the presentation)

- 3D, three.js 0.170, as Tom set. One glass tank in a dark room, seen almost square on.
- A soft lamp stands behind the tank, so the towers glow in their colour where light comes through.
- The hand drops seeds from above: click puts one crystal in at that point; drag sprinkles a line.
- Four salts, each its own colour: Copper (blue), Cobalt (violet), Nickel (green), Iron (rust).
- The first frame shows a garden of eight towers that already grew. Clear empties the tank for your own.
- Bar v3: Salt choice (1 to 4), Scatter (Space), Clear (C), Strength slider. No pick in icons/picks.json, so the menu uses A.

## Checklist

- [x] Read house rules, references; reference photos of real gardens
- [x] Plan in docs/plans/chemgarden.md
- [x] Blockout screenshot at 1280 x 800
- [x] Hero: drop, land, bulb, burst, tube grows, wobbles, branches, tip bursts
- [x] Look: back light through glass and towers, bloom, grade
- [x] Sound, muted by default
- [x] Bar v3 spec
- [x] Icon round spike-chemgarden-1 (Current, A, D), sheet row, emblems a and d
- [x] Intro emblem shared/emblems/chemgarden.svg, favicon
- [x] toys.json entry, Lab li and GSAP hook
- [x] QA Q1 to Q10, frame times
- [x] Toy doc docs/toys/chemgarden.md
- [x] Commits pushed
- [ ] Tom's look at the blockout and the build
- [ ] Tom sets the Dutch name and IPA (draft given)
- [ ] Tom's sign-off

## QA (2026-11-22, headless Chromium, ANGLE GL, dev PC)

- Q1: node --check passes on main.js, scene.js, garden.js, sound.js and the menu script. Model tests: 6 of 6 pass.
- Q2, Q6: console clean on the toy, in reduced motion, and on the menu with the Lab tile hovered.
- Q3: captures in docs/qa/chemgarden/ (blockout, first frame, drop to tower, 375, 812 x 375, reduced motion, Lab tile and intro).
- Q4: 0 rAF calls in 2 s after load and after growth settles; no drifting state.
- Q5: 0 frames in 2 s with the page hidden.
- Q7: four controls (Salt, Scatter, Clear, Strength); four How to play rows.
- Q8: keys 1 to 4, Space and C act from the stage.
- Q9: the context runs after a drop and is suspended once the tower settles.
- Q10: 60 fps while one tower grows; 60 fps, worst frame 16.8 ms, with 29 towers growing (2,121 capsules).
