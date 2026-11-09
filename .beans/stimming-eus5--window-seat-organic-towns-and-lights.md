---
# stimming-eus5
title: 'Window seat: organic towns and lights'
status: completed
type: task
priority: normal
created_at: 2026-11-09T08:13:29Z
updated_at: 2026-11-09T08:52:02Z
parent: stimming-w1nd
---

Round under stimming-h1c7 (city lights); a task cannot nest under a task.
Tom: "the towns and the light blotches -- make it look more organic".

- [x] Baseline stills (midnight, dusk) and median frame time on High
- [x] Towns: dense cores fade to sprawl, no discs or square patches
- [x] Roads follow the land, link towns; villages string along roads
- [x] Light colour mixes sodium, LED white, green-white
- [x] Haze glow scales with town size
- [x] Lights twinkle a little through the air
- [x] Nothing tiles across the 15 km field window
- [x] Frame cost on High same or lower
- [x] After stills and note

## Summary of Changes

- Towns: one site per 16 km cell, warped by slow nested sines, each stretched on its own axis. Density falls off fast from the core, slow through the sprawl; fractal noise cuts ragged edges.
- Roads: each site links to its neighbours (a third of links missing); the nearest road wanders side to side and meets towns square on. Sprawl spills along roads; villages bead along them.
- Big towns add bent radial avenues and a ring road, faded by footprint and by the town own share.
- Streets: broken Voronoi cell edges plus noise lanes; lamps string along them.
- Lamps: jittered points in sodium, cool and warm LED, and a few green-white; centres get more LED. Far away, lamps merge into coarser point levels, so far towns stay grainy instead of smooth smudges. Lamps twinkle more with more air.
- Farms: lone lamps clustered by district noise, most near roads; the old regular rural lattice is gone.
- Haze dome grows with town size and shows only through slant air. The deck under-glow is wider and matched to the old mean (factor 0.83).
- Ground under opaque cloud is skipped.

Cost (GPU timer query, High, 2496x1368, midnight; paired ratios after/before): Broken cloud 0.92 and 0.89; Clear sky 0.99, 1.00, 1.00.
