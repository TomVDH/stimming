---
# stimming-ugd4
title: 'Train ride: cabin surfaces PBR and bump'
status: completed
type: task
priority: normal
created_at: 2026-11-16T23:23:06Z
updated_at: 2026-11-16T23:54:56Z
parent: stimming-6z3j
---

Tom (2026-11-16): bump and PBR on the inside of the train.

- [x] Wall: laminate orange-peel bump, GGX highlight
- [x] Sill: smoother laminate, wear band, smudges
- [x] Frame and cross bar: brushed anisotropic aluminium, tRoom reflection by roughness
- [x] Seal: matte grained rubber
- [x] Glass: float waviness, smudge roughness drives the reflection mip
- [x] QA day and night, 1280 and 375, frame rate

## Summary of Changes

- Glass shader: helpers wu(), viewPx(), seeOut() (the window view mirrored by a face, spread by roughness, stretched along a brush line) and peel().
- Reveal, sill and frame mirror the window view; the frame is brushed anodised aluminium; the sill has a wear band and fingerprints; sun and night-lamp GGX highlights.
- Cross bar mirrors the cabin cube, smeared along its length.
- Wall: orange-peel bump with a soft lamp and daylight sheen.
- Seal: grained rubber sheen. Glass: float waviness bends the cabin reflection; smudges raise its mip.
