---
# stimming-ec87
title: 'Toy: Cloud in a bottle'
status: in-progress
type: feature
created_at: 2026-11-22T20:12:49Z
updated_at: 2026-11-22T20:12:49Z
parent: stimming-oh7b
---

Build Cloud in a bottle (idea 129, group A) as a Lab toy: an MVP at high fidelity, Bar v3. A clear glass jug on a dark bench holds a little water; a rubber stopper seals it, and a hose runs to a rubber squeeze bulb on the bench. Squeeze the bulb to pump the pressure up: the stopper strains. Pull the stopper, or pump past the limit: it pops, the air cools at once and a white fog fills the jug, lit by a side light. Squeeze again: the stopper goes home and the fog clears. Plan: docs/plans/cloudbottle.md.

- [x] Plan at docs/plans/cloudbottle.md
- [x] Reference photos of the real demonstration
- [x] Blockout on the stage, screenshot at 1280 x 800 (docs/qa/cloudbottle/01-blockout.jpg)
- [x] Hero moment: pump, pop, the fog snaps in and swirls; pump clears it
- [x] Sound: squeeze wheeze, stopper creak, pop, hiss; muted by default
- [x] Bar v3 spec and copy
- [x] Icon round spike-cloudbottle-1 (Current, A, D), emblems, sheet row
- [x] Intro emblem, favicon, toys.json entry, Lab tile with GSAP hook
- [x] QA Q1 to Q10, docs/toys/cloudbottle.md
- [x] Fire's fluid ported to raw WebGL2 (fluid.js), Tom's yes 2026-11-23; QA rerun
- [ ] Tom sets the Dutch name
- [ ] Record the session cost

Stack type: Shader-like, raw WebGL2 (shared/gl.js, bloom from shared/glow.js, grade from shared/grade.js). No shared module changed.

## Defaults chosen (Tom's open questions: 3D or flat, and the presentation)

- 3D, a fixed camera a little above the jug, so the fog reads as a volume that fills the round jug and the water shows as an ellipse.
- The vessel: a round glass jug with a short neck, as in the lecture demonstration. Glass gives crisp edge light that frames the fog.
- The pump: a rubber squeeze bulb on the bench, on an amber hose to the stopper. Each squeeze is visible; no gauge, no prop. The stopper creeps and creaks with the pressure.
- Release: drag the stopper up, Enter, or pump past 0.55 to 0.65 bar and it pops by itself. The hose tethers it; it lands loose on the mouth; the next squeeze sends it home.
- Light: a black room, one cool key from the back left (the fog scatters forward and glows), a faint warm strip at the right for glass edges. Black epoxy bench.
- Fog: Fire's smoke shading (Tom, mid-build: "fire toy smoke shader -- always"), on a tiling 3D noise turned and warped round the axis. It forms in about 0.2 s, nuclei first, and puffs a wisp out of the mouth.
- Bar v3: Pump (Space), Release (Enter), Smoke slider (nuclei, default 70).
- Icon: no pick existed. Round cloudbottle-1 (Current, A, D); A is on the menu; the intro emblem is A's emblem.
- Draft Dutch name: Wolk in een fles /ʋɔlk ɪn ən ˈflɛs/. Accent oklch(0.86 0.03 230).

## Reference

University of Iowa lecture demonstration (a 5-gallon glass jug, stopper, hose to a floor pump, black backdrop); a kitchen jar with a match whiff (milky, near-uniform fog, a wisp out of the mouth).

## QA (headless Chromium, --use-angle=gl, Tom's PC)

- Q1: node --check passes on the four modules, the menu scripts and the icon page.
- Q2: clean console in play, on the menu with the tile hovered, and on the icon page.
- Q4: drift about 22 rAF per second; 62 s after the last input, 0 frames in 2 s.
- Q5: hidden tab, 0 frames in 2 s.
- Q6: reduced motion: no swirl or wisp; the loop sleeps.
- Q7: Bar v3 holds Pump, Release and the Smoke slider (3 controls); How to play has 4 rows.
- Q8: Space pumps, Enter pops.
- Q9: the context runs after a gesture and is suspended once the toy sleeps.
- Q10: frame times through a pop: median 16.7 ms, p95 16.7 ms.
- Captures: docs/qa/cloudbottle/.
