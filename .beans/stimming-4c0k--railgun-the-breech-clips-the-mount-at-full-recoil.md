---
# stimming-4c0k
title: 'Railgun: the breech clips the mount at full recoil'
status: completed
type: bug
priority: normal
created_at: 2026-11-12T09:15:03Z
updated_at: 2026-11-16T19:09:50Z
parent: stimming-f793
---

Tom, 2026-11-12: at full recoil the breech already clips the architecture.

Rail slides the barrel 320 m at full power and 400 m at the over-hold peak (`stepShot`, `U.uRecoil`). The back block rides 0.85 of it.

## Checklist

- [ ] Measure the clearance point with `__qa.recoil()` and stills
- [ ] Choose: cap the slide, or move the parts that clip
- [ ] Stills at 1280, 375 x 812, 812 x 375 at full and over-hold recoil

The Salvo spec (`docs/plans/railgun-salvo.md`) caps its recoil at the same clearance point.


Salvo pass (2026-11-12): stills from 0 to 400 m show the breech overhanging the mount from about 280 m. Tom set the Salvo cap at 240 m. Rail still slides 320 m (full) and 400 m (over-hold).

## Summary of Changes

2026-11-16 (stimming-shkv): the trunnion rises 75 m (TRUN_Y 290) and the counterweight 10 m, so the breech clears the deck at rest up to 36 degrees. Recoil is variable: `recoilRoom()` caps the slide by elevation so the counterweight's low back corner keeps 12 m over the deck (full 400 m up to about 15 degrees, about 290 m at 20, none at 36). The slide rods ride the back block and draw out of the housing, so the block never floats. Stills at 8, 20 and 36 degrees show no clip.
