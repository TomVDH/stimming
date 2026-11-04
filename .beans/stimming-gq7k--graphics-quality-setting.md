---
# stimming-gq7k
title: Graphics quality setting for the three.js toys
status: in-progress
type: task
priority: normal
created_at: 2026-11-04T09:00:00Z
updated_at: 2026-11-04T09:00:00Z
---

Tom wants a Quality setting in Settings on every three.js toy. High renders at 100% of the screen resolution. Standard keeps today's caps. Many toys render below 100% because a pixel budget caps the backing size.

The preference is site-wide (`stimming.quality`). Sonar is out of scope: its own session adds the setting.

- [x] Shared: `quality()`, `setQuality()`, `onQuality()`, `pixelRatio()` and `qualitySetting()` in `shared/stim.js`
- [x] Shared: the Settings tray in `shared/stim.css` for toys without one
- [x] Pop field first, QA, screenshots for Tom
- [ ] Main shelf: morpher, fidget (no three.js), domino, pins, galaxy, prism
- [ ] Lab three.js toys, one commit each
- [ ] Star trails (WebGL2, fitCanvas)
- [ ] Night viaduct: its Quality group follows the shared setting
