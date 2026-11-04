---
# stimming-gq7k
title: Graphics quality setting for the three.js toys
status: completed
type: task
priority: normal
created_at: 2026-11-04T09:00:00Z
updated_at: 2026-11-04T14:00:00Z
---

Tom wants a Quality setting in Settings on every three.js toy. High renders at 100% of the screen resolution. Standard keeps today's caps. Many toys render below 100% because a pixel budget caps the backing size.

The preference is site-wide (`stimming.quality`). Sonar is out of scope: its own session adds the setting.

- [x] Shared: `quality()`, `setQuality()`, `onQuality()`, `pixelRatio()` and `qualitySetting()` in `shared/stim.js`
- [x] Shared: the Settings tray in `shared/stim.css` for toys without one
- [x] Pop field first, QA, screenshots for Tom
- [x] Main shelf: morpher, domino, pins, galaxy, prism (fidget has no three.js)
- [x] Lab three.js toys, one commit each
- [x] Star trails (WebGL2, fitCanvas)
- [x] Night viaduct: its Quality group follows the shared setting

## Summary of Changes

28 toys get a Quality group in Settings: every three.js toy except Sonar, plus Star trails. Toys without Settings get the shared tray (`.stim-set` in `shared/stim.css`) before the (i).

- Standard keeps each toy's caps unchanged. High sets the pixel ratio to the screen's own, up to 3, with no budget.
- The choice is site-wide in `stimming.quality` and switches live, also across tabs.
- Night viaduct keeps Low as its own tier: Low | Standard | High. Fire keeps Low and Medium: Low | Medium | Standard | High.
- Headless Chromium at 1280px and 375px, 1x, 2x and 3x: on High, every main canvas measures CSS size times devicePixelRatio. Consoles are clean, except the WebGPU device-lost errors that Fire and Galaxy also log on main in this headless browser.
- Glass at phone width now takes three rows in its bar instead of two.
