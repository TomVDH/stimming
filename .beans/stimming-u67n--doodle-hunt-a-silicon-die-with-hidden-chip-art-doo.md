---
# stimming-u67n
title: 'Doodle Hunt: a silicon die with hidden chip-art doodles (Lab, Shader type)'
status: in-progress
type: feature
created_at: 2026-11-27T07:00:59Z
updated_at: 2026-11-27T07:00:59Z
---

New Lab toy. A silicon die seen flat: thin-film iridescence, etched SDF doodles hidden in a dense chip pattern. Pan and zoom; tap a doodle when spotted; a quiet tally counts finds. Stack type: Shader (raw WebGL2 + GLSL, shared/gl.js). Sound: none for v1. Tom: 'silicon / chip -- silicon doodle kind of thing. Impressive fidelity on the shading -- this may not need to be a full 3d GPU toy', then GO.

- [x] Study vortex + shared/gl.js + shared/stim.js shell pattern
- [x] toys.json Lab entry (id: doodlehunt)
- [x] Scaffold doodlehunt/index.html with importmap word for word
- [x] Die shader: iridescence, etched pattern, microdetail
- [x] Doodles as SDFs, hit-tested, tally
- [x] Pan, zoom, tap gestures per pointer rules
- [x] Frame loop states, reduced motion, context loss
- [x] QA: node --check, sizes, clean console

## Summary of Changes

- `doodlehunt/index.html`: new Lab toy, one 27 KB page, inline module script (644 lines). One full-screen raw WebGL2 pass on `shared/gl.js` (`linked`, `program`, `tri`, `onContextLoss`). The die is a rounded rect SDF; a coarse block grid picks memory (fine cross hatch), logic (Manhattan wires with vias) or plain diffusion, with top-left height shading, thin-film cos-palette sheen tilted by the pointer, micro-scratches, grain, vignette and dither in the same pass. Seven doodles (rocket, cat, heart, fish, star, smiley, bolt) are stroke SDF primitives uploaded as uniform arrays (7 x 16 vec4 max); etch shading cuts dark with a lit rim and a faint per-doodle hue shift. Tap finds a doodle: one soft ring pulse (skipped under reduced motion, which keeps the static ring), then a persistent glow. All seven: one slow sheen sweep, then calm.
- Pan (drag after 8 px), wheel and pinch zoom to the pointer, tap under 260 ms finds; capture on press; pointercancel and lostpointercapture end the gesture. Drift sways the sheen for 60 s at 30 fps, eases to sleep over 2 s; `whenVisible` stops the loop; the watchdog steps down pixel ratio, then effect detail. Seed and finds persist in `stimming.doodlehunt.seed` / `.found`; Reset reseeds and clears. The tally is a 7-dot row in the stage bottom left, the corner this bar build leaves free.
- `toys.json`: entry `doodlehunt` in the Lab (between dieart and doubleslit), series "poke" (Poke & pop: the game is tap-to-find), accent an iridescent oklch gradient, `tech` filled by `tools/techtags.mjs --write` (tier webgl2). Only the doodlehunt entry changed.
- QA without a browser: `node --check` on the extracted module passes; the importmap diffs byte-identical to `docs/standards/code.md`; the fragment shader passes `glslangValidator`. Not verified (needs a browser): shader look, doodle legibility, bar collisions at 1280 / 375x812 / 812x375, pinch on touch hardware.

## Verdict and rename (Tom, 2026-11-26)

Tom's look: "Commendable effort here -- but this is not good at all." The toy is renamed `doodlehunt-kimi` (folder, `toys.json` key, page titles; localStorage keys follow the new id) and parked in the Lab. The id breaks the one-word rule on purpose: Tom asked for the KIMI suffix and a hyphen is the readable form. Tom wants an accurate, realistic depiction of real silicon chip art next, from web research. That redo gets its own bean.
