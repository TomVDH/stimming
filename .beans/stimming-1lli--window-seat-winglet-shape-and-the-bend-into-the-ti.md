---
# stimming-1lli
title: 'Window seat: winglet shape and the bend into the tip'
status: completed
type: task
priority: normal
created_at: 2026-11-15T07:48:53Z
updated_at: 2026-11-15T07:52:51Z
---


Tom (2026-11-14): fix the winglet's shape and the bend.
Today the root is 1.25 m against a 1.6 m wing tip and sits 35 cm aft. The 0.6 m bend gets about 5 of 16 sections, so it shades in steps.

- [x] The root continues the wing tip: same chord, leading edge, camber and height
- [x] A wider bend, sampled densely, so it shades smoothly
- [x] Chord tapers and the leading edge sweeps back smoothly up the blade
- [x] The tip lights and the ray-test quad follow the new shape
- [x] QA: clean console, fps, 1280 and 375 px screenshots, before and after close-ups

## Notes

- `WINGLET(u)` in `window/index.html`: a 1.1 m bend to 80 degrees, then a 1.7 m blade.
- Chord: 0.5 + 1.1 (1 - u)^1.6 m, so 1.6 m at the root and 0.5 m at the tip. The trailing edge sweeps 0.5 m aft.
- `wing3.js` lofts 30 sections, bunched toward the root (u = (i / 29)^1.5). It uses the wing's own 18-step chord spacing.
- The root ring is the wing tip's own section at z = 25. The offset to the plain blade fades out by u = 0.3, inside the bend.
- `TIP` and `LET` follow `WINGLET`, so the nav light, the strobe and the ray tests moved with it.
- QA (headless shell, ANGLE D3D11): 60 fps at 1280 and 375 px; no console errors.
- Dark inner face (Tom: lighten it): the paint's sky map turns every downward direction into horizon sky, so nothing lit the blade from below.
- A hemisphere light now adds light up from land and cloud: albedo 0.1 to 0.7 by the Cloud setting, times 0.8 for the air, times 4 for bounce off the wing and haze.
- A 20x test lit the blade fully, so its normals are right.

