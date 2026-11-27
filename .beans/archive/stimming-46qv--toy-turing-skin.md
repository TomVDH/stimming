---
# stimming-46qv
title: 'Toy: Turing skin'
status: completed
type: feature
priority: normal
created_at: 2026-11-15T08:51:03Z
updated_at: 2026-11-27T07:19:52Z
---

Idea 166 (lab batch, group B, data visualisation): Brush two chemicals; spots turn to stripes, leopard to zebra.

A Gray-Scott reaction-diffusion field in raw WebGL2 with ping-pong float textures. The hand brushes the field; one main slider walks the pattern family from spots through mazes to stripes. The field is lit as a living skin: relief from the field, soft sheen, an OKLCH pelt palette, a few coats to choose from. It grows and heals after a stroke, then settles so the page goes idle.

Tier: raw WebGL2 (per-pixel simulation on textures, seen flat).

## Checklist
- [x] Page skeleton on Bar v2 (intro fallback, stage, vignette)
- [x] Gray-Scott sim: ping-pong float targets, float support check, half-float and 8-bit fallback
- [x] Brush: stroke seeds the second chemical along the drag
- [x] Main slider walks spots to mazes to stripes (feed and kill path)
- [x] Skin shading: relief, sheen, OKLCH coat palettes
- [x] Settle detection: the loop sleeps once the pattern stops changing
- [x] Sound: synthesized stroke voice through audioKit, muted by default
- [x] Quality: pixel ratio, slow-frame step, reduced motion, whenVisible
- [x] QA at 1280, 375 x 812, 812 x 375 in the browser pane
- [x] Toy doc docs/toys/turing.md
- [x] Handoff files: toys-entry.json, menu-li.html, menu-icon.js

## Summary of Changes

- `turing/index.html`: a Gray-Scott skin in raw WebGL2 on Bar v2. State in RG32F, then RG16F or RGBA16F, then RGBA8 with two bytes a value; each target is tried for completeness.
- The Stripes slider walks feed and grain pull from spots (F 0.033) through worms and mazes to stripes along a combable grain; the sim trails the slider so no jump kills the coat.
- The brush lays dash beads (spot regime) and lines (from worms on); right-drag or two fingers wash; the coat heals.
- Four coats in OKLCH (Amber with fur and rosettes, Chalk with fur, Reef glossy, Ember wet); the lamp follows the pointer.
- A 16 x 10 probe, read back through a fence, keeps the sim at full rate while the skin is lively; then the steps wind down to zero and the page goes idle.
- Sound through audioKit: a brush voice, a growth fizz from the probe, and voices for Clear, Shuffle and a new coat.
- `docs/toys/turing.md` documents it; the vignette figure and the menu icon are contours of real simulation frames.
- Handoff files for the orchestrator are in the lab10 scratchpad folder.
