---
# stimming-zdo0
title: 'Rupert''s drop: new drop model and crack tree (try in stage lab)'
status: completed
type: task
priority: normal
created_at: 2026-11-16T23:05:56Z
updated_at: 2026-11-16T23:57:23Z
parent: stimming-2gnm
---

Tom picked stage B and option 1 for both: refine the ray-marched model; a precomputed branching crack tree with frosted Voronoi cells. Tried in rupert/stagelab.html first.

- [x] Model: smooth neck, lopsided head, stretched bubbles, kinked thread-thin tail
- [x] Tom reviews the model (OK, 2026-11-16)
- [x] Crack: CPU crack tree, fingered front, Voronoi frost, shards from the cells
- [x] Tom reviews the crack (OK, 2026-11-16)
- [ ] Tom reviews the shards
- [x] Port to the toy (the toy doc records the design)

## Model notes (2026-11-16)

- Reference: real drops are long teardrops, about three times longer than wide, with a long thread tail and bubble clusters (Commons photo by M. Grogan; Wikipedia).
- 24 sections, no blends (a blend shows as a rib or a bump). Every section clears the floor by 0.015.
- Known flaw: a small stepped highlight on the underside, near the floor. Not the lumps, bubbles, skin ripple or floor focus.

## Summary of Changes

Rebuilt Rupert's drop in `rupert/stagelab.html`, then ported to `rupert/index.html` with stage B only.
- Stage: graphite studio, soft softboxes, a kicker behind the drop, acrylic floor whose mirror fades with height.
- Model: a real drop's long teardrop on 24 sections, bubbles, a thread tail; seamless stress fringes.
- Crack: a smart crack tree (area-led density, gap-filling forks, arrest), glinting crack faces, frost from the cracks, a white hold.
- Shards: one chip per frost cell, powder-white, plus fine dust.
Toy doc `docs/toys/rupert.md` updated.
