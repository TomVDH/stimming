---
# stimming-d6wc
title: 'Railgun: one depth-aware cloud pass (cloud layer and redone storms)'
status: in-progress
type: task
priority: normal
created_at: 2026-11-17T06:20:46Z
updated_at: 2026-11-17T07:53:20Z
parent: stimming-626s
---

Tom, 2026-11-16: clouds do not occlude or layer on one another; the storm clouds need a redo (shapes, better graphics, slow drift); the cloud layer must sit flat in true perspective. Start fresh after the TypeScript refactor (Tom: nothing ported from the parked patch; docs/plans/railgun-cloud-layer.patch and docs/plans/railgun-cumulus.js stay as reference).

Plan: docs/plans/railgun-cloud-layer.md

- [ ] Plan approved by Tom
- [x] Step 1: one march, the heap shell only, with per-pixel depth; built (clouds/pass.ts, clouds/layer.glsl, Dev row Cloud volumes), waits for Tom's look
- [x] Step 2: the storms move into the same march; segments join front to back by distance; storm cards hide (Tom: "Yes, commit it")
- [x] Step 3: storm redo: shapes and look (clouds/field.ts, cell.glsl, cellmarch.glsl; Tom: "Yes, commit", 2026-11-17)
- [ ] Step 4: drift for layer and storms
- [ ] Step 5: blast, bolt, rock and lightning light
- [ ] Step 6: Tom approves; cards retire

## Hybrid (Tom, 23:36: "the cards worked because they are sharper -- middle ground / hybrid"; picked: card shapes, volume depth)

- Heap and middle layers are crisp cards again, on a flat grid (cloudField), facing the view axis, ended by view depth; card rim light and dark backlit cores
- The pass marches the storms only (uLayerOn 0; the marched heap layer stays as a knob)
- Silhouette knobs for the march: __qa.passLook({ res, edge, firm, blur, layer }); surface bisect on entry

## Step 3 build (2026-11-17)

- clouds/field.ts: one storm field. A cell list (place, core radius, top, age, kind, wind) gives the shapes, the bounds and the lightning spots.
- clouds/cell.glsl, clouds/cellmarch.glsl: Window seat's tower march in km, anvils 35 to 70 km downwind, billows at the railgun's 2.2 strength.
- Kinds: towering cumulus, storm with anvil, dying storm; a squall line is four cells in a row.
- Placed for the camera: wide and phone frames, off the low sun's path (a backlit dying anvil on purpose), tops over the foothills.
- Drift: each cell swings 5 km along its own wind over 40 min.
- Stills: docs/qa/railgun-clouds/step3/. Waits for Tom's look.
- [x] Tom approves the step 3 look
- [x] Commit (look-approved)

## Round 2 (2026-11-17, Tom: "better layering a little closer to POV", "more aggressive rim light for the card clouds", "toggle raymarched and card clouds")

- Storm depth tiers: 28, 34, 50, 70, 115, 120, 165 km; near towers at the frame edges, clear of the rock.
- Card edge rim: Dev sliders Card rim and Rim spread (default 0, look unchanged); stills at 2/1 and 2.5/1 in docs/qa/railgun-clouds/rim/.
- Dev toggle Marched heaps: with Cloud volumes on, the heap layer marches in place of the heap cards.
- [ ] Tom picks the rim strength and default

- Card light default 0.55 (Tom: "tone cards down"); Dev group Cards: Card light, Card sky, Card shade, Card core, Card colour, Card rim, Rim spread (Tom: "manual control sliders for the card").

## Round 3 (2026-11-17, Tom's list at 00:17)

- [x] Night: the pass's storms take the rock's light at its true reach (ROCK_REACH 1, cards keep 4); the rock's fill falls off with distance.
- [x] Lightning: two bursts in five run along the anvil with a wide sheet glow (squall shelves and long anvils flash).
- [x] Spread storms better; raise them slightly (bases 2 km, tops +1.5 km; Tom: "Yes, go on").
- [x] Card clouds hide less of the asteroid: heaps in front of the rock thin away (Dev Clear rock, 0.8).
- [x] Reorganise the Dev menu: Tests, Ambient, Sound, Clouds, Storms, Cards, Sun and air, Land, Gun, Lens, Grade, Performance; Cloud volumes is now Marched storms.
- [ ] Out of scope, to place: gun glitch flash (yellow squiggle on the back block); the rock's glow casting the gun's shadow at night.

- [x] Gun squiggle (Tom, "while charging", "raymarch glitch"): the cloud pass composite read depth 0 on edge texels with no cloud, so the blurred cloud edge drew at the eye, over the gun. The composite now takes the farthest of its five depth taps.
