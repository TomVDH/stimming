---
# stimming-1gin
title: 'Soup surface: skin tears into rafts, then heals'
status: completed
type: task
priority: normal
created_at: 2026-11-16T09:46:12Z
updated_at: 2026-11-17T22:09:40Z
parent: stimming-fskg
---

A stir tears the set skin (aux b) into floating rafts with torn edges; calm soup heals it.

Branch: claude/cauldron-soup-0a7547 (worktree window-storm-abea42). Soup surface work in cauldron/index.html (shadeSoup in SCENE_FS, DYE_FS, RIP_FS). One change at a time; show Tom a screenshot before the next. Hold 30 fps at Quality High with a full pot.

## Status (2026-11-16)

Built on the branch: DYE_FS tears skin (aux b) along Voronoi cracks (scale 14) while the stir runs, 8x faster on the cracks than off them; calm heals it as before. shadeSoup tilts the normal by the skin gradient for a raised lip. A debug view (skin in red) shows rafts breaking up and healing. In the real render the rafts do not read: skin on cream looks almost like the cream. Waits on Tom: make set skin look more distinct (paler, yellower, more wrinkled), or drop this change. Bubble rings (stimming-i0dx) depend on the same answer.

## Skin look row (2026-11-16)

Dev row Skin look (skinLook, 0 to 1, default 0): 1 makes set skin a yellowed matte layer with a sharper edge, stronger wrinkles and a 0.5 lip. Stills at 0 and 1 went to Tom. Even at 1 the rafts read weakly, because the stir mostly draws skin into threads. Tom picks: look 0 or 1 (or between), or drop the rafts.

## Summary of Changes

Tom, 2026-11-17: "Look 1, keep rafts". Skin look defaults to 1 (yellowed, matte, sharp edge, strong wrinkles, raised lip); the rafts stay. The Dev row stays for tuning; 0 is the old skin.
