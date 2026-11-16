---
# stimming-m4z6
title: 'Window seat: shadows follow the moving wing; PBR skin detail'
status: completed
type: task
created_at: 2026-11-15T09:39:38Z
updated_at: 2026-11-15T09:39:38Z
parent: stimming-w1nd
---

Tom, 2026-11-15: shadow flashes over the wing when banking, false self-shadowing, and a better PBR wing material.

- [x] The shadow pass bends the wing as the colour pass does (customDepthMaterial)
- [x] The shadow maps redraw whenever bank, flex, aileron, seat or sun move; five times a second at rest
- [x] Skin: semi-gloss topcoat, panel seams, grime streaks, tone and roughness variation, a wandering normal
- [x] Bare-metal lip on the leading edge and the winglet, with no clear coat

## Summary of Changes

window/wing3.js only. Lofts carry aSurf (chord fraction, span, chord); SKIN_GLSL reads it in the paint materials. depthMat repeats the flex for the shadow maps. Checked in the browser: console clean, sheen and seams show; the banking case is not reproduced by hand.
