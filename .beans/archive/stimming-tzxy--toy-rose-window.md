---
# stimming-tzxy
title: 'Toy: Rose window'
status: completed
type: feature
created_at: 2026-11-23T11:36:53Z
updated_at: 2026-11-27T07:19:52Z
parent: stimming-oh7b
---

Build Rose window (idea 226, group F, quiet to use and rich to look at) as a Lab toy: an MVP at high fidelity, Bar v3. A stone Gothic nave with a great rose window; scrub the sun across the day and the coloured light crawls over the floor, the pier bases and up the stone through floating dust. Plan: docs/plans/rosewindow.md.

- [x] Plan at docs/plans/rosewindow.md
- [x] Reference photos of rose windows and their light on stone
- [x] Blockout on the stage, screenshot at 1280 x 800
- [x] Hero: scrub the sun; shafts swing, patches crawl over the floor, the pier bases and up the stone, stretch long and warm toward evening and fade; the window glows and dims
- [x] Dust motes in the shafts
- [x] Sound: finished, muted by default
- [x] Bar v3 spec and copy
- [x] Icon round spike-rosewindow-1 (Current, A, D), emblems, sheet row
- [x] Intro emblem, toys.json entry, Lab tile with GSAP hook
- [x] QA Q1 to Q10, docs/toys/rosewindow.md
- [x] Commit and push
- [ ] Tom's sign-off
- [ ] Tom sets the Dutch name
- [ ] Record the session cost

## Notes

- Defaults (chosen in this chat, stated for Tom): 3D, raw WebGL2 (Scene type without three.js). A south transept: the eye in the west gallery, 9 m up, a little left of the axis, 36 m from the rose; two arcades of round piers run toward the end wall. Why 3D: the light crosses depth, from the glass through the dust to the floor and up the piers; a flat view loses the shafts. Why the gallery: from the floor the patches foreshorten to slivers.
- The sun: `shared/daytime.js` as is (not edited); the toy narrows its swing to 55 percent (a winter-like arc), so the light stays in the nave all day: right arcade in the morning, the floor at noon, the left piers and arcade toward evening.
- Resting hour: the real local time while the sun is up; 15:30 at night. Now (N) returns to the clock.
- Rendering: the stone marches once per size into a G-buffer; a 512 light map (glass colour times the reveal clip and the tracery's slanted shadow, plus depth to the first stone) runs when the sun moves; each frame only lights, marches 36 haze steps at half size, adds 6000 motes, bloom and grade.
- References: Notre-Dame de Paris, south rose (Wikimedia Commons): a quatrefoil centre, two tiers of radiating lancets, roundels between the heads, a pale stone frame. Light on stone: soft coloured blobs, the tracery legible near the wall.
- Blockout: docs/qa/rosewindow/01-blockout-1280.jpg. Captures: docs/qa/rosewindow/.
- Icons: no pick in icons/picks.json, so A of spike rosewindow-1 is on the menu. The intro emblem is A's emblem. The favicon shared/favicons/rosewindow.png comes from the menu tile.
- Open for Tom: 3D or flat (3D by default), the gallery eye, the narrowed sun swing, the Dutch name (draft Roosvenster), the icon pick.
- QA (headless Edge, D3D11, RTX 3070): Q1 node --check on the four modules and the menu scripts; Q2 clean console on the toy and the menu with the tile hovered; Q4 drifting 31.5 rAF a second, none once asleep; Q5 none while hidden; Q6 reduced motion settles to no frames, the Day run steps by quarter hours; Q7 three controls (Day, Now, Sun), four How to play rows; Q8 arrows, Space, N each work; Q9 the context runs after a gesture and is suspended at the end.
- Q10: 7.6 ms median frame through a Day run at 1280 x 800 (light map rebuilt each frame). First frame 0.78 s cold.

- Commits on origin/main: 8f977f23 (toy, toys.json hunk, plan, toy doc, QA captures, intro emblem, favicon, bean), 99af0f18 (menu Lab tile and hook, icon round rosewindow-1, emblems, sheet row).
