---
# stimming-5dh6
title: 'Oscilloscope: hot spots on the main scope glow as squares'
status: in-progress
type: bug
priority: normal
created_at: 2026-11-24T22:07:46Z
updated_at: 2026-11-24T22:12:33Z
---

Tom (2026-11-24): the main voice display shows square glow everywhere.

Cause: the bloom blurs raw HDR energy with a truncated separable kernel (square support), then tone maps; the beam quad ends at 3.5 sigma with a nonzero gaussian. A hot spot makes both edges visible.

- [x] Bloom input passes a soft knee (caps hot light near 6); the blur is a true gaussian (sigma 3.9 bloom texels, 17 taps, out to 4 sigma), so a halo is round at any brightness
- [x] Beam kernel falls to exactly zero at the quad edge (quad now 4 sigma)
- [x] Browser check with a song and a Pen cube: halos round, console clean, frame time unchanged (headless; the main voice trace did not show in headless)
- [ ] Tom checks on his screen

## Notes

A node sim of the old bloom on one hot spot: at 12 bloom texels the diagonal was 4x the axis (0.112 vs 0.029), so the halo was a square. The new blur gives equal axis and diagonal values, and the same halo as before for a normal spot.
