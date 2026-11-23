---
# stimming-2t3o
title: 'Steelworks: MVP, the tap and the iron run'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-23T09:35:39Z
updated_at: 2026-11-23T10:40:14Z
parent: stimming-oh7b
---

Idea 204 Furnace tap, grown to XXL (Tom's picks, 2026-11-23). Plan: `docs/plans/steelworks.md`. Stack type: Scene (three.js 0.170). MVP: one fixed shot of the cast house at night; hold to drill, the taphole blows, iron runs the trough and runners, slag splits off, the plug, the cooling.

## Tasks

- [x] Plan to `docs/plans/steelworks.md`, bean
- [x] Blockout on the stage, screenshot at 1280 x 800
- [x] Iron sim and surface, light from the iron, sparks
- [x] Fume, haze and shafts, shimmer, post
- [x] Gestures, Bar v3, sound, frame loop, ladder
- [x] Icon round steelworks-1 (Current, A, D), emblems, sheet row, intro emblem, favicon
- [x] toys.json entry, Lab tile and hook
- [x] QA Q1 to Q10, toy doc
- [ ] Record the session cost


## QA, 2026-11-23 (Edge headless, D3D11, RTX 3070)

| Check | Result |
|---|---|
| Q1 | Every module and the menu script pass `node --check` |
| Q2 | Drill, blow, run, splash, Flow, Plug: console clean |
| Q3 | 1280 x 800 and 375 x 812 (touch) captures in `docs/qa/steelworks/` |
| Q4 | Asleep 64 s after load: 0 rAF calls in 2 s |
| Q5 | Hidden: 0 rAF calls in 2 s |
| Q6 | Reduced motion: the cast runs, console clean |
| Q7 | Bar: Tap, Plug, Flow; four How rows |
| Q8 | Space holds the drill and breaks through; P plugs |
| Q9 | Sound on: the context runs in the cast and suspends at rest |
| Q10 | 7.3 to 7.9 ms a frame through the run (one 10.8 ms sample) |

Session cost: not readable from this session; Tom reads it from the usage page.
