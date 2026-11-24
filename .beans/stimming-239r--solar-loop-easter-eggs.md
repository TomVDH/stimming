---
# stimming-239r
title: 'Solar loop: easter eggs'
status: completed
type: task
priority: normal
created_at: 2026-11-24T05:37:19Z
updated_at: 2026-11-24T06:21:07Z
parent: stimming-oh7b
---

Hidden, delightful things a curious player finds in Solar loop, grounded in real astronomy. Tom picks which to build.

- [x] Propose eggs, Tom picks (2026-11-23): hold 3 s on the star
- [x] Sun: Carrington 1859 white-light flare (Tom: good, 2026-11-23)
- [x] Betelgeuse: Great Dimming (Tom: good, 2026-11-23)
- [x] Pulsar: true voice (sound on, spins up to 11.2 Hz) (Tom: good, 2026-11-23); its tick belongs to solarloop-audio
- [x] Each egg also comes rarely on its own (about once per 25 awake minutes; never under reduced motion)
- [x] Doc section in docs/toys/solarloop.md
- [x] QA: clean console, reduced motion, idle sleep, sound muted by default (headless Chromium, Metal, 2026-11-23, on feature/stimming-on77 at 25f2cec0)

## Summary of Changes

Three eggs in `solarloop/eggs.js`, wired in `main.js`, `render.js` (uEgg and uDim in the disk pass) and `sound.js` (telegraph, dim). A 3 s still press plays them: the Carrington flare on the sun, the Great Dimming on Betelgeuse, Vela's true voice on the pulsar. Each also plays rarely on its own.

QA: each egg starts on its star; an early release runs out and does not flare; reduced motion caps the pulsar at 4 times and still plays Carrington; a forced rare egg plays, and the loop then sleeps (0 rAF, 0 timers). The console stays clean throughout.

Follow-up (owned by solarloop-audio, stimming-cpet): when `tick(at, lvl)` lands, switch `pulse()` in `main.js` to place the voice egg's ticks on the audio clock.
