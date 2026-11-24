---
# stimming-ap4y
title: 'Solar loop: the bar holds only the star; one heavy, seamless zoom'
status: in-progress
type: task
priority: normal
created_at: 2026-11-24T20:57:20Z
updated_at: 2026-11-24T21:12:54Z
parent: stimming-e35i
---

Tom, 2026-11-24: "we only need a star or celestial body selector there -- the zoom interface, weight and what not -- we need to redo so it's smooth, heavy, seamlessly interpolated".

Picks: star picker only (Space and L stay as keys, Activity to Settings); the chip opens the size ladder; no detents, one heavy glide; L still jumps between named stops.

- [x] Bar: only the star chip; Activity in Settings; Space, L, Left and Right as keys
- [x] Zoom path: C1 curve through the stops, no detents
- [x] Zoom motion: two critically damped followers, one Dev weight row
- [x] Check path, motion, 1280 x 800, 375 x 812, clean console (reduced motion not emulated in the pane)
- [x] Doc lines true
- [ ] Tom looks at it live

## Checks (2026-11-24)

- Path: zoom rate (d log width / dz) stays between 0.56 and 1.44 from z 0 to 4; no flat spot at a stop; largest step change 0.01.
- Motion: L from the long lens to the full star starts soft (z 0.001, 0.0015, 0.0022 on the first frames), never passes 2, 99 percent at 1.72 s.
- Space flares; the wheel sets the target and shows the rail; Activity and Zoom weight rows present; clean console at 1280 x 800 and 375 x 812.

## Magnet notch (Tom, 2026-11-24)

- [x] One magnet notch: a pause within 0.3 of the full star settles there
- [ ] Tom tries the notch live

## Farther, heavier in (Tom, 2026-11-24)

- [x] The farthest zoom pulls back 32 times (was 16); rail labels come from the pull-back
- [x] Zooming in takes 1.4 times as long: 2.5 s against 1.7 s out, measured
- [x] Tidy: the stored zoom was never read, so it goes; far is worked out once
