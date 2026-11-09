---
# stimming-5qae
title: 'Toy: Wind map'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-09T07:10:55Z
updated_at: 2026-11-09T07:24:26Z
---

Build Wind map from docs/plans/windmap.md. It starts in the Lab. Particles trace a wind field; circle a finger to spin up a cyclone; two cyclones orbit and merge.

- [x] Task 1: K1 lift, state textures, update pass, base field, texture-fed segments
- [x] Task 1: graticule, composite, one seed cyclone on the first frame
- [x] Task 1: Q1, Q2, stills at 1280 and 375 px
- [ ] Task 1: checkpoint: Tom signs off the blockout stills
- [ ] Task 2: vortices, inflow, dynamics, merge, spin-up gesture, gust
- [ ] Task 3: Silk, Heat, Dye; isobars; CPU fallback
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
