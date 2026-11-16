---
# stimming-67g2
title: 'Toy: Kintsugi'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-16T08:38:15Z
updated_at: 2026-11-16T09:10:24Z
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
- [ ] Idle when whole and still; quality, slow-frame step, reduced motion
- [ ] Sound: break, settling clicks, a low chime per seam
- [ ] Vignette: heading, two paragraphs, figure
- [ ] docs/toys/kintsugi.md
- [ ] Handoff files: toys-entry.json, menu-li.html, menu-icon.js
- [ ] QA: console, gesture, controls, sound, 1280, 375x812, 812x375
