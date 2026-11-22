---
# stimming-ze9q
title: 'Window seat: polish and clarity of the outside view'
status: completed
type: task
priority: normal
created_at: 2026-11-22T09:10:22Z
updated_at: 2026-11-22T10:36:21Z
parent: stimming-w1nd
---

Tom, 2026-11-22: visual polish and clarity of the scenes outside the window.

Waits on the fog fix (one visual change at a time). First step: a short audit of each hour with stills, then one proposal to Tom.

- [x] Stills of every hour at 1280 px, Clear and Overcast
- [x] List what blurs or muddies the view, with the cause in code
- [x] Propose one change to Tom; build only his pick (sharper outside view; Tom: "Sharper + two thirds")

## Audit, 2026-11-22

Eight hours at Clear and Overcast, 1280 x 800, Standard quality, Wing left seat, headless.

| Finding | Cause in code |
|---|---|
| Clouds and coasts are soft, with stair steps on edges; city lamps are blobs | `outScale()` draws the outside at half size on Standard (0.75 on High); the glass stretches it with plain bilinear (`texture(uOut, px / uRes)`) |
| ~~Fixed grain in the clouds~~ | Wrong: `noWing()` in `window/index.html` adds `uJit`, a new jitter each frame (found 2026-11-22 while building) |
| The wing fills most of the glass; the view is a strip above it | The seat and head rest (composition, not clarity) |
| Noon paint washes out near white; Blue hour is almost black | Exposure per hour (`HOURS[].ev`) |
| Morning and Dusk: a large glare patch on the wing | Sun glint or strobe on the paint, with the glow pass on top |

## First change: sharper outside view (2026-11-22, Tom: "Yes, build it")

- `outSharp()` in `window/shader.js`: the glass fetches the outside with a five-tap Catmull-Rom instead of plain bilinear. Alpha keeps the bilinear fetch. A floor at zero stops dark rings.
- Timing, this PC, 1600 x 1000, headless ANGLE GL, a GPU finish after each frame: main about 1.3 ms; sharper upscale about 1.4 ms (noise); sharper plus the outside at two thirds on Standard 1.6 to 1.75 ms. Not timed on an office laptop.
- Checked at 1280 x 800, 375 x 812 and 812 x 375; clean console.
- Tom picked the sharper upscale with two thirds on Standard.


## Summary of Changes

- The glass fetches the outside view with a Catmull-Rom filter, not plain bilinear.
- On Standard the outside draws at two thirds of the canvas, not half. High stays at three quarters.
- Left for later passes, each its own bean on Tom's word: the wing fills most of the glass; Noon washes out and Blue hour is near black; glare patches on the wing at Morning and Dusk.
