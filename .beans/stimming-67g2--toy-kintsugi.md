---
# stimming-67g2
title: 'Toy: Kintsugi'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-16T08:38:15Z
updated_at: 2026-11-16T09:25:12Z
---

Lab toy, group F (quiet to use, rich to look at), idea 356: a broken bowl; gold flows into the cracks.

One glazed bowl on a dark cloth. A tap breaks it: cracks run from the point of the blow and the bowl opens into a handful of shards that settle apart with weight. Then it mends by itself: the shards draw back together and liquid gold flows from the point of the blow along every seam. The old gold stays, so each bowl grows its own history. The material is the showpiece: deep glaze with pooling and crackle, matt raw clay on the breaks, gold with real metal lustre under one slow, soft light.

Tier: raw WebGL2. The bowl and its shards are ray traced as analytic shells (ellipsoid shell, rim plane, foot ring) cut by a warped spherical Voronoi; past gold lives in one map in the bowl's own space.

## Checklist
- [x] Page skeleton on Bar v2 with intro fallback text
- [x] Ray-traced bowl, foot ring and cloth under one soft light
- [x] Glaze look: pooling, runs, crackle, rim break; four glazes
- [x] Break: crack network from the blow, shards fall and settle
- [x] Mend: shards draw together, gold flows along the seams
- [x] Gold map: past rounds stay; chips mend as gold patches
- [x] Idle when whole and still; quality, slow-frame step, reduced motion
- [x] Sound: break, settling clicks, a low chime per seam
- [x] Vignette: heading, two paragraphs, figure
- [x] docs/toys/kintsugi.md
- [x] Handoff files: toys-entry.json, menu-li.html, menu-icon.js
- [x] QA: console, gesture, controls, sound, 1280, 375x812, 812x375

## Summary of Changes

- `kintsugi/index.html`: a Lab toy on Bar v2, raw WebGL2. One full-screen pass ray traces the cloth and the bowl: an ellipsoid shell cut flat at the rim, on a foot ring. A break cuts it with a warped spherical Voronoi; each cell is a shard with radial break faces of raw clay, found by a short march inside the wall.
- The break: hairline cracks run from the blow through the crack net, the shards tip outward and settle on their backs with a rock, rest, then lift and close. Gold flows from the blow along every seam (Dijkstra over the plain Voronoi net), glossy while wet; a lost chip comes back as a gold patch. Each break joins a 2048 gold map; the bowl (blow and seed per break) replays from storage.
- The look: celadon, tenmoku, shino and indigo glazes with pooling, runs, crackle, a thin lip, drips and a bare clay foot; gold with a raised ridge and metal lustre; a dark linen cloth; one soft key light that the pointer swings slowly; soft ray-marched shadows and occlusion; the camera eases from close to wide while the pieces lie apart.
- Sound through `audioKit`: the break, landing thuds and ticks, a soft close click, a low pentatonic bell as each seam closes. Muted by default.
- Idle when whole and still, after a jittered still refines. `detail()` sets the pixel ratio and steps down on slow frames. Reduced motion: no flight, cracks at once, gold fades in.
- `docs/toys/kintsugi.md`: the toy doc. Handoff files for the orchestrator in the lab10 scratchpad: `toys-entry.json`, `menu-li.html`, `menu-icon.js` (the bowl splits on hover, closes, and gold runs down the seam; the glint follows the pointer).
