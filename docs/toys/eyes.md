# Googly eyes (`eyes/`)

<!-- gen:identity -->
| | |
|---|---|
| Dutch | Wiebelogen /ˈʋibəlˌoːɣə/ |
| Motto | They saw that / Da hebben ze gezien |
| Shelf | Main, number 27 |
| Stage | None |
| Series | None |
| Accent | `oklch(0.9 0.17 100)` |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |
<!-- /gen:identity -->

S tier (`AGENTS.md`, Taste). The look and the feel must not change in a port.

## Idea

A packed cluster of 22 to 34 googly eyes on a dusky stage. Each pupil is a free disc in a clear dome: it falls with gravity, rattles on the rim and ticks.
The eyes watch the pointer, blink, stare at a partner, get bored and get dizzy when the pointer circles them.

## Controls

<!-- gen:bar -->
Bar: v3, the Signal bar, over Bar v2 (`eyes/main.js:8`, `signal: true`).

| Slot | Holds |
|---|---|
| Top left (choice) | None |
| Bottom left (actions) | `Shuffle`, `Shake`, `Blink` (B) |
| Bottom right (slider) | None |
| Key strip (Bar v2) | click blink an eye; drag move an eye; drag round make the eyes dizzy; space shake the eyes |
| How to play (Bar v3) | Eleven rows, one instruction each: click, drag, circle, the arrows, Shift and the arrows, Enter, B, D, Space |
| Settings | Quality only |
| Dev (`?dev`) | None |
<!-- /gen:bar -->

| Gesture | Does |
|---|---|
| Click or tap | On an eye: that eye blinks; its partner may copy it. On empty space: a wave of blinks spreads from the point |
| Drag | On an eye: lifts and moves it, with a shadow. On empty space: yanks the board, so every pupil rattles |
| Circle the pointer | Two and a half turns make the eyes dizzy: pupils whirl, eyes cross, lids droop |
| Keys | Arrows move a gaze mark; Shift with arrows drags the nearest eye; Enter blinks one; B blinks all; D dizzy; Space shakes |
| Wheel, pinch, tilt | None |

## Renderer and libraries

<!-- gen:stack -->
| | |
|---|---|
| Tier | Raw WebGL2 |
| Libraries | None. The page has no importmap; `shared/stim.js` loads culori by URL |
| Importmap | None |
<!-- /gen:stack -->

Stack type Shader (`docs/code-health.md`): the eyes are instanced quads, each one shaded per pixel.

## Shared modules

<!-- gen:shared -->
| Module | Imports |
|---|---|
| `shared/stim.js` | `initPage`, `sound`, `audioKit`, `onQuality`, `pixelRatio`, `stage`, `idle`, `pageReady` |
| `shared/intro.js` | `intro` |
<!-- /gen:shared -->

Local copies of shared code (drift), from `docs/plans/modularize.md`. Each one waits for its reference port:

| Copy | Where | Module | Reference port |
|---|---|---|---|
| `lin()`, the OKLCH matrix | `main.js:36` | `oklchLinear` (step 2) | `rain` |
| `srgb()` with clamp, `knee()` | `main.js:678` (GLSL `COMMON`) | `shared/output.js` (step 3) | `stone` |
| `compile`, `uni`, the parallel-compile poll (family C) | `main.js:881` | `shared/gl.js` (step 4) | `bismuth` |
| Hoskins `hash` | GLSL `COMMON` | `shared/noise.js` (step 9) | `frost` |
| `bus`, `burst`, `track`, `jit`, `level` | `main.js:70` to `:106` | `shared/voices.js` (step 7, waits for Tom) | `fireworks` |

`linear()` keeps its own gamut loop on top of `lin()`: chroma shrinks by 0.9 until the colour fits. culori fits another way, so only `lin()` can move.

## Files

<!-- gen:files -->
| File | Lines | Role |
|---|---|---|
| `index.html` | 47 | The page: markup, stage style, one `<script type="module" src="main.js">` |
| `main.js` | 1330 | The toy's module; `npm run check` type-checks it |
<!-- /gen:files -->

## Render pipeline

One pass to the screen, no render targets. Blending is premultiplied (`ONE`, `ONE_MINUS_SRC_ALPHA`).

