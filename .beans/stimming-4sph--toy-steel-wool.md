---
# stimming-4sph
title: 'Toy: Steel wool'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-15T08:59:04Z
updated_at: 2026-11-15T09:41:20Z
---

Idea 160 (Group A, school and uni lab experiments): "Touch a battery to it; sparks crawl through. Blow to brighten."

A tangle of fine steel wool in the dark. A tap is the battery contact. Glowing fronts crawl along the fibres, branch, race and die, and leave dark oxide behind. Hold to blow: the glow flares, the fronts speed up and sparks lift off. Reset gives a fresh pad.

Tier: raw WebGL2. Strands are triangle strips read from point textures; the burn runs on the CPU as fronts along the strands; a pad-space heat map gives the temper colour; sparks run on the CPU; bloom is the shared chain in shared/glow.js.

## Checklist
- [x] Fibre tangle: strands walk a flow field; strips drawn from point textures
- [x] Burn: fronts walk the strands and jump at contacts; battery contact and blow
- [x] Look: hot wire glow, temper tint, oxide, bloom, grade
- [x] Sparks: spawn at burning points, forks, gravity, blow
- [x] Bar v2: Grade choice, Blow (held), Reset, Settings, Dev rows, key strip
- [x] Sound: contact crackle, burn fizz, breath (checked by nodes and a running context, not by ear)
- [x] Idle: the loop stops when nothing glows; whenVisible; detail level; slow-frame step
- [x] Reduced motion
- [x] Intro fallback text and vignette
- [x] QA: console, gestures, controls, sound, 1280, 375 x 812, 812 x 375
- [x] Toy doc: docs/toys/steelwool.md
- [x] Handoff: toys-entry.json, menu-li.html, menu-icon.js

## Summary of Changes

- `steelwool/index.html`: a new Lab toy on Bar v2, raw WebGL2. A seeded wad of 300 to 900 crimped, curled strands (one strip each, read from point textures). The burn runs on the CPU: fronts walk the strands, jump at contacts after a delay, and die at random; breath speeds them, makes them catch and revives glowing points.
- Look: silver wire with glints; hot iron glow with a soft skirt; dull oxide that thins and crumbles; temper colours from a pad-space peak-heat map; sparks that cool, fall and fork; shared bloom (soft knee), grade and film curve.
- Sound: a fizz bed, crackles, a contact zap, the breath and a roar under it, fork pops, a thump for a fresh pad.
- Bar: Grade (Fine, Medium, Coarse), Blow (held, Space), Reset (R); Settings: Sparks and Quality; Dev: seven tuning rows.
- `docs/toys/steelwool.md`: the toy doc.
- Handoff for the menu (in the batch scratchpad): `toys-entry.json`, `menu-li.html`, `menu-icon.js`.
- Open: the sound is not checked by ear; the phone frame rate is not measured.
