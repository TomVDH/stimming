---
# stimming-q185
title: 'Star catalog: the film grain tiles and is not gaussian'
status: in-progress
type: bug
created_at: 2026-11-25T02:54:02Z
updated_at: 2026-11-25T02:54:02Z
parent: stimming-e35i
---

Tom, 2026-11-24: "the grain tiles and isnt gaussian".

- [x] Cause found: the float hash lost precision at large pixel coordinates; the field repeated every 26 by 29 px and slid diagonally each frame (live: correlation 0.97 at 26 px, kurtosis 4.3, skew 1.4)
- [x] Grain from an integer hash per CSS pixel and frame, Box-Muller gaussian
- [x] Checked in the pane: no correlation at any lag to 40 px, kurtosis 3.0, skew 0
- [x] Doc line true
- [ ] Second source, inside the volume: the haze march's interleaved-gradient dither steps each frame at half size, so a diagonal pattern moves in the haze and corona (Tom: "not simply a 2d layer"); fix with the bake (Tom's note 4) or a quick dither swap
- [x] Tom: push it (2026-11-24)
- [ ] Tom looks at it live
