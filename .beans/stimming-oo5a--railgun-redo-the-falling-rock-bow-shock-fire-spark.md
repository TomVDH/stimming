---
# stimming-oo5a
title: 'Railgun: redo the falling rock, bow shock, fire, sparks and smoke column'
status: completed
type: feature
priority: normal
created_at: 2026-11-16T18:16:28Z
updated_at: 2026-11-16T19:04:20Z
---

Tom: "redo smoke column sparks and firey smoke by the asteroid and the asteroid itself incl bow shock etc".

Scope: railgun/index.html, the rock (astMat), the bow shock (bowMat, haloMat), the trail (PU, makeTrain), the shed sparks (shedSpark). Keep the strike and kill sequences working. Do not touch the ambient events, terrain or ranges (stimming-z267 owns them).

- [x] Before stills: dusk, night, day, near, strike at 1280 and 375
- [x] Tom picks a direction: a planet-scale fireball; right track (2026-11-16)
- [x] Violent head: cut (Tom)
- [x] Soft rocket crackle loop while the rock is up (Ten seconds' thrust.mp3; Dev: Rock roar). Tom: "crackle is good" (2026-11-16)
- [x] Rock: dark crust, boiling melt on the front
- [x] Bow shock: a white-hot cap and shock layer that hide the rock's front
- [x] Fire by the rock: a burning wake 11 radii long (the front glow stays)
- [x] Sparks: fewer (3/s), dimmer, smaller, close to the smoke, cooling orange to red; Tom likes the lesser sparks
- [x] Smoke column: the fixed hatch is gone; it widens slowly with age (spread 0.11). The bulge, rim and soot pass was cut (Tom)
- [ ] QA: clean console, strike and kill still work, 1280 and 375
- [x] Tom signs off the rock and its glow at night: "Looks right" (2026-11-16)

- [x] The trail's plasma sheath goes: it drew a pale disc over the lumpy rock and a dark ragged rim round it (Tom: weird blending at night)
- [x] Companions: up to 16; six to nine spread wide across the sky; three to five split off the main rock during the fall and drift out over 30 s

- [x] The rock's original all-over glow is back; the sheath glow wraps every lump (Tom: no black blotches)

## Summary of Changes

- Rock keeps its original all-over glow; a sheath glow wraps every lump.
- Burning wake 11 radii behind the rock.
- Old bow shock, faded in only near the ground; no side streamers, no cone ahead of the nose.
- Sparks: fewer, dimmer, close to the smoke, cooling orange to red.
- Smoke column: no fixed hatch; widens slowly with age (spread 0.11).
- Companions: six to nine across the sky; three to five split off mid-fall.
- Soft looping booster crackle while the rock is up (Dev: Rock roar).
- Cut by Tom: the white-hot cap, the Violent head, chunk and spray sparks, the column bulge pass.
