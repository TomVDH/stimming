---
# stimming-kzm6
title: 'Toy: Chocolate tempering'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-09T09:17:15Z
updated_at: 2026-11-09T09:51:57Z
parent: stimming-oh7b
---

Build Chocolate tempering from docs/plans/chocolate.md. It starts in the Lab, on Bar v2. Spread and fold molten chocolate on a cold Belgian black marble slab; hit the form V window (31 to 32 °C for dark) and it sets with a mirror gloss and a clean snap; miss it and it sets dull with grey fat bloom and crumbles.

- [x] Plan: docs/plans/chocolate.md written and committed
- [x] Task 1: blockout built and pushed (marble, height-field chocolate, studio reflection, flow, scraper, crystal kinetics, thermal halo)
- [x] Task 1: checkpoint with Tom on the stills at 1280 and 375 px (signed off 2026-11-09)
- [x] Task 2: the set: gloss, sparkles, bloom streaks, contraction
- [x] Task 3: snap test, pour ribbon, heat shimmer
- [x] Task 4: sound
- [ ] Task 5: Settings, ladder, sleep, Q1 to Q10
- [x] toys.json entry and menu Lab entry with an interactive GSAP hook
- [ ] Tom sets the Dutch name (draft: Chocolade tempereren)
- [ ] Record the session cost

## Blockout notes (2026-11-09)

- Sim checks in a probe: mass holds through scraping (4958 before and after). A forced temper path (27 °C with shear, 31.5 °C, then free cooling) sets as 99.7 % form V. Straight cooling sets as 96 % unstable forms with full bloom.
- The blade acts as a flow wall while it is down, so the roll cannot slump back into the lane.
- 375 px grid is 160 x 347 cells (plan said about 120 x 260): the short side holds 160 cells at any width over 160 px.
- Not yet: tap snap (taps make a dimple on liquid), sound, glint tuning, contraction rim, pour ribbon coil look. All in Tasks 2 to 4.

## Sound notes (2026-11-09)

- Raw Web Audio on the kit context, no Tone.js: scrape and pour loops, slap on lift, clean crack or thud and crumbs on a tap, faint crystal ticks.
- Q9 in a probe: the context runs after a gesture, the scrape voice follows the blade, and the context suspends at rest. The stored sound key was restored. Levels are not heard by ear yet.
