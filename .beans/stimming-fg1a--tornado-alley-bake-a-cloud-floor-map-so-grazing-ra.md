---
# stimming-fg1a
title: 'Tornado alley: bake a cloud floor map so grazing rays jump to the cloud'
status: todo
type: task
priority: high
created_at: 2026-11-17T21:28:51Z
updated_at: 2026-11-17T21:28:51Z
parent: stimming-dwwg
---

Tom, 2026-11-17: "make bean -- park as high prio -- leave for now". Parked; candidate 1 in stimming-2ftc's bake list.

A 2D map of the deck's lowest cloud height over x, z, baked from the full noise and renewed a few rows a frame (whole map about twice a second). A ray under the base jumps to the floor, then marches the real noise as now. The map is an acceleration only: it holds no cloud, so done right the picture does not change.

Guards for fidelity:
- Each cell keeps the lowest height over itself and its neighbours, less a margin of about 100 m: thin low wisps are not skipped.
- The margin also covers how far the cloud can sink between renewals.
- Discs round each funnel and the tower force the floor to the ground.
- The per-pixel jitter stays after the jump: no shimmer at the base.

Expected gain: about 8 to 12 % of the frame (the unsafe bound in lever 1 gave 16 %).

- [ ] Build the map and its renewal
- [ ] Pixel-difference check of stills: low deck, near funnels, low sun
- [ ] Frame time before and after, one change alone
- [ ] Tom judges it live, in motion
