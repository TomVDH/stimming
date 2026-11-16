---
# stimming-zdo0
title: 'Rupert''s drop: new drop model and crack tree (try in stage lab)'
status: in-progress
type: task
priority: normal
created_at: 2026-11-16T23:05:56Z
updated_at: 2026-11-16T23:23:05Z
parent: stimming-2gnm
---

Tom picked stage B and option 1 for both: refine the ray-marched model; a precomputed branching crack tree with frosted Voronoi cells. Tried in rupert/stagelab.html first.

- [x] Model: smooth neck, lopsided head, stretched bubbles, kinked thread-thin tail
- [x] Tom reviews the model (OK, 2026-11-16)
- [x] Crack: CPU crack tree, fingered front, Voronoi frost (shards from the cells still to do)
- [ ] Tom reviews the crack
- [ ] Design doc, then port to the toy

## Model notes (2026-11-16)

- Reference: real drops are long teardrops, about three times longer than wide, with a long thread tail and bubble clusters (Commons photo by M. Grogan; Wikipedia).
- 24 sections, no blends (a blend shows as a rib or a bump). Every section clears the floor by 0.015.
- Known flaw: a small stepped highlight on the underside, near the floor. Not the lumps, bubbles, skin ripple or floor focus.
