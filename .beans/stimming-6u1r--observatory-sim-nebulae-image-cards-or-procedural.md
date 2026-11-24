---
# stimming-6u1r
title: 'Observatory sim: nebulae, image cards or procedural'
status: draft
type: task
created_at: 2026-11-23T23:34:22Z
updated_at: 2026-11-23T23:34:22Z
parent: stimming-wqq9
blocking:
    - stimming-27uv
---

Tom, 2026-11-23: flat card images for nebulae, or a procedural version. Image cards need Tom's yes on each asset and its licence. A procedural nebula uses Fire's smoke shading (shared/fire.js). Tom picks.

## Checklist

- [x] Procedural first, no outside images: observatory/src/sim/showpieces.ts lists M42, M1, M57, M27 and M51 at their real place and size; body.frag.glsl draws them (warped gas and dust lanes, filaments, rings and lobes, arms with dust and pink knots)
- [x] Brightness from each object's surface brightness, so M42's heart is about 80 times the sky
- [x] Hydrogen-alpha light in the light buffer's alpha: the Hα filter shows the gas and dims the stars
- [x] At the eyepiece the dark-adapted eye sees them grey-green
- [x] They head the TARGETS list when above 25°
- [ ] Tom picks: keep procedural, or add image cards (each image needs his yes and its licence)
