---
# stimming-6kmq
title: 'Lava lamp: soft 3D redo with more play'
status: in-progress
type: task
priority: normal
created_at: 2026-11-03T20:06:21Z
updated_at: 2026-11-03T20:25:57Z
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
- [ ] Publish to the Artifact (blocked: the live Artifact still runs an old menu and an old shared shell, with no intro.js or toys.json; this page needs the current shell)
