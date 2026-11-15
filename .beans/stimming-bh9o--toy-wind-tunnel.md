---
# stimming-bh9o
title: 'Toy: Wind tunnel'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-15T09:31:28Z
updated_at: 2026-11-15T10:12:44Z
---

Lab toy, group E (satisfying physics loops), idea 307: drag a shape in smoke lines; vortices peel off behind it.

A smoke wind tunnel seen from the side. Thin, even smoke lines stream left to right through a dark test section. A shape sits in the flow; the lines bend round it and roll up behind it into a street of alternating vortices. The hand drags and turns the shape; the wake answers at once. The main slider sets the wind speed: smooth flow low, a shedding wake higher, a torn wake at the top. The choice swaps the shape: cylinder, wing section (stalls when pitched up), flat plate, and one or two zany shapes. A real 2D fluid sim with a solid obstacle in raw WebGL2 (velocity and pressure in ping-pong textures, dye lines advected by the flow). Lit like a lab photograph: bright smoke on black, a soft light sheet, a little glow. Sound: wind rush that follows the speed, a low flutter when the wake sheds.

Tier: raw WebGL2 (ping-pong fluid on half-float textures).

## Checklist
- [x] Page skeleton on Bar v2 with intro fallback text
- [x] Fluid sim: advection, solid obstacle, pressure solve, inflow and outflow
- [x] Smoke lines: crisp upstream, smeared only where the flow tears
- [x] Shapes in the choice group: cylinder, wing, plate, zany ones
- [ ] Drag moves the shape, turn pitches it; the wake answers at once
- [x] Wind slider: smooth, shedding, torn
- [ ] Lab-photo look: light sheet, glow, grain
- [ ] Cheap steady state: lower step rate when nothing changes; stop when hidden
- [ ] Quality, slow-frame step, reduced motion
- [ ] Sound: wind rush with the speed, low flutter with the shedding, muted by default
- [ ] Vignette: heading, two paragraphs, figure
- [ ] docs/toys/windtunnel.md
- [ ] Handoff files: toys-entry.json, menu-li.html, menu-icon.js
- [ ] QA: console, gesture, controls, sound, 1280, 375x812, 812x375
