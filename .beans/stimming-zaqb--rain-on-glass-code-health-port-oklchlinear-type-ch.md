---
# stimming-zaqb
title: 'Rain on glass: code-health port (oklchLinear, type check, toy doc)'
status: completed
type: task
priority: normal
created_at: 2026-11-15T11:13:56Z
updated_at: 2026-11-15T11:29:21Z
parent: stimming-3s8z
---

Second code-health port (docs/plans/ports.md, No. 22). Rain is the reference port for modularize step 2.

Scope:
- Replace the local lin() with oklchLinear from shared/stim.js. Prove with a number check: old against new, every colour the toy uses.
- Move the inline module script to rain/main.js. Add rain/*.js to tsconfig.json include. Fix npm run check with JSDoc only.
- Write docs/toys/rain.md from the template.
- Leave gl.js and output.js for their reference ports (bismuth, stone).

Proof: same frame and same sound. Headless Playwright before and after at 1280 and 375x812, clean console, interactions, sound on and off.
version in toys.json stays 1.5.

## Todo
- [x] Capture before screenshots and sound trace
- [x] Number check: lin against oklchLinear for every colour
- [x] Replace lin with oklchLinear
- [x] Move the module script to rain/main.js
- [x] Add rain/*.js to tsconfig include; record errors before and after
- [x] Write docs/toys/rain.md
- [x] After proof: frames, console, interactions, sound
- [x] Commit and push

## Summary of Changes

- `rain/main.js`: the inline module script moved here; `index.html` keeps `<script type="module" src="main.js">`. The three-line intro script stays inline after it, so the modules run in the same order.
- `oklchLinear` from `shared/stim.js` replaced `lin()`. `linear()` keeps its own gamut loop. `D2R` left with `lin()`.
- `tsconfig.json`: `rain/*.js` joins `include`. Errors: 4 before, 0 after. Fixes are JSDoc casts only: `window.webkitAudioContext`, two `e.target.closest`, one `.hidden` on an `Element`. No real bugs.
- `docs/toys/rain.md`: the toy doc. `docs/plans/modularize.md`: step 2 row corrected (not bit-equal).
- Number check (16 colours): `lin()` is not bit-equal to `oklchLinear`. It rounds the matrix to 10 digits. Largest gap 2.1e-7, 1 to 12 float32 ulps; the gamut loop count is the same for every colour.
- Proof, headless Playwright, seeded `Math.random`, `requestAnimationFrame` and `performance.now` driven by hand (exactly 1/60 s per frame). Run on the real GPU (RTX 3070, `--use-angle=d3d11`) and on SwiftShader (`--use-angle=metal` falls back to it on Windows):
  - The move alone: frames pixel-equal at 1280 x 800 and 375 x 812, after every interaction, with reduced motion; 0 of 1,369 GPU floats differ.
  - With `oklchLinear`: 239 of 1,369 GPU floats move, 14 ulps at most. 2 to 31 pixels per frame differ, each by 1 of 255.
  - Sound off: no context. Sound on: one context, the same compressor and 0.55 gain, the same loops, one suspend and resume on a toggle.
  - Console clean.
- Still open: `output.js` (after `stone`), `gl.js` (after `bismuth`), `noise.js` (after `frost`), the hand copy of the audio kit (not in Rain's ports row; Tom decides). `version` stays 1.5.
