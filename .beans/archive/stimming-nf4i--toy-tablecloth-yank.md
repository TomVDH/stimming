---
# stimming-nf4i
title: 'Toy: Tablecloth yank'
status: completed
type: feature
created_at: 2026-11-23T10:25:12Z
updated_at: 2026-11-27T07:19:52Z
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
- [x] Commit and push (9eab8ab6, e2b0b261)
- [ ] Pass 2, in Tom's words: "improve the look of the models and the assets, incl no collision clipping on the fabric sim; when the candle falls, things light up in fire (fire toy shaders)"
  - [x] Cloth: no table corner through the cloth; pieces stay on the cloth's face
  - [x] Models and materials: table, cutlery, candle, cloth, room
  - [x] A fallen candle sets the cloth alight; the fire spreads and burns holes
  - [x] Fire and smoke drawn with Fire's method (K3 port to three.js 0.170 WebGL2)
  - [x] Fire sound; reset puts the fire out
  - [x] QA captures and doc update
- [x] Pass 3, in Tom's words: "arrange camera better, a bit better quality in fabric, also pbr and shade this properly"
  - [x] Side three-quarter camera that drifts toward the action
  - [x] Cloth grid 56 x 40; damask, creases and weave in the linen
  - [x] Bump normals on oak, walnut and linen; transmission glass; GTAO
  - [x] QA captures 18 to 23 and doc update
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
- Pass 2 (2026-11-23): captures 11 to 17. Embers: a fallen flame alone lit the cloth in half the runs, as the candle often lands past the hem; a spray of burning wax as it lands lights it in 10 of 10 slow drags. Fire costs 7.8 ms mean a frame with over 900 particles burning (headless Edge, RTX 3070). The yank outcomes moved: 6 m/s all stand, 4 m/s all stand, 3 m/s one or two fall, 2 m/s about five fall.
- Tom, 2026-11-23: flames more orange (done: the hot ramp stops turn toward orange); the blaze size and the fire under reduced motion stay as built.
- Pass 3 (2026-11-23): 17.8 ms mean frame through a yank, 13 ms in a full fire (headless Edge, RTX 3070), up from 10.6 and 7.8; GTAO drops at the first quality step. The flick gain went from 1.5 to 2, as the side view maps a mouse flick to a slower pull. The fast yank still leaves all 11 pieces standing.
