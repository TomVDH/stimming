---
# stimming-4u0b
title: 'Googly eyes: code-health port (audioKit, type check, toy doc)'
status: completed
type: task
priority: normal
created_at: 2026-11-15T10:24:21Z
updated_at: 2026-11-15T11:10:09Z
parent: stimming-3s8z
---

First code-health port (docs/plans/ports.md, No. 27). Eyes is the reference port for modularize step 1.

Scope:
- Replace the hand copy of the audio kit (audio, live, rest, unlock) with audioKit() from shared/stim.js.
- Move the inline module script to eyes/main.js. Add eyes/*.js to tsconfig.json include. Fix npm run check with JSDoc only.
- Write docs/toys/eyes.md from the template.
- Leave gl.js, oklchLinear and output.js for their reference ports.

Proof: same frame and same sound. Headless Playwright before and after at 1280 and 375x812, clean console, interactions, sound on and off.
version in toys.json stays 1.5.

## Todo
- [x] Capture before screenshots and sound trace
- [x] Move the module script to eyes/main.js
- [x] Replace the hand copy with audioKit()
- [x] Add eyes/*.js to tsconfig include; record errors before and after
- [x] Write docs/toys/eyes.md
- [x] After proof: frames, console, interactions, sound
- [x] Commit and push

## Summary of Changes

- `eyes/main.js`: the inline module script moved here; `index.html` keeps `<script type="module" src="main.js">`.
- `audioKit()` replaced the hand copy (`audio`, `live`, `rest`, `unlock`, the `sound.onChange` hook). The kit gets Eyes' gesture keys. `rest()` passes Eyes' idle test (`!raf && !ptr`).
- `tsconfig.json`: `eyes/*.js` joins `include`. Errors: 12 before, 0 after. Eleven were DOM types (`Element`, `EventTarget`), fixed with JSDoc casts. One was `window.webkitAudioContext`; it left with the hand copy. No real bugs.
- `docs/toys/eyes.md`: the toy doc.
- Proof (headless Playwright, fake clock, seeded random; SwiftShader, because `--use-angle=metal` is macOS only):
  - The first frame is pixel equal before and after: 1280 x 800, 375 x 812, lids shut and reduced motion.
  - Later frames differ between two before runs too: the packing depends on when the observers fire in real time. Before vs after stays within that noise.
  - Sound: none with sound off; with sound on, one context, the same compressor and 0.55 gain, the same suspend and resume on a toggle, the same voice types.
  - Console: only SwiftShader driver notes, the same before and after.
- Outside the old script, every line is the same text.
- Still open: `gl.js`, `oklchLinear`, `output.js`, `noise.js`, `voices.js`, each after its reference port.
