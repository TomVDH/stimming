---
# stimming-za3e
title: 'Toy: Jacob''s ladder'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-16T08:32:06Z
updated_at: 2026-11-16T09:09:47Z
---

Idea 7 (Group A, school and uni lab experiments): "An arc climbs two rods, snaps and starts again. Blow on it to bend it."

Two tall copper rods rise from a dark transformer box in a V. An arc strikes at the narrow gap, climbs on its own heat, stretches as the rods part, writhes, and snaps off at the top. Then a new one strikes at the bottom. Hold to blow: the arc bows away from the hand, tears early, or rides up faster. A hovering pointer makes it lean away. One slider: Gap (the top spread).

Tier: raw WebGL2. A small analytic 3D room (bench, wall, box, insulators, rods) lit by the arc as a moving line of lights with soft rod and box shadows; the arc as an additive ribbon from a CPU node chain; a low-res ping-pong buffer for the trail, the flame and the heat shimmer; shared bloom, grade and film curve.

## Checklist
- [x] Blockout: page skeleton, Bar v2, scene pass, arc chain and ribbon
- [x] Arc: strike, climb, stretch, writhe, snap; roots skip up the rods
- [ ] Look: arc core and sheath, trail, flame, shimmer, light on rods, bench and wall, shadows, bloom
- [x] Hand: hold to blow (bow, tear, carry), hover lean, Blow key, tap puff
- [x] Comfort: steady room light, strike rate cap, Arc flicker setting, reduced motion
- [ ] Sound: mains buzz that rises with the climb, dry crack on the snap, strike tick, breath
- [ ] Performance: steady loop, hidden stops it, detail level, slow-frame step
- [ ] Intro fallback text and vignette
- [ ] QA: console, gestures, controls, sound, 1280, 375 x 812, 812 x 375
- [ ] Toy doc: docs/toys/ladder.md
- [ ] Handoff: toys-entry.json, menu-li.html, menu-icon.js
