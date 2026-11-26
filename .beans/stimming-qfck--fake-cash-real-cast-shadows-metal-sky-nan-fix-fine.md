---
# stimming-qfck
title: 'Fake Cash: real cast shadows, Metal sky NaN fix, fine foil/window shading, bold crumples, graceful rain'
status: completed
type: task
priority: normal
created_at: 2026-11-26T18:19:27Z
updated_at: 2026-11-26T19:17:18Z
---

Polish pass from Tom's live review:
- [x] Fix pow(negative, 2.0) NaN bug on Metal/ANGLE that poisoned whimsical sky backdrop to gray/black
- [x] Add 1024x1024 directional depth shadow map (shadows.ts) with 9-tap PCF soft shadows and clear-window light cutouts
- [x] Deepen foil micro-grating, gold/copper metallic contrast, sparkling OVI shift, and fine beveled optical polymer windows
- [x] Make wallet folds and crumpled notes boldly visible mid-air and visibly unfurl on click
- [x] Calm rain pacing with graceful off-screen spawning and smooth opacity fade-in/fade-out
- [x] Get Tom's look at http://localhost:8000/fakecash/ and push via tools/commit.sh

- [x] Replace emma-front.webp with new Emma 500 Euro front (1500x755, 412 KB, 4.7 MB total) and map new hologram patch + left watermark panel

- [x] Replace cartoon backdrop with demure minimalist studio + optical bokeh, fix overblown radiance/exposure, and remove Voronoi crumple noise in favor of clean straight wallet folds

- [x] Replace Points bokeh with true analytical 85mm lens bokeh in stage.ts, tighten security masks to exact artwork shapes/chroma with silky shading, and add sweeping optical glimmer to translucent polymer windows

- [x] Generate 14 pixel-exact RGB glyph/foil/hologram mask textures (115 KB total, 4.72 MB bills total), wire uMaskFront/uMaskBack into material.ts, and remove Lucas's awkward 90-degree sideways flip

- [x] Make paper SSS and polymer window translucency respond dynamically to vertical tilt against an elevated backlight rather than staying hyper-transparent at rest

- [x] Fix inverted Celeste front 29 mask and flood-fill Celeste back 29, Emma front 500, and Tom front 200 to exact pixel glyph boundaries (verified in macro zoom)

## Summary of Changes

- Replaced the backdrop with a minimalist backlit studio ground and analytical 85mm optical lens bokeh (`fakecash/src/stage.ts`), fixing the Metal/ANGLE `pow(negative, 2.0)` NaN issue.
- Added a 1024x1024 directional depth shadow pass (`fakecash/src/shadows.ts`) with 9-tap soft PCF shadows and clear-window light cutouts.
- Replaced `fakecash/bills/emma-front.webp` with the new Emma 500 Euro front (1500x755, 412 KB) and generated 14 pixel-exact RGB glyph/foil/hologram mask textures (`fakecash/bills/*-mask.webp`, 110 KB total; 4.72 MB bills total) with seeded interior flood-fills for outlined numerals.
- Wired `uMaskFront`/`uMaskBack` into `fakecash/src/material.ts`, balanced photographic exposure, added sweeping optical glimmer on Mark's clear polymer windows, and made paper and window translucency respond dynamically to vertical tilt against an elevated backlight.
- Removed Voronoi crumple noise in favour of clean straight wallet folds that unfurl on click, calmed default rain pacing with graceful off-screen spawning and opacity fades, and removed Lucas's awkward 90-degree sideways flip.
