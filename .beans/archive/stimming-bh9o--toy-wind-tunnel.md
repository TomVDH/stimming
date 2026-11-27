---
# stimming-bh9o
title: 'Toy: Wind tunnel'
status: completed
type: feature
priority: normal
created_at: 2026-11-15T09:31:28Z
updated_at: 2026-11-27T07:19:52Z
---

Lab toy, group E (satisfying physics loops), idea 307: drag a shape in smoke lines; vortices peel off behind it.

A smoke wind tunnel seen from the side. Thin, even smoke lines stream left to right through a dark test section. A shape sits in the flow; the lines bend round it and roll up behind it into a street of alternating vortices. The hand drags and turns the shape; the wake answers at once. The main slider sets the wind speed: smooth flow low, a shedding wake higher, a torn wake at the top. The choice swaps the shape: cylinder, wing section (stalls when pitched up), flat plate, and one or two zany shapes. A real 2D fluid sim with a solid obstacle in raw WebGL2 (velocity and pressure in ping-pong textures, dye lines advected by the flow). Lit like a lab photograph: bright smoke on black, a soft light sheet, a little glow. Sound: wind rush that follows the speed, a low flutter when the wake sheds.

Tier: raw WebGL2 (ping-pong fluid on half-float textures).

## Checklist
- [x] Page skeleton on Bar v2 with intro fallback text
- [x] Fluid sim: advection, solid obstacle, pressure solve, inflow and outflow
- [x] Smoke lines: crisp upstream, smeared only where the flow tears
- [x] Shapes in the choice group: cylinder, wing, plate, zany ones
- [x] Drag moves the shape, turn pitches it; the wake answers at once
- [x] Wind slider: smooth, shedding, torn
- [x] Lab-photo look: light sheet, glow, grain
- [x] Cheap steady state: lower step rate when nothing changes; stop when hidden
- [x] Quality, slow-frame step, reduced motion
- [x] Sound: wind rush with the speed, low flutter with the shedding, muted by default
- [x] Vignette: heading, two paragraphs, figure
- [x] docs/toys/windtunnel.md
- [x] Handoff files: toys-entry.json, menu-li.html, menu-icon.js
- [x] QA: console, gesture, controls, sound, 1280, 375x812, 812x375

## Summary of Changes

- `windtunnel/index.html`: a raw WebGL2 smoke tunnel on Bar v2. A 2D fluid sim (MacCormack advection, implicit viscosity, warm-started Jacobi pressure, no-slip moving model) runs on half-float ping-pong textures.
- Smoke carries dye, an inlet-height label, a torn flag and an age. Crisp lines draw from the label at screen resolution; torn smoke draws from the dye with filaments, so lines smear only where the flow tears.
- Five models from 512 px distance maps: Cylinder, Wing (NACA 2412, stalls past about 15 degrees), Plate, Duck, Teapot. Drag on the model moves it, drag off it turns it, a click places it.
- Wind maps speed and Reynolds number together: smooth at 0, a clean vortex street at 0.5, torn at 1 with confinement behind the model.
- Cheap steady state: calm drops to 30 fps and fewer pressure passes; a still wake (read back from four probes) stops the sim, and puffs keep drifting on the frozen lines.
- Sound: rush, hiss and fan hum follow the wind; a flutter follows the wake probe, so it pulses with each shed whirl. Puff and model swaps have one-shots.
- `docs/toys/windtunnel.md` and the three handoff files in the lab10 scratchpad.
