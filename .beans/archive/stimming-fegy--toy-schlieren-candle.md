---
# stimming-fegy
title: 'Toy: Schlieren candle'
status: completed
type: feature
created_at: 2026-11-15T08:51:02Z
updated_at: 2026-11-27T07:19:52Z
---

Lab toy, group A (school and uni lab experiments), idea 122: heat shows as shimmering shadow; wave a hand to stir it.

A heat source stands in front of a round schlieren mirror. Its plume rises as a curling grey shadow. The pointer is a hand: move it through the plume to stir and split it; hold still and your own heat rises off it. A 2D fluid sim (velocity, temperature, buoyancy) in raw WebGL2. The image is the gradient of the temperature field through a knife edge; a colour-filter mode is an option. The choice swaps the source: candle, hot cup, soldering iron, struck match.

Tier: raw WebGL2 (ping-pong fluid on half-float textures).

## Checklist
- [x] Page skeleton on Bar v2 with intro fallback text
- [x] Fluid sim: advection, buoyancy, vorticity, pressure solve
- [x] Schlieren render: knife edge and colour filter
- [x] Four heat sources in the choice group
- [x] Hand: stir by motion, heat rises when the pointer holds still
- [x] Idle state when the air is still; no per-frame work when hidden
- [x] Quality, slow-frame step, reduced motion
- [x] Sound: faint flame flutter, muted by default
- [x] Vignette: heading, two paragraphs, figure
- [x] docs/toys/schlieren.md
- [x] Handoff files: toys-entry.json, menu-li.html, menu-icon.js
- [x] QA: console, gesture, controls, sound, 1280, 375x812, 812x375

## Summary of Changes

- `schlieren/index.html`: a Lab toy on Bar v2. Raw WebGL2 fluid: velocity at 160 to 256, heat at 384 to 1024 with MacCormack advection, buoyancy, vorticity confinement, a Jacobi pressure solve with open sides and top.
- The picture is the slope of the heat through a knife edge. Settings adds a colour filter and a shadowgraph. A Sensitivity slider spans six stops.
- Four sources as signed distance fields: candle, cup, soldering iron, struck match. Each feeds heat and blocks the air.
- The pointer is a hand: a moving capsule stirs the air; held still, it warms it. A click is a snap: a sound-wave ring crosses the mirror and lights a dead source. Blow (B) sends a breath from the left and blows a flame out.
- Idle: after 90 s a lit source dies down; the air fades over 8 s; the loop stops. Reduced motion holds the frame still between hand moves.
- Sound through `audioKit`: flame flutter, breath, snap, strike, light, out, cup clink, iron ticks. Muted by default.
- `docs/toys/schlieren.md`: the toy doc.
- Handoff files for the orchestrator: `toys-entry.json`, `menu-li.html`, `menu-icon.js` (an SVG lighting filter embosses the plume; the pointer pushes it).

