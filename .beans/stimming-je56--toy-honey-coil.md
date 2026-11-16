---
# stimming-je56
title: 'Toy: Honey coil'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-16T08:26:04Z
updated_at: 2026-11-16T09:23:56Z
---

Idea 311 (Group E, satisfying physics loops): "Pour honey from a height; the thread coils like rope."

A thin thread of honey falls from above onto a plate. Where it lands it coils: a neat spinning rope that stacks, topples, folds and slowly sinks into the pool. The hand moves the pour: hold still and the coil stacks into a tower; drag slowly and it lays loops and figure-eights; drag fast and the thread runs straight. One main slider sets the pour height (low: slow fat coils; high: fast fine ones). One choice: honey, syrup, treacle (thickness and colour). Slow and heavy. When the pour stops and the pool settles, the page goes idle.

Tier: raw WebGL2. A simulated thread (CPU chain) drawn as a lit ribbon; the pool is a height field on the GPU (spread by viscous diffusion), shaded as amber that light passes through.

## Checklist
- [x] Bean, plan, read the brief and the shell
- [x] Blockout: plate, pool height field, falling thread, coil model, pointer pours
- [x] Look: amber transmission, glossy thread with a bright core, coils that hold then melt, rounded spreading edge, trapped bubbles
- [ ] Bar v2: Honey/Syrup/Treacle choice, Height slider, Settings, Dev rows, key strip
- [ ] Sound: soft thick patter of the coil and a low hum, synthesized through audioKit
- [ ] Idle: the loop stops when the pour stops and the pool settles; whenVisible; detail level; slow-frame step
- [ ] Reduced motion
- [ ] Intro fallback text and vignette
- [ ] QA: console, gestures, controls, sound, 1280, 375 x 812, 812 x 375
- [ ] Toy doc: docs/toys/honey.md
- [ ] Handoff: toys-entry.json, menu-li.html, menu-icon.js
