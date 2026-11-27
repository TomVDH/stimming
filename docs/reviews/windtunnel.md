# Wind tunnel (`windtunnel`)

- **Shelf:** Main #50
- **Tier / Size:** `webgl2` · 57 KB
- **Verdict:** Solid, high-craft raw WebGL2 fluid sim with clean Bar v3 integration and thoughtful physics, held back mainly by missing context-loss/help wiring and a few wake-audio and shape-swap edge cases.

## Bugs
- Missing WebGL context loss handling (`windtunnel/index.html:139-147`): creates a raw WebGL2 context without `onContextLoss` from `shared/gl.js` or a `webglcontextlost` listener, so a GPU reset leaves `frame()` (`:1305-1328`) calling GL methods and `fenceSync`/`getSyncParameter` on a dead context.
- `frame()` (`windtunnel/index.html:1305-1328`) lacks a `try`/`finally` guard and schedules the next `requestAnimationFrame` on line 1306 before GL work, so a runtime error repeats every frame without recovering.
- Wake flutter reads steady wake deflection as vortex shedding (`windtunnel/index.html:1083-1089`, `hear(d)` and `:1215-1221`, `soundFrame()`): `shedEnv` tracks `Math.abs(d[5] / U)` (DC cross-wind velocity) rather than AC oscillation, so an angled wing or plate in smooth, non-shedding flow triggers continuous tremolo flutter, which also freezes at its last non-zero level when `frozen` turns `true` (`:1327`).
- Tab hide delays stopping continuous audio (`windtunnel/index.html:1452-1457`, `whenVisible`): calling `kit.rest(() => true)` uses `audioKit`'s 1500 ms `sleepMs` timeout, so the looping pink-noise and sawtooth fan oscillators keep playing for 1.5 s after hiding the tab.
- `act.reset` (`windtunnel/index.html:1422-1430`) leaves active `puffs` (`:868`), `wakeLog` (`:1061`), and `shedEnv` (`:1062`) intact, so a recent puff keeps emitting from the inlet and pre-reset wake samples affect steady-state detection for up to 2 s.
- Any mouse hover over the canvas calls `poke()` (`windtunnel/index.html:1351`), immediately thawing a steady `frozen` simulation even when the pointer only passes across the stage without clicking.

## Labels, Copy & Menu Settings
- `bar` spec (`windtunnel/index.html:109-134`) omits `help`, so Bar v3's How to play falls back to `keys` + `actions` + `options`, omitting the `↑ ↓` vertical-move binding (`windtunnel/index.html:1393-1398`) and expanding `1`-`5` into five separate shape rows.
- `toys.json:1434` has `"emblem": null` for `windtunnel` (even though `"number": 50` and `"stage": null` put it on the main shelf), so Bar v3's top-left monogram falls back to `'S'` instead of a toy emblem; `nl`, `ipa`, and `tagNl` are also `null`.
- `docs/toys/windtunnel.md:8` still lists `Shelf: Lab, tag "Stimming Lab"`, which disagrees with `toys.json:1430-1432` (`number: 50`, `stage: null`).
- `act.reset` (`windtunnel/index.html:1422-1430`) resets `Wind` and the model's pose/angle, but leaves the current `Shape` choice selected rather than returning to `Cylinder` (acceptable if intentional, worth aligning with other toys).

## Gameplay Improvements (up to 5)
1. Add mouse-wheel / trackpad scroll trimming on the stage to rotate the shape in 1-2 deg steps so users can gently find the wing's ~15 deg stall threshold without sweeping the pointer in a circle.
2. Make `Puff` support hold-to-emit (while Space or the button is held) in addition to single taps, letting users draw longer ribbons of bright tracer smoke through the vortex street.
3. Add subtle damped flick momentum when releasing a fast drag (`up()` at `windtunnel/index.html:1373`) so tossing the cylinder or duck across the tunnel sheds a transient starting vortex.
4. Let dragging along the inlet edge slide or focus the smoke rake band (or narrow its vertical span) so users can concentrate streamlines onto a wing's leading edge without extra bar controls.
5. Add a gentle cursor wake-probe interaction on hover/hold that subtly highlights nearby streamlines and pitches a soft wind tone to local flow speed when sound is enabled.

## Graphics Polish (up to 3)
1. Prevent dark silhouette voids on shape swaps and fast drags (`SADV2_FS` at `windtunnel/index.html:456`): stop writing `b = 1.0` (permanently torn) inside the shape or blend emerging interior cells back toward upstream labels so moved shapes do not leave black holes in the smoke for 1-3 s.
2. Give turbulent `torn` smoke (`SHOW_FS` at `windtunnel/index.html:563-566`, `GLOWP_FS` at `:501-508`) subtle cool-to-warm scatter tinting (`COL.haze` to `COL.smoke`) and soft density-gradient self-shadowing under the light sheet so vortex curls read with photographic depth.
3. Modulate the model's rim highlight (`SHOW_FS` at `windtunnel/index.html:585-598`) by the local smoke glow/density near the surface so bright smoke and passing puffs visibly graze the leading edge of the cylinder, wing, duck, or teapot.
