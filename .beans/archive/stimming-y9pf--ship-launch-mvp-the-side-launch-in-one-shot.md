---
# stimming-y9pf
title: 'Ship launch: MVP, the side launch in one shot'
status: completed
type: feature
created_at: 2026-11-23T09:45:49Z
updated_at: 2026-11-27T07:19:52Z
parent: stimming-oh7b
---

Idea 222 Slipway, grown to XXXL (Tom's picks, 2026-11-23). Plan: docs/plans/shiplaunch.md (Tom approved 2026-11-23). Stack type: Scene (three.js 0.170). MVP: one fixed shot from the far quay of a canal yard, low winter sun; tap or Space cuts the rope; the coaster slides, tips, hits the water sideways; a wave crosses the canal and breaks over the near quay; she rolls down to calm. Slider: Drop.

- [x] Plan in docs/plans/shiplaunch.md
- [x] Blockout in the real framing, 1280 x 800 capture
- [x] Physics: grease, slide, tip, float, drag chains
- [x] Water: GPU shallow-water sim, hull draft, overtopping, foam
- [x] Spray drops, K3 mist and dust with Fire's smoke shading
- [x] Hull material, yard, far bank, crowd, bunting, light, grade
- [x] Bar v3: Launch (Space), Drop slider; frame loop, reduced motion, ladder
- [x] Sound: release, rumble, chains, hit, wave, crowd
- [x] Icon round shiplaunch-1, emblems, intro emblem, Lab tile and hook, toys.json
- [x] QA Q1 to Q10, docs/toys/shiplaunch.md
- [ ] Record the cost

## QA (2026-11-23, headless Edge on D3D11, RTX 3070)

| # | Result |
|---|---|
| Q1 | `node --check` passes on every module and on the menu's inline scripts |
| Q2 | Launch, Space, Drop 0.6 and 2.4, drag, R, Again: console clean |
| Q3 | 1280 x 800 and 375 x 812 captures in `docs/qa/shiplaunch/` |
| Q4 | Drifting: 32 rAF a second; 62 s after the last input: none in 2 s |
| Q5 | Hidden: no frames in 2 s |
| Q6 | Reduced motion: no frames at rest, console clean, the launch plays |
| Q7 | Two bar controls (Launch, Drop); four how-to rows |
| Q8 | Space cuts the rope, a second Space flash-cuts back, R resets |
| Q9 | The context runs after the gesture and is suspended at the end (the canal calms and the loop stops about 60 s after the hit) |
| Q10 | About 6 ms a frame at rest; 8.2 ms mean, 8.8 ms 95th percentile through the hit, at 1280 x 800 |
