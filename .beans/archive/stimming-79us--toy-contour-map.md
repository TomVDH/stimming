---
# stimming-79us
title: 'Toy: Contour map'
status: completed
type: feature
created_at: 2026-11-23T00:30:02Z
updated_at: 2026-11-27T07:19:52Z
parent: stimming-oh7b
---

Build Contour map (idea 52, group B) as a Lab toy: an MVP at high fidelity, Bar v3. A topographic map sheet: press and hold to raise a hill under the pointer, drag to raise a ridge, dig with the right button, Alt or the Dig pick. Hypsometric tints, contour lines with every fifth an index line, labelled heights, soft hill shading; the sea floods in where land drops below zero. Plan: docs/plans/contour.md.

Stack type: Shader (raw WebGL2 on shared/gl.js). The height grid lives on the CPU; the GPU draws the sheet.

- [x] Plan at docs/plans/contour.md
- [x] Blockout on the stage, screenshot at 1280 x 800 (docs/qa/contour/01-blockout.jpg)
- [x] Hero moment: raise, ridge, dig; lines flow and split; the sea floods in; labels follow their lines
- [x] Sound, muted by default
- [x] Bar v3 spec and copy
- [x] Icon round spike-contour-1 (Current, A, D), emblems, sheet row
- [x] Intro emblem, favicon, toys.json entry, Lab tile with GSAP hook
- [x] QA Q1 to Q10, docs/toys/contour.md
- [ ] Tom sets the Dutch name
- [x] Record the session cost: not readable from the session (the usage tool gives plan limits only); Tom records it

## Defaults chosen (Tom's open questions: 3D or flat, and the presentation)

- Flat, top down: a survey sheet in the Swiss manner. A contour map is a plan view; hill shading gives the relief. A tilted 3D camera hides the lines on the far slopes.
- Hypsometric tints from pale blue shallows and deep blue sea through green, yellow-green and tan to pale peaks. Hill shading from the north-west, warm on lit slopes, cool blue-grey in shade.
- Brown contours every 20 m; every fifth, 100 m, an index line, bolder, with its height on it in a gap cut in the line. Tops face uphill unless that turns them past upright.
- The sea floods in from the sheet's edges at about 70 cells a second, with a pale front. A basin dug inland stays dry until a channel joins it to the sea. Water-lines follow the coast; faint depth lines every 50 m.
- The sheet covers the stage; the edges fall into the dark stage. The first land is seed 77: a range, a lowland, a bay and an island.
- Hold raises 300 m a second at the brush's centre, eased in and out; a drag also lays 6 m per cell it covers, so a swept ridge rises. A rock grain makes raised land uneven.
- Dig: the right button, Alt held, or the Dig pick. New (N) morphs a new seeded land in over 1.5 s. Slider Brush: the hill's width.
- Sound: a knock on press, an earth rumble with the rate, a pencil tick per contour under the brush (pitched by height, index lines an octave lower), splash and bubbles at the waterline, a wash with the flood front, a paper slide for New.

## QA (headless Chromium, --use-angle=gl, RTX 3070, Tom's PC)

- Q1: node --check passes on the five modules and the menu script.
- Q2: clean console in play (hold, ridge drag, right-drag, Alt drag, Dig pick, slider, New, keys) and on the menu with the tile hovered.
- Q3: captures at 1280 x 800 and at 375 x 812 (docs/qa/contour/).
- Q4: 0 rAF calls in 2 s after the toy settles. No ambient motion.
- Q5: hidden: 0 rAF calls in 2 s, with a press held down.
- Q6: reduced motion: clean console, the flood fills at once, 0 rAF calls after it settles.
- Q7: one choice (2 options), one slider, one action; 4 How to play rows.
- Q8: R picks Raise, D picks Dig, N makes a new land.
- Q9: the context runs during play and is suspended 2.6 s after it settles. Output RMS 0.05 to 0.13, peaks under 0.36.
- Q10: frame time median 16.7 ms, p95 16.7 ms during hold, ridge and flood (vsync bound on this GPU).
