---
# stimming-kvyo
title: 'Railgun: cragged ranges, skyline spread, face bump'
status: completed
type: task
priority: normal
created_at: 2026-11-16T19:54:32Z
updated_at: 2026-11-16T20:04:32Z
---

Tom, 2026-11-16: the far ranges need more detail, slightly cragged; a better spread across the scene, with one gentle flat gap; the sides and fronts take a bump, as the card clouds do.

- [x] Spread the skyline with one gentle gap
- [x] Slight crags in the range height: landed as Erosion in stimming-75xm (894cea4d)
- [x] Face bump in the light (uBump)
- [x] QA: stills, cost

## Summary of Changes

- Skyline: a seventh range holds the right edge; the shelf behind the gun stands taller; low foothills leave one gentle gap right of the middle.
- Crags: the far-bake session (stimming-75xm) landed erosion in the height first, so this bean does not repeat it.
- Face bump: `farBump` tilts the light normal on walls by a detail field (vertical flutes, faint strata), as the card clouds do. It works in Live and Bake. Dev row Face bump (0 to 2). Cost within noise (bake about +0.1 ms).
- QA hook: `__qa.bump(v)`.
