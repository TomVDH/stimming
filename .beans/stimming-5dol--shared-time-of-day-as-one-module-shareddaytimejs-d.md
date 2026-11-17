---
# stimming-5dol
title: 'Shared: time of day as one module, shared/daytime.js (decision 14)'
status: in-progress
type: task
created_at: 2026-11-17T07:25:57Z
updated_at: 2026-11-17T07:25:57Z
parent: stimming-3s8z
---

Tom, 2026-11-16: "time of day should be a module too, seeing how often it returns; lots of toys use it."

Map every toy that handles time of day, design one small module for raw WebGL2, three.js and Canvas 2D, port one reference toy with a same-frame proof, record it.

- [x] Map: every toy with time of day, what it computes, how it picks the hour, its stack, its drift from sky.js
- [x] Design: sky.js grows or a new shared/daytime.js; API with JSDoc; npm run check passes
- [x] Reference port: one toy, nothing else changes
- [x] Proof: before and after, real GPU and SwiftShader, 1280 and 375 x 812, every preset, clean console
- [x] Record: decision 14 in code-health.md, Proved modules row in ports.md, modularize.md row, AGENTS.md Layout line, docs/plans/daytime.md
- [ ] Tom's look at the before and after sheet

## Summary of Changes

- `shared/daytime.js`: `HOURS` (dawn 6.2, day 12.5, afternoon 16, golden 18.3, dusk 19.3, blue 20.6, night 23), `dayAt(hour)` (sun, moon, elevation, sunUp, moonUp, day, stars, lamps, light, level, ambient, sky), `dayClock({ hour, tau, wrap })` (to, snap, step, follow, at), `localHour`, `wrapHour`, `photocell`. Imports only `sky.js`; `sky.js` does not change.
- Fog horn is the reference port: its hours and its fog glow come from the module. 0 pixels differ in 36 of 36 frames on the real GPU (D3D11) and 36 of 36 on SwiftShader, every preset, 1280 and 375 x 812, clean console.
- `tests/daytime.test.mjs`: 9 of 9. `dayAt` equals `skyAt` bit for bit; `dayClock` equals Lanterns' ease bit for bit.
- Map, API, adoption order and drift: `docs/plans/daytime.md`. Decision 14 in `docs/code-health.md`.
