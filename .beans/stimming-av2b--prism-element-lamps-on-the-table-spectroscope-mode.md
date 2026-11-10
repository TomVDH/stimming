---
# stimming-av2b
title: 'Prism: element lamps on the table; Spectroscope mode removed'
status: completed
type: task
created_at: 2026-11-10T00:29:02Z
updated_at: 2026-11-10T00:29:02Z
parent: stimming-ubwe
---

The Spectroscope is no longer a separate view. Element lamps (Li, Na, K, Cu, Sr, Ca, Ba) are lights on the table and use its tracer and renderer. The Spectrogram piece reads their lines.

- [x] Element lines join the wavelength tables
- [x] One Light stepper: white, three lasers, seven lamps
- [x] Controls: + Piece, Clear, one Wireframe setting
- [x] Delete prism/spectro.js
- [x] Check 1280, 375x812, 812x375 with a clean console

## Summary of Changes

The table/Spectroscope mode switch and five Settings rows are gone. The default white view is pixel-identical outside the top-left control. The loupe and the strike chord of the old view are dropped.
