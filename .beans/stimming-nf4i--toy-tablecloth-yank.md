---
# stimming-nf4i
title: 'Toy: Tablecloth yank'
status: in-progress
type: feature
created_at: 2026-11-23T10:25:12Z
updated_at: 2026-11-23T10:25:12Z
parent: stimming-oh7b
---

Build Tablecloth yank (idea 112, group E, a physics loop) as a Lab toy: an MVP at high fidelity, Bar v3. Yank the cloth from under a set table; a fast pull leaves the setting standing, a slow pull drags it off. Plan: docs/plans/tablecloth.md.

- [x] Plan at docs/plans/tablecloth.md
- [x] Reference videos of the real trick and its failures
- [x] Blockout on the stage, screenshot at 1280 x 800
- [x] Hero: grab the hem and pull; a fast yank whips the cloth out, the setting shivers and stays; a slow pull drags it off the edge to shatter
- [x] Reset sets the table again
- [x] Sound: finished, muted by default
- [x] Bar v3 spec and copy
- [x] Icon round spike-tablecloth-1 (Current, A, D), emblems, sheet row
- [x] Intro emblem, toys.json entry, Lab tile with GSAP hook
- [x] QA Q1 to Q10, docs/toys/tablecloth.md
- [ ] Commit and push
- [ ] Tom's sign-off
- [ ] Tom sets the Dutch name
- [ ] Record the session cost

## Notes

- Defaults (chosen in this chat, stated for Tom): 3D, three.js 0.170 (Scene type). A fixed camera at the table's pull-end corner, above and back, looking along the table, with the floor in front of the pull end in frame for the crash. A dining room at night under one warm pendant lamp, a lit candle on the table. Why 3D: the cloth whips toward the viewer, the setting shivers in depth, pieces fall off the end onto the boards; a flat view loses the fall and the drape.
- Setting: a walnut table 1.4 x 0.85 m, a white satin damask cloth 2.1 x 1.5 m, two places (dinner plate, knife, fork, wine glass with red wine, tumbler with water) and a brass candlestick with a lit candle. 11 pieces.
- Physics: own Verlet cloth (48 x 34, 120 Hz, structural, shear and bend links, a tether over the table's edges, a deeper table block so the hem cannot slip under the top) and own rigid bodies after Wrecking ball (sphere sets, 240 Hz, friction and torsion solved once at the contact centroid, a pose sleep test). Friction under the cloth takes the cloth's velocity, so speed decides: 5 m/s and up all stand; 3 m/s drops about three pieces; 2 m/s and under clears the table. No library added.
- References: University of Maryland lecture demo "Tablecloth" (lecdem.physics.umd.edu), Rutgers demo 1F20.30 "Tablecloth and Dishes". A slow pull carries the setting by friction; a fast pull keeps the time under the cloth short; pull down over the edge.
- Blockout: docs/qa/tablecloth/01-blockout-1280.jpg. Hero captures: 02 to 09 in the same folder; icons 10.
- Q10: 10.1 ms mean frame through a Space yank (headless Edge, D3D11, RTX 3070). Sim step about 2 ms. Tom checks on a real screen.
- Icons: no pick in icons/picks.json, so A of spike tablecloth-1 is on the menu. The intro emblem is A's emblem. The favicon shared/favicons/tablecloth.png comes from the menu tile.
- Open for Tom: 3D or flat (3D by default), a closer shot, the Dutch name (draft Tafelkleedtruc), the icon pick.

