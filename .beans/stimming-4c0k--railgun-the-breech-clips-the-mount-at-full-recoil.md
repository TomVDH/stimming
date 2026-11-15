---
# stimming-4c0k
title: 'Railgun: the breech clips the mount at full recoil'
status: todo
type: bug
priority: normal
created_at: 2026-11-12T09:15:03Z
updated_at: 2026-11-12T10:21:05Z
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
