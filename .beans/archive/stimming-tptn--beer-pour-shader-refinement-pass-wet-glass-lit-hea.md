---
# stimming-tptn
title: 'Beer pour: shader refinement pass (wet glass, lit head, lens bubbles, finish, sound)'
status: completed
type: task
priority: normal
created_at: 2026-11-23T21:12:36Z
updated_at: 2026-11-23T22:19:35Z
parent: stimming-fvs3
---


Tom, 2026-11-23: "we'd like to spin up the beer pour toy and really refine and bring about all new shader improvements there". Plan: docs/plans/beer.md, Refinement pass. Toy doc: docs/toys/beer.md.

- [x] Read standards, plans and beer/; baseline capture (docs/qa/beer/r00-before.jpg)
- [x] Wet glass from shared/glassrain.js and shared/wetglass.js: fog, beads, runs below the cold beer
- [x] Head: K3 lighting (cloudbottle template), round bubbles on the glass; lacing rings after sips
- [x] Bubbles as gas lenses; beaded jet
- [x] Finish: ouAces, gdHash grain, flBuoy lamp flare
- [x] Sound (beer/sound.js), muted by default
- [x] QA at 1280, 375 x 812, 812 x 375, reduced motion; idle sleep; console clean
- [x] Toy doc docs/toys/beer.md; plan section
- [x] Tom's look at the captures; pushed (Tom: "Yes, push it")
- [x] Tom's answer on brand names and trade dress: "Keep the names"

## Summary of Changes

Wet glass (shared glassrain and wetglass), K3-lit head with round bubble cells, lacing rings, lens bubbles, beaded jet, shared finish with a lamp flare, and sound. Pushed as 15249776. Tom keeps the real beer names. The Lab icon is a thin placeholder: for the icon pass, outside this bean.
