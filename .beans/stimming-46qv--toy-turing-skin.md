---
# stimming-46qv
title: 'Toy: Turing skin'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-15T08:51:03Z
updated_at: 2026-11-15T09:47:33Z
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
- [ ] Sound: synthesized stroke voice through audioKit, muted by default
- [ ] Quality: pixel ratio, slow-frame step, reduced motion, whenVisible
- [ ] QA at 1280, 375 x 812, 812 x 375 in the browser pane
- [ ] Toy doc docs/toys/turing.md
- [ ] Handoff files: toys-entry.json, menu-li.html, menu-icon.js
