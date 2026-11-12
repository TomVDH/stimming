---
# stimming-4c0k
title: 'Railgun: the breech clips the mount at full recoil'
status: todo
type: bug
created_at: 2026-11-12T09:15:03Z
updated_at: 2026-11-12T09:15:03Z
parent: stimming-f793
---

Tom, 2026-11-12: at full recoil the breech already clips the architecture.

Rail slides the barrel 320 m at full power and 400 m at the over-hold peak (`stepShot`, `U.uRecoil`). The back block rides 0.85 of it.

## Checklist

- [ ] Measure the clearance point with `__qa.recoil()` and stills
- [ ] Choose: cap the slide, or move the parts that clip
- [ ] Stills at 1280, 375 x 812, 812 x 375 at full and over-hold recoil

The Salvo spec (`docs/plans/railgun-salvo.md`) caps its recoil at the same clearance point.