| Pass | Target | Shader or material | Does |
|---|---|---|---|
| 1. Stage | Screen | `TRI` + `BG_FS` (`:684`) | Dusky radial gradient, two coloured pools of light, dither |
| 2. Shadows | Screen | `EYE_VS` + `SHADOW_FS` (`:726`) | A soft shadow for each eye, away from the key light; larger for a lifted eye |
| 3. Eyes | Screen | `EYE_VS` + `EYE_FS` (`:744`) | Rim (coloured plastic or white flange), the dome with backing, pupil and caustic, then the lid |
| 4. Lifted eye | Screen | Passes 2 and 3 again for one eye | A held eye draws last, so it shades the eyes under it |
| 5. Gaze mark | Screen | `RING_VS` + `RING_FS` (`:867`) | Keyboard only: a small ring in the focus colour |

Instance data: 20 floats per eye, 48 eyes at most (`writeInst`).

### Uniforms

Every colour is OKLCH, made linear by `linear()` and set once after compile.

| Uniform | Type | Meaning | Range or default |
|---|---|---|---|
| `uBgIn`, `uBgOut` | `vec3` | Stage centre and edge | `oklch(0.25 0.06 292)`, `oklch(0.12 0.03 284)` |
| `uGlowA`, `uGlowB` | `vec3` | Magenta pool top left, teal pool bottom right | `oklch(0.36 0.13 342)`, `oklch(0.34 0.09 205)` |
| `uWhite`, `uPupil` | `vec3` | Backing and pupil | `oklch(0.965 0.012 95)`, `oklch(0.17 0.015 280)` |
| `uCaus` | `vec3` | Caustic light inside the dome | `oklch(0.98 0.035 85)` |
| `uEnvA`, `uEnvB`, `uEnvTop`, `uEnvLow` | `vec3` | Studio reflected in the plastic: magenta lamp, teal lamp, walls | |
| `uShade` | `vec3` | Shadow colour | `oklch(0.09 0.035 290)` |
| `uExt`, `uLift` | `float` | Quad size per pass; shadow growth for a lifted eye | 1 or 1.3; 0 or 0.55 |

Rim and lid colours come from eight series hues (`HUES`), one per eye, never twice in a row.

## Sound

| | |
|---|---|
| Graph | `audioKit({ keys })` (`main.js:75`). The keys are B, D, the arrows, Space and Enter |
| Engine | Raw Web Audio |
| Voices | Tick: a pupil hits its dome; two noise bursts and a short triangle, higher for small eyes, panned by place. Rattle: a rolling pupil ticks soft. Pip: each blink, a rising sine on a pentatonic scale, lower for big eyes |
| Limits | 24 voices at most; hits in one frame queue a few milliseconds apart |
| Sleep | `kit.rest()` 1.5 s after the loop stops, when no pointer is down. A hover over a sleeping context wakes it after the first gesture |

## Quality and performance

| | |
|---|---|
| Pixel ratio | `pixelRatio(w, h, { maxDpr: 2, budget: 1.4e6, low })` (`:1024`) |
| Slow-frame step | Own watch: 24 net frames over 30 ms drop one quality step; a new quality choice clears it (`:1324`) |
| Idle | The loop stops after 12 quiet frames. Idle life (`plan`) can wake it every 2.2 to 5.5 s |
| Reduced motion | No opening ripple and no idle life; short blinks; the board shake shows at 0.3; no dizzy wobble |
| Measured | Not measured yet |

## State and storage

| Key | Holds |
|---|---|
| `stimming.eyes.sound` | Sound on or off |
| `stimming.quality` | Site-wide graphics quality |

## Tests and QA

No test file in `tests/`.
A change must give the same frame and the same sound. Port proof of 2026-11-15 (bean `stimming-4u0b`), headless Playwright with a fake clock and a seeded `Math.random`:

- The first frame (the seeded cluster after `pack(500)`, before any physics) is equal to the pixel at 1280 × 800 and 375 × 812, with lids shut and with reduced motion.
- After the first frame, physics depends on when the observers fire in real time, so later frames differ between two runs of one build. Compare those by eye.
- The audio log records each context, `resume`, `suspend` and every started voice. Sound off makes no context. Sound on makes one context with the same compressor (-12, 6, 4, 0.002, 0.12) and an output gain of 0.55.

## Known issues

None.

## Legacy build

None.

## History

| | |
|---|---|
| Epic | `stimming-80dc` (Bar v2), `stimming-3s8z` (code health) |
| Beans | `stimming-4yxl` (Bar v2), `stimming-ssbt` (main shelf, v0.5.1), `stimming-4u0b` (code-health port) |
| Version | `v0.5.1` set by this toy. `version` in `toys.json`: 1.5 |
| Code-health port | 2026-11-15: `audioKit()` replaced the hand copy; the script moved to `main.js`; the type check went from 12 errors to 0 |
