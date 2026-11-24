---
# stimming-7pgt
title: 'Toy: Fruit slice (was Kiwi)'
status: in-progress
type: feature
created_at: 2026-11-23T18:43:35Z
updated_at: 2026-11-23T18:43:35Z
parent: stimming-oh7b
---

Build Kiwi as a Lab toy: a toony kiwi lit with the rendering ideas of raspberry.luruke.com, reworked as our own code (Tom, 2026-11-23). MVP at high fidelity, Bar v3. Toy id kiwi. Grab and squish it; the fuzz ruffles. Swipe across it and it slices in two; the cut face is rays of emerald juice beads round a cream core, with a ring of black seeds. Plan: docs/plans/fruit.md. Toy doc: docs/toys/fruit.md. Renamed Fruit slice (id fruit) once it held ten fruits.

- [x] Plan at docs/plans/kiwi.md
- [x] Reference photos of the real thing
- [x] Blockout on the stage, screenshot at 1280 x 800
- [x] Juice beads: Beer-Lambert light through each bead
- [x] Fuzz: instanced ribbons with wrap light, velvet sheen
- [x] Toon light, squash and stretch, slice
- [x] Finish: depth of field, bloom, ACES, vignette, grain, quality
- [x] Sound: muted by default
- [x] Bar v3 spec and copy
- [x] Icon round spike-kiwi-1 (Current, A, D), emblems, sheet row
- [x] Intro emblem, favicon, toys.json entry, Lab tile with GSAP hook
- [x] QA, docs/toys/kiwi.md
- [x] Rename to Fruit slice (id fruit); fruit registry, Fruit choice, roll-off swap
- [x] Pomegranate, blood orange, peach
- [x] Realism pass 1: studio reflections, wet cut faces, specks, pores; bead chord sign fixed
- [x] Dragon fruit, rambutan, mangosteen, passion fruit, starfruit, fig
- [ ] Raspberry-grade procedural pass, one fruit at a time (Tom's order)
  - [x] Pomegranate (QA 16)
  - [x] Kiwi (QA 17)
  - [x] Passion fruit (QA 18)
  - [x] Blood orange (QA 19 to 22)
  - [x] Dragon fruit (QA 23)
  - [x] Peach (QA 28)
  - [x] Rambutan (QA 29)
  - [x] Mangosteen (QA 30)
  - [x] Starfruit (QA 31)
  - [ ] Fig
- [x] Floor contact for every fruit and half; no seams on whole fruit
- [x] Halves jiggle, squish and drip juice on their own
- [x] Backlit subsurface scattering (drag the background to swing the light)
- [x] Juice puddle: drops pool, spread, hold an edge, mirror the fruit (QA 25)
- [x] Wedges: swipe a half or wedge to split it lengthwise along the swipe (QA 26)
- [x] Loose seeds: flick a piece or press F; bits bounce, roll and rest (QA 27)
- [ ] Menu icon for Fruit slice (the tile still shows the kiwi of round kiwi-1)
- [ ] Tom sets the Dutch name
- [ ] Tom hears the sound
- [ ] Tom picks an icon (round kiwi-1)

Stack type: Scene, three.js 0.170 with custom shader materials.

## Defaults chosen

- One kiwi, 3D, a fixed eye that steps back as the halves open. A dark ground, far lamps as bokeh.
- Raspberry ideas reworked: per-bead Beer-Lambert juice beads, fuzz ribbons with fibre wrap light, velvet sheen, lens finish. Baked SH light skipped (needs an offline bake).
- ACES, not AgX: AgX lifted the dark ground to grey.
- Bar v3: Slice (Space), Squeeze (S, hold), slider Fuzz.

## QA

- 1280 x 800, 375 x 812, 812 x 375: docs/qa/kiwi/.
- D3D11 RTX 3070 headless Edge: median 7.7 ms, p95 8.1 ms (Standard); High 7.6 ms; drifting 32 fps; asleep 0 frames after 62 s; reduced motion 0 idle frames.
- Console clean at load and in play.
