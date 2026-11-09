---
# stimming-5qae
title: 'Toy: Wind map'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-09T07:10:55Z
updated_at: 2026-11-09T07:40:02Z
---

Build Wind map from docs/plans/windmap.md. It starts in the Lab. Particles trace a wind field; circle a finger to spin up a cyclone; two cyclones orbit and merge.

- [x] Task 1: K1 lift, state textures, update pass, base field, texture-fed segments
- [x] Task 1: graticule, composite, one seed cyclone on the first frame
- [x] Task 1: Q1, Q2, stills at 1280 and 375 px
- [x] Task 1: checkpoint: Tom signs off the blockout stills
- [x] Task 2: vortices, inflow, dynamics, merge, spin-up gesture, gust
- [x] Task 2: two same-sign storms 0.2 apart orbit, then merge at 9.5 s (stills at 0, 2, 4, 7, 10 s)
- [x] Task 3: Silk, Heat, Dye; isobars; CPU fallback
- [ ] Task 4: sound: bed, howl, gust, merge
- [ ] Task 5: bar, Settings, persistence; Q1 to Q10
- [x] toys.json entry and menu Lab entry with an icon and a GSAP hook
- [ ] Tom sets the Dutch name and motto (draft: Windkaart)
- [ ] Record the session cost

## Notes

- One world unit spans the short side of the stage, not the height. Portrait recomposes: the cyclone and the graticule keep their size relative to the width.
- Drawn particles scale with stage area (full count at 1250 by 680 CSS px), so line spacing holds on a phone.
- Each particle has a fixed random brightness: a few bright threads over many faint ones. Without it, 13 overlapping trails per pixel read as grey haze.
- A still particle draws nothing, so stagnant air stays dark.
- Heat and Dye render but are not tuned yet (Task 3).

- Task 2 QA ran in the browser pane, not Playwright (Tom's rule). The page loads in memory with a manual frame pump, so sim time is exact while the pane is hidden.
- Storms steer at 0.35 of the base flow, plus beta drift poleward and west. A storm at the centre stays on screen for about 30 s.
- Same-sign pairs within 0.4 pull in at 0.05 of their induced speed; the pair motion runs in 10 ms RK2 steps, since explicit 50 ms steps fling close pairs apart.
- An eye pass fades the plate fast inside each core, so a moving eye stays clear.
- Dipole: opposite storms 0.15 apart sail off in a straight line, gap held. A 13th storm fades the weakest over 0.6 s.

- Task 3: the plate curve works on the brightest channel, so Heat and Dye keep their hue; very bright light bleeds a little toward white. Silk is unchanged.
- Dye particles live 6 to 14 s (others 2 to 6 s); life now sits below 16 in the state texel, spawn hue above it.
- Isobars: contours of the same stream function every 0.008, faded where they crowd. Storms use a Kaufmann core for the stream function.
- CPU fallback (no EXT_color_buffer_float): 4,000 / 6,000 / 8,000 particles over a 128 by 72 base-wind grid rebuilt every 0.5 s; storms and gusts add exactly per particle. Tested by masking the extension: no console errors, 2.8 ms per frame.
