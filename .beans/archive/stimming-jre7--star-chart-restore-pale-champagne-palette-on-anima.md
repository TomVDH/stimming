---
# stimming-jre7
title: 'Star Chart: restore pale champagne palette on animated menu icon'
status: completed
type: task
created_at: 2026-11-27T07:09:16Z
updated_at: 2026-11-27T07:09:35Z
---

Restore the pale ivory-champagne colour palette from the previous Star Chart menu icon onto the new animated solar icon in `index.html` (Tom, 2026-11-26).

## Summary of Changes
- Replaced the saturated amber-orange stops in the `starchart` SVG gradients, prominence strokes, photosphere ovals, and lens ghosts in `index.html` with the low-chroma pale ivory/champagne starlight palette (`C` 0.015 to 0.06, hues 58 to 88, `#fff` core) from `ce785e2d^`.
- Kept the new animated geometry and 30 fps hover loop unchanged.
