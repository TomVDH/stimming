---
# stimming-ljrm
title: 'Toy: Hot ice'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-16T08:30:50Z
updated_at: 2026-11-16T09:39:20Z
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
- [x] QA in the browser pane: console, gesture, controls, sound, 1280, 375 x 812, 812 x 375
- [x] Toy doc docs/toys/hotice.md
- [x] Handoff files: toys-entry.json, menu-li.html, menu-icon.js

## Summary of Changes

- New Lab toy `hotice/index.html` on Bar v2, raw WebGL2, with the intro fallback and a vignette (heading, two paragraphs, a temperature figure).
- Growth field: first-arrival times relaxed over 16 neighbours in RGBA32F ping-pong targets; needle angle, a streak carried along each needle, a grain number with a fan code. Seeds stamp fans that lean off the radius; needles branch now and then. A scissor box and early exit keep the passes small.
- Scene: one ray per pixel against the bench, the glass rim and walls, and the contents. Clear liquid refracts the bench and mirrors the lamp; the crystal is white and fibrous with needle sheen, per-fan facets, glints, seams, a bright front and a faint warm vapour. The lamp follows the pointer's mirror line.
- Reset melts the dish from the rim in, needles last. Sound: crackle that follows the front, ticks where fronts lock, touch, knock, settle and melt voices.
- Idle once solid and still; whenVisible; detail() quality and slow-frame step; reduced motion reveals the crystal as a fade.
- Toy doc `docs/toys/hotice.md`. Handoff files for the menu and toys.json in the batch scratchpad. Not seen in motion: the pane ran only background tabs.

## Kept by Tom (2026-11-16)

This toy's idea is on the Cut list in `docs/toy-ideas.md` (cut by Tom on 2026-11-15, before the build). The orchestrator proposed it without re-reading that list. Tom saw the finished toy and said: keep it.
