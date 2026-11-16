---
# stimming-ljrm
title: 'Toy: Hot ice'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-16T08:30:50Z
updated_at: 2026-11-16T09:16:52Z
---

New Lab toy (batch lab10, group A: school and uni lab experiments, idea 4).
Touch a supercooled liquid. Crystals race outward and freeze the dish.

A shallow glass dish of clear supersaturated liquid on a dark bench. A touch seeds a crystal: fans of needles race out, branch, meet other fronts and lock, until the dish is a white, sparkling solid with a faint warm breath of vapour. Reset melts it back to clear.

Tier: raw WebGL2 (one dish, per-pixel shading, a growth field in ping-pong float textures). No library.

## Checklist
- [x] Page skeleton on Bar v2 with intro fallback and vignette
- [x] Growth field: arrival time, needle angle, streaks, grain id
- [x] Look: dish, bench, clear liquid that refracts, white needle crystal, front, sheen, sparkle, vapour
- [x] Remelt on Reset
- [x] Sound: dry crackle on the front, tick where fronts meet, touch, remelt
- [x] Idle when solid and still; whenVisible; quality and slow-frame step; reduced motion
- [ ] QA in the browser pane: console, gesture, controls, sound, 1280, 375 x 812, 812 x 375
- [ ] Toy doc docs/toys/hotice.md
- [ ] Handoff files: toys-entry.json, menu-li.html, menu-icon.js
