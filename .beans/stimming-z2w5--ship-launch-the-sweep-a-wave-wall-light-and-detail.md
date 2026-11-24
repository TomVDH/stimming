---
# stimming-z2w5
title: 'Ship launch: the sweep, a wave wall, light and detail'
status: in-progress
type: task
created_at: 2026-11-23T20:55:47Z
updated_at: 2026-11-23T20:55:47Z
parent: stimming-y9pf
---

Tom (2026-11-23): "Would like more faraway POV", "I'd maybe want it to be released in a port or lagoon / wider waterway than a canal" (picked Port basin), "perhaps we can use frietkot like silhouettes", then "I think this is not the sweeping quality we're looking for.." and "Yes, plan it". Plan: docs/plans/shiplaunch.md, section Sweep.

- [x] Base: 200 m port basin, the pier shot, Frietkot figure cards
- [x] Wave wall: impact source, sink, shoal before the pier, the pier moved in front of her (crest spray across the basin left for the light stage)
- [ ] Camera sweep: waiting wide, crane down, pier, wave, pull back; reduced-motion cuts; tall keyframes
- [ ] Light: shared sky and clouds, shafts through the spray, flare, grade, sun path
- [ ] Detail: hull, crane and shed, yard, harbour, water
- [ ] QA Q1 to Q10, docs, captures

## Paused (2026-11-23, Tom: "lets pause this for now with all notes")

Committed and on origin: 93af57c0, the base (basin, pier shot, figure cards).

Uncommitted in the working copy (shiplaunch/canal.js, main.js, yard.js), working but not QA'd:
- Impact source: at the hit, canal.impact() raises a Gaussian ridge (sigma 6 m, x -46 to 46) at gz + B/2 + 7 over 1.2 s. Height = min(WALL.max 6.5, WALL.k 3 x Drop x min(1.3, v/6)). A uniform sink over the basin returns the volume over 20 s (WET_AREA, SINK_T).
- Shoal: a rubble apron before the pier, bed from -6 to -1.5 m over 40 m (SHOAL in canal.js).
- The pier moved in front of the hull: PIER { x0 -16, x1 -4, z0 42 } (was -116, -104, 78). Off the hull's end the wall spread to 0.3 m; in front of her it stays planar.
- Measured peaks (0.15 s probe, scratch peak.mjs): Drop 1.5: 1.5 m at z 20, 1.3 m at z 40, 1.7 m at the pier head, about 0.5 m over the deck; Drop 0.6: 0.9 m at the head, no overtop; Drop 2.4 (before the 6.5 m cap): 2.4 m at the head, 1.4 m deep on the deck.
- The wall reaches the pier about 9 s after the hit; the crowd's retreat reads the deck water then (checked with the readback).
- Not checked yet: Q4 and Q9 with the sink (the loop must still sleep), frame times, the phone, the 6.5 m cap's numbers.

Seen in the close frames, to fix in later stages:
- The mist over the hull reads as green mottling at the pier's range.
- The foam pattern at /9 m reads as spots up close.
- The camera EYE still sits at PIER.x0 + 3, PIER.z0 + 11 with lens 40: at the new pier it frames the hull too tight (the strip used lens 62).

Next, in plan order: finish the wave wall (crest spray, QA, commit), then the camera sweep, light, detail.

## Resumed (2026-11-23, Tom via the orchestrator: "commit, merge and push and proceed until the sessions truly need my instructions")

- Wave wall committed. Ridge capped at 6.5 m (WALL.max). Pier lens 62 degrees.
- QA (headless Edge, D3D11): console clean, phone console clean; 8.1 ms mean, 9.3 ms p95 through the hit; drifting 33 rAF a second, none after 62 s idle, none hidden, none at rest under reduced motion; the audio context suspends at the end.
