---
# stimming-5yrr
title: 'Tornado alley: Window, rain, bokeh and grain Dev rows'
status: completed
type: task
priority: normal
created_at: 2026-11-17T08:02:33Z
updated_at: 2026-11-17T08:13:58Z
parent: stimming-dwwg
---

Dev group Window in Tornado alley: Glass, Drops, Fog, Bokeh, Rain, Grain. Each row sets the shared environment runner's state. Defaults keep the shot as it was.

- [x] Dev rows, persisted, with ?glass= and the like for one load
- [x] Sun behind the eye or the storm: no lamp glow on the pane
- [x] Live toggle check, no console errors
- [x] Stills in docs/qa/tornado-window/

## Summary of Changes

- tornado/main.js: Window rows and act.look; the runner's sky switch follows glass or rain, for its daylight on drops; wind drives the pane's air speed (wind x 12 m/s).
- sunFlare moves the key light off the frame when the sun gives no flare.
- No shared file changes.

## Rain tune (Tom picked rain first)

- The scene draws the near rain with ppRain at 1.8x scale: shorter, finer, slower streaks.
- Light: the sun's colour and the sky's fill. A grey veil on the far plain and the sky.
- Slant from the wind across the frame, at most about 25 degrees.
- The runner's rain in the air stays off; the sky switch follows Glass only.

## Drop blur (Tom: the drops on the camera glass, not the rain)

- tornado/pane.js: the drop field at quarter size, a 32-tap disc gather, then a small second gather.
- The runner's glass step (its glass and pane options) reads the blurred field. Drop blur 0 keeps the sharp pane.
- Dev row Drop blur, 0 to 0.04 frame heights, default 0.01.
