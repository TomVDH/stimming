---
# stimming-6kmq
title: 'Lava lamp: soft 3D redo with more play'
status: completed
type: task
priority: normal
created_at: 2026-11-03T20:06:21Z
updated_at: 2026-11-03T20:27:48Z
---

Tom asked for a simpler lamp model and more interactivity. Chosen: soft 3D look (matte body, no room, wider glass) with grab and tear, finger heat, tip and flip.

- [x] Keep the old build as lava/legacy.html, set legacy: true
- [x] Soft 3D lamp shader: matte clay base and cap, wide glass, no room
- [x] Grab and tear: a lobe follows the finger, the neck snaps
- [x] Finger heat: hold the liquid, wax warms and drifts to it
- [x] Tip: drag the lamp, gravity turns, weeble return
- [x] Flip: a button turns the lamp over with GSAP
- [x] Sound through audioKit and Tone
- [x] QA at 1280px and 375px, clean console
- [x] Commit and push
- [x] Live on GitHub Pages: https://tomvdh.github.io/stimming/lava/ (the Artifact is retired)

## Summary of Changes

- `lava/index.html`: a new soft 3D lamp. A raymarched matte clay base and cap sit round a wide glass, with no room.
- Play: grab and tear (lobe and neck), pull from the pool, finger heat, tip by hand with a weeble return, Flip with GSAP.
- Sound: hum, creak, slosh and gloops on the shared audio kit with Tone.
- `lava/legacy.html` keeps the old photoreal build; `toys.json` sets `legacy: true`.
- QA: 60 fps at 1280px and 375px, clean console, a stress run with multi-touch.
