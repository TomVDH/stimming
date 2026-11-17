---
# stimming-fx4g
title: 'Railgun: storm volumes take blast, bolt and rock light; flat cloud layers'
status: in-progress
type: bug
priority: normal
created_at: 2026-11-17T03:11:43Z
updated_at: 2026-11-17T05:59:13Z
parent: stimming-626s
---

Tom (2026-11-16 20:04): "rail gun storm volumes are not responsive to light of projectile impact explosion or the asteroid as it comes close -- mid layer clouds seem to arc convex from horizon up -- we made regressions on the world space when it comes down to the clouds -- imagine a set of flat cloud layers over the scene".

Plan: /Users/tomlinson/.claude/plans/rail-gun-storm-volumes-purrfect-raccoon.md

- [x] Step 1: storm volumes take the blast, the bolt and the rock (light only); committed; Tom: "Yes, commit it"
- [x] Step 2 (Tom, 20:16): true mountain heights, much smaller far clouds, real depth layering (scale option A); built (storm tops 10 to 18 km, crests 2.6 to 9 km), waits for Tom's look
- [ ] Step 2: flat cloud layers in place of the 9 degree ring; built (15 low heaps 8 to 30 km at 1.8 km, 17 mids 14 to 55 km at 4.8 km), waits for Tom's look
- [ ] The rock's trail draws under every cloud and effect (Tom, 21:38: it is astronomically high); the blast's debris trails and ribbons stay in front of the soot ball (Tom, 21:40); built, waits for Tom's look
- [ ] Step 3: the cirrus as a flat shell on the planet's curve
- [ ] Step 4: check the supercell's hard edge with the bounds probe
- [ ] Tom approves each step's stills

## Queued asks (Tom, 2026-11-16, 21:41 to 21:44)

- [ ] Cloud layers slide slowly as whole layers (Tom picked: whole layer slides); goes into the raymarched layer
- [ ] Card clouds: rim light, darker cores and masses
- [ ] Storm redo: where they stand (a seeded spread), their shapes, their look and light
- [ ] Rework the sun's god rays

## 22:10 state (uncommitted)

- Flat layers back as light cards (16 low, 16 mid), near cards fade by view depth: no ring
- Card rim light from a march-style scatter term (t exp(-t), forward lobe); backlit cores dark
- Haze: Air dust 1.6, dust height 4 km
- Trail under every cloud; blast debris and ribbons over the soot ball
- __qa.cloudsQ() for labelled shots

## Cloud volumes, step 1 (22:25, uncommitted)

- railgun/cumulus.js: one raymarched shell of heaps (1.6 to 3.9 km), after Window seat's deck; cover, dome cells, billows, Beer with a slow tail, powder, two-lobe phase; slides with the wind
- Half resolution; rays stop at the baked ranges' distance; composite sits 2.5 km out so the gun stays in front
- Dev row Cloud volumes (off by default) hides the heap and middle cards; __qa.cumulus(on, cover)
- Card faces turn to the view axis; layers end by view depth
- To do: grain on edges, cover default, golden-hour look, cost (about +15 ms best case, noisy)

## Parked (2026-11-16 22:58) for the TypeScript refactor (stimming-h9ve)

- railgun/index.html changes: docs/plans/railgun-cloud-layer.patch (355 lines; applies to 46938765's successor HEAD)
- cumulus.js: docs/plans/railgun-cumulus.js; becomes src/clouds/cumulus.ts
- Port into src/ after the refactor merges; then one depth-aware cloud pass (layer and storms) gets its own bean in clouds/
