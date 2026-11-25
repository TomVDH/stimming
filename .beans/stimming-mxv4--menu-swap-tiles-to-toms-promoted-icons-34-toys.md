---
# stimming-mxv4
title: 'Menu: swap tiles to Tom''s promoted icons (34 toys)'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-25T21:51:06Z
updated_at: 2026-11-25T21:56:10Z
parent: stimming-0cau
---

Tom, 2026-11-25: "Swap menu tiles", then "be conservative on usage". The masks are done (shared/emblems). Each tile in index.html is live SVG with its own script and hover hook (the hook table near index.html:13980); port the promoted card from its gallery, live, per icons/AGENTS.md. Source of truth: the desk YAML promote entries (Downloads/dddddstimming-desk.yaml).

Promoted card per toy (card@gallery icons/spike-<round>.html): morpher a@3, pop a@pop-1, domino a@domino-1, pins a@pins-1, prism e@8, ferro a@ferro-1, magnet a@magnet-1, glass a@glass-1, chladni a@chladni-1, putty a@9, bubbles a@12, eyes a@eyes-1, sonar a@18, shadyos a@shadyos-1, chamber a@chamber-1, ink a@ink-1, windmap a3@windmap-2, vortex f3@30, dijkstra a@dijkstra-2, trainride a@trainride-3, meshball a@meshball-1, washer a@washer-2, lichtenberg a@lichtenberg-2, postcard a@postcard-2, motorway a@motorway-1, foil a@15, crossing a@crossing-1, observatory a@observatory-3, nvg a@nvg-1, plasma a@plasma-1, drone a@drone-1, subway a@subway-1, carwash a@carwash-1, fruit a@fruit-1. Earlier menu tiles: kaleido menu2, neon menu1, cauldron menu4 (from icons/history).

2026-11-25: done as images: shared/tiles/<id>.svg (paint inlined from each gallery card), an img.pr in each tile, the old drawing hidden by CSS. Left: each card's own hover motion; the three earlier-menu-tile picks (kaleido, neon, cauldron).
