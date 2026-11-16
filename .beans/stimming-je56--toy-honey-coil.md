---
# stimming-je56
title: 'Toy: Honey coil'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-16T08:26:04Z
updated_at: 2026-11-16T09:36:07Z
---

Idea 311 (Group E, satisfying physics loops): "Pour honey from a height; the thread coils like rope."

A thin thread of honey falls from above onto a plate. Where it lands it coils: a neat spinning rope that stacks, topples, folds and slowly sinks into the pool. The hand moves the pour: hold still and the coil stacks into a tower; drag slowly and it lays loops and figure-eights; drag fast and the thread runs straight. One main slider sets the pour height (low: slow fat coils; high: fast fine ones). One choice: honey, syrup, treacle (thickness and colour). Slow and heavy. When the pour stops and the pool settles, the page goes idle.

Tier: raw WebGL2. The thread and the laid rope are ray-traced capsules; the pool is a CPU thin-film height field, shaded as amber that light passes through.

## Checklist
- [x] Bean, plan, read the brief and the shell
- [x] Blockout: plate, pool height field, falling thread, coil model, pointer pours
- [x] Look: amber transmission, glossy thread with a bright core, coils that hold then melt, rounded spreading edge, trapped bubbles
- [x] Bar v2: Honey/Syrup/Treacle choice, Height slider, Settings, Dev rows, key strip
- [x] Sound: soft thick patter of the coil and a low hum, synthesized through audioKit
- [x] Idle: the loop stops when the pour stops and the pool settles; whenVisible; detail level; slow-frame step
- [x] Reduced motion
- [x] Intro fallback text and vignette
- [x] QA: console, gestures, controls, sound, 1280, 375 x 812, 812 x 375
- [x] Toy doc: docs/toys/honey.md
- [x] Handoff: toys-entry.json, menu-li.html, menu-icon.js

## Summary of Changes

- `honey/index.html`: a new Lab toy on Bar v2, raw WebGL2. A thread of honey falls onto a dark slate and coils. Held still, the rope stacks into a tower that leans, then sinks and spreads. Dragged, it lays loops, figures of eight and waves; fast, it pulls straight.
- The rope is a ring buffer of points laid by a pattern generator, resting on the pool and on older rope; it holds its shape, then melts its volume into a 160 x 160 thin-film pool. A tall stack squeezes its base and sends the coil off its top.
- The look: ray-traced capsules for the rope and thread, a lifted grid for the pool, a light-space honey map for amber shadows with a lens gain, Beer-Lambert colour, caustics, a backlit pool edge, trapped bubbles. One warm key behind, a dim fill in front; bloom only on the key's reflections.
- Fluid choice: Honey, Syrup, Treacle (colour, coil size, speed, hold and melt time, spread). Height slider: low gives slow fat coils, high gives fast fine ones. Pour (Space, held) and Clear. Dev rows for exposure, bloom, the camera, tempo and melt time.
- Sound through audioKit: a low hum that wavers with the coil, a soft thick patter as rope lands, a plop when a tail lands, a swipe on Clear.
- Idle when the pool settles; whenVisible; detail level with a slow-frame step; shaders link on a timer so a hidden tab boots.
- `docs/toys/honey.md`: the toy doc. Handoff files in the lab10 scratchpad: toys-entry.json, menu-li.html, menu-icon.js.
- Open: not heard, not seen in live motion, not measured on a phone; reduced motion checked in code only. Tom sets the Dutch name.
