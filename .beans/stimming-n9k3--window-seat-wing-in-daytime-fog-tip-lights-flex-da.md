---
# stimming-n9k3
title: 'Window seat: wing in daytime fog, tip lights, flex damping, curved winglet'
status: in-progress
type: task
created_at: 2026-11-15T09:26:56Z
updated_at: 2026-11-15T09:26:56Z
parent: stimming-w1nd
---

Tom, 2026-11-15: the wingtip shades wrongly in fog, the wing does not blend with daytime cloud, the wing wobbles too much, and the wingtip is not Airbus-like.

- [x] Daytime fog takes the sun's light (uFogSun), in the outside pass and on the aircraft
- [x] In a bank the skin takes the fog's own light; hard sun and the clear-sky mirror fade
- [x] Tip lights dim by day on skin and in fog (uFogLamp, lampK); Classic keeps its glow
- [x] Shaded faces take the ground's bounce, so the winglet is no longer black
- [x] Wing flex damped: ratios 0.07 and 0.1 to 0.6 and 0.7, step overshoot 80% to 8%
- [x] Winglet reshaped after the A350: one long curve, raked, 2.3 m tall

## Summary of Changes

window/wing3.js: bounce and fog lights, sun and environment fade in fog, lamp scale, flex damping, 28 winglet sections.
window/shader.js: uFogSun and uFogLamp in stormAir, nearFog and the tower fog.
window/index.html: dayK, lampK, fogStrobe, fogSun; the new WINGLET curve.
window/legacy.html: sets uFogLamp so Classic looks as before.
Checked in the browser at Noon, Morning, Dusk and Midnight, clear and in fog; console clean.
