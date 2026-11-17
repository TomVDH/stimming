---
# stimming-626s
title: 'Railgun: clouds, haze and layering for scale'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-16T19:00:19Z
updated_at: 2026-11-17T00:40:32Z
---

Tom: "the clouds (the 3d ish cards) as well as atmospheric haze, distance haze and layering to evoke SCALE".

- [x] Before stills: night, dawn, dusk, gold, day at 1280 and 375
- [x] Prototype directions behind ?sky= and show Tom (A air layers, B cell deck, C giants; Tom: all three, one stage at a time)
- [x] Stage 1, air layers: far clouds sink into the haze by distance, fog pools in far valleys; Dev rows Far haze and Valley fog
- [x] Tom: see the mountains better, less hidden by clouds: far heaps lifted clear of the crests, the band at the ranges' feet removed, valley fog halved
- [x] Tom signed off stage 1 (2026-11-16: "looks good now")
- [x] Stage 2: the cell deck 5.2 km up, in the sky dome; it replaces the middle heaps; Dev row Cloud deck; frame cost within noise (28-29 ms headless at 1280 either way)
- [x] The deck reacts: blast flash, shock rim, heave, void hole, bolt and rock light, trail and soot shade
- [ ] Tom signs off stage 2
- [ ] Stage 3: the giants and near heaps (C)
- [ ] Build the picked direction
- [ ] Frame time held on Standard; clean console
- [ ] After stills; Tom signs off

## Distance bands and names (2026-11-16)

- [x] Inventory with a screenshot per element: docs/qa/railgun-inventory/index.html
- [x] Names: docs/plans/railgun-volumes.md
- [x] BAND table replaces every bare renderOrder; Mids past 48 km draw in the Far band, behind the rock
- [ ] Split sparks into near and rock; flares by distance (other sessions own them)
- [x] Deck tweaks: less swirl after a hit, softer cells, stronger hit light
- [x] Tom: fainter, wispier, "not so much sheep clouds": the wind combs the Deck into wisps three times longer than wide; it is a thinner veil
- [x] Tom: fainter, softer; then the Giants (Deck accepted)
- [x] Stage 3: the Giants, three colossal storms 195 to 225 km out, 75 to 95 km tall; BAND.giants; Dev row Giants
- [x] Tom rejected the storm-cell Giants ("look awful", "our cards were better"): reverted to the tower cards (4b3ce769)
- [x] Tall cards slanted at the frame edges: the cards now stand along the camera's up
- [x] Tom: "not varied and realistic, too many": one Giant, three Towers, each tower its own build
- [x] Storm lightning inside the Towers and the Giant, after Window seat; Dev row Storm lightning
- [x] Lightning rumbles: bluer, brighter, clustered spots
- [x] Storm probe: Window seat's storm volumes marched inside the cards, Dev toggle, off by default (+2.4 ms at 1280)
- [ ] Tom: probe or cards? Then sign off the storms

## Storm lab (2026-11-16)

- [x] Clouds lit blue by the bolt: cloud bolt light is warm white; storm lightning is Window seat's FLASH_C, added after the air
- [x] storms.js: the table, noise, shapes and march, shared by the toy and the lab
- [x] Five forms: storm tower, towering cumulus, squall line, dying storm, supercell
- [x] railgun/stormlab.html (noindex): gun or orbit view, time of day, look knobs, per-storm edits, Flash, Copy config
- [ ] Tom tunes the storms in the lab and signs off

## Scale decision (Tom, 2026-11-16 16:38)

Tom picked option A of the cloud plan: "A: Earth-true weather". Storm tops 12 to 18 km, crests 3 to 9 km, and the rock first seen high and far, above the anvils. Plan: docs/plans/railgun-clouds-review.md, sections 5 and 8.

## Step 3, scale A (2026-11-16)

- [x] railgun/stormcells.js: Window seat's storm cell at true km (setTower, towerShape, billows with mips, light taps, ice-anvil fray, decay), six kinds, own wind each; stormGeom() gives the card, the bound and the shape.
- [x] railgun/celllab.html: the lab, over the ranges (option A or today), Window seat's noise3d.
- [x] Placement: Tom kept today's ranges, so storms stand 44 to 88 km out, in front of the main range; anvils run across the view; narrower feet. Lab stills sent to Tom.
- [ ] Tom's look verdict on the lab stills.
- [ ] Port to the toy host (card from stormGeom), clouds-check or look-approved, push.
- [ ] Fix storms.js line 9 (the wrong range heights).

- [x] 2026-11-16 17:40: storm cards back as the default (Storm volumes off), Deck off so the cirrus streaks are the upper layer; heaps and mids spread out and lifted clear of the crests, near ring 11 to 17 km. Tom: "Yes, push it".
