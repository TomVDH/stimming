---
# stimming-qi6k
title: 'Railgun: the fireball''s first seconds'
status: in-progress
type: task
created_at: 2026-11-15T06:14:33Z
updated_at: 2026-11-15T06:14:33Z
parent: stimming-f793
---

Tom (2026-11-14): the blast comes first in the visuals pass. At 3 s the fireball reads as a flat glowing disc: pure glow, no soot in front of it, no shade or limb, clipped to white by bloom.

## Checklist

- [x] Fire: hot knots and dark lit soot veins from the first second, not a clear glow
- [x] Fire: a hot core and a cooler skin after the first flash, so the ball has a limb
- [x] Fire: brightness held under the clip at 2 to 6 s; the flash stays
- [x] Stills at 1, 3, 5, 8 s before and after; 1280 and 375 x 812
- [x] Frame cost near the old one; clean console
- [ ] Tom's verdict

## Notes

- Fireball `dens()` only; the soot stage after about 6 s is unchanged.
- Knots: a broad 3D noise cell (0.42 scale) blended with the old fine cell; they come in from 0.6 s and ease after 4 s.
- Veins: their own density inside the fire, lit by the fire's `vlight`; gone by 5.5 s.
- The first second keeps its old glow and wash; the glow dips 1 to 6 s.
- Cost: one more 3D noise read per fire sample. Headless frame timings sit inside their own noise.
