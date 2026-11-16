---
# stimming-za3e
title: 'Toy: Jacob''s ladder'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-16T08:32:06Z
updated_at: 2026-11-16T09:18:08Z
---

Idea 7 (Group A, school and uni lab experiments): "An arc climbs two rods, snaps and starts again. Blow on it to bend it."

Two tall copper rods rise from a dark transformer box in a V. An arc strikes at the narrow gap, climbs on its own heat, stretches as the rods part, writhes, and snaps off at the top. Then a new one strikes at the bottom. Hold to blow: the arc bows away from the hand, tears early, or rides up faster. A hovering pointer makes it lean away. One slider: Gap (the top spread).

Tier: raw WebGL2. A small analytic 3D room (bench, wall, box, insulators, rods) lit by the arc as a moving line of lights with soft rod and box shadows; the arc as an additive ribbon from a CPU node chain; a low-res ping-pong buffer for the trail, the flame and the heat shimmer; shared bloom, grade and film curve.

## Checklist
- [x] Blockout: page skeleton, Bar v2, scene pass, arc chain and ribbon
- [x] Arc: strike, climb, stretch, writhe, snap; roots skip up the rods
- [x] Look: arc core and sheath, trail, flame, shimmer, light on rods, bench and wall, shadows, bloom
- [x] Hand: hold to blow (bow, tear, carry), hover lean, Blow key, tap puff
- [x] Comfort: steady room light, strike rate cap, Arc flicker setting, reduced motion
- [x] Sound: mains buzz that rises with the climb, dry crack on the snap, strike tick, breath
- [x] Performance: steady loop, hidden stops it, detail level, slow-frame step
- [x] Intro fallback text and vignette
- [x] QA: console, gestures, controls, sound, 1280, 375 x 812, 812 x 375
- [x] Toy doc: docs/toys/ladder.md
- [x] Handoff: toys-entry.json, menu-li.html, menu-icon.js

## Summary of Changes

- `ladder/index.html`: a new Lab toy on Bar v2, raw WebGL2. Two copper rods in a V on a dark transformer box with porcelain insulators, in a dark lab. The arc is a CPU chain of 44 nodes: it strikes at the narrow foot, rides its hot air up, stretches, writhes in a two-scale curl field, loops over the tips and snaps; roots stick and skip; loops that touch short out; a node that brushes a rod becomes a root.
- Look: a white core and violet sheath, copper vapour near the roots, root spots, a trail, a flame and heat shimmer from one low-res air buffer, the room lit only by the arc (eight light points that cross-fade between the old and new arc), soft box and insulator shadows, copper highlights from the arc as a line light, glowing copper where the roots dwell, temper colour at the gap, bloom only on the arc, shared grade and film curve.
- Hand: hold to blow (side breath bows and tears it; breath from below carries it up), a click is a puff, a near mouse leans it, Space blows an updraft, Enter puffs from the side. Gap slider swings the rods.
- Comfort: steady room light (power follows in 0.3 s), strikes at most every 0.5 s, the Arc flicker setting (Off, Soft, Full), reduced motion climbs smoothly and cross-fades at the snap.
- Sound: a clipped mains buzz that climbs up to seven semitones with the arc, a gated sizzle, crackles, a dry crack on the snap, a strike tick, the breath.
- `docs/toys/ladder.md`: the toy doc.
- Handoff for the menu (in the batch scratchpad): `toys-entry.json`, `menu-li.html`, `menu-icon.js`.
- Open: the sound is not checked by ear; motion and frame rate were not watched live (background pane); the phone frame rate is not measured.
