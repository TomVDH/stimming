---
# stimming-ucbp
title: 'Toy: Subway'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-09T07:42:55Z
updated_at: 2026-11-09T07:49:17Z
---

Subway (`subway`, Lab). A static Dutch-angle shot of a dim subway cabin: floor, benches, poles, windows. Tunnel lamps pass outside; their light sweeps pools and shadows over the floor and seats. Reuses Train Ride's analytic motion blur, lamp streaks, bloom and grain.

Plan: shadows are exact intervals of lamp x (window minus occluders), convolved with the lamp box plus the shutter smear.

- [x] Page shell and cabin geometry
- [x] Analytic tunnel light and shadows
- [x] Windows: tunnel view and lamp streaks
- [x] Hold to brake
- [x] Sound: rumble, joint clacks, tunnel roar (not checked by ear)
- [x] toys.json and Lab menu entry (nl Metro: pending Tom)
- [ ] Browser check at 1280 and 375
