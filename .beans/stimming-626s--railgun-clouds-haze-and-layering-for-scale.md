---
# stimming-626s
title: 'Railgun: clouds, haze and layering for scale'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-16T19:00:19Z
updated_at: 2026-11-16T20:01:50Z
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
- [ ] Tom signs off the Giants
