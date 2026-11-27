# Rain on glass (`rain/`)

<!-- gen:identity -->
| | |
|---|---|
| Dutch | Belgisch weer /ˈbɛlɣis ˈʋeːr/ |
| Motto | Pick a drop. That's your horse now. / Het regent pijpenstelen. |
| Shelf | Main, number 22 |
| Stage | None |
| Series | Light & glass |
| Accent | `oklch(0.82 0.1 245)` |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |
<!-- /gen:identity -->

A shader-rich toy that Tom likes (`AGENTS.md`, Taste). The look and the sound must not change in a port.

## Idea

A fogged window at dusk, with a blurred street of lights behind it. Rain lands, beads, merges and runs down in tracks; spray mists the pane, and the fog grows back.
A finger or the arrow keys wipe the fog away, and the glass squeaks. The Wind slider pushes the runs sideways, as on a bus window.

## Controls

<!-- gen:bar -->
Bar: v3, the Signal bar, over Bar v2 (`rain/main.js:36`). Copy rewritten 2026-11-17.

| Slot | Holds |
|---|---|
| Choice | `Weather`, segments: Drizzle, Rain (default), Storm |
| Actions | None |
| Slider | `Wind`, 0 to 1, default 0 |
| How to play (`help`) | click: Wipe a spot; drag: Wipe the fog; ← → ↑ ↓: Wipe a stripe; space: Select the next weather |
| Key strip (Bar v2, `keys`) | click wipe a spot; drag wipe the fog; arrows wipe a stripe; space select the next weather |
| Settings | Quality only. No Reset |
| Dev (`?dev`) | None |
<!-- /gen:bar -->

| Gesture | Does |
|---|---|
| Click or tap | Wipes one round spot. Drops in the spot go; drops at its edge are pushed aside and may pool |
| Drag | Wipes a stroke. A fast stroke squeaks the glass. Several fingers wipe at once |
| Keys | Arrows sweep one stripe across the pane, from the middle out; Space steps to the next weather |
| Wheel, pinch, tilt | None |

## Renderer and libraries

<!-- gen:stack -->
| | |
|---|---|
| Tier | Raw WebGL2 |
| Libraries | None. The page has no importmap; `shared/stim.js` loads culori by URL (`modulepreload` in the page) |
| Importmap | None |
<!-- /gen:stack -->

Stack type Shader (`docs/code-health.md`): a flat pane shaded per pixel, with the drops as instanced quads on render targets.

## Shared modules

<!-- gen:shared -->
| Module | Imports |
|---|---|
| `shared/stim.js` | `initPage`, `sound`, `onQuality`, `pixelRatio`, `stage`, `idle`, `oklchLinear`, `pageReady` |
| `shared/intro.js` | `intro` |
<!-- /gen:shared -->

Local copies of shared code (drift), from `docs/plans/modularize.md`:

| Copy | Where | Module | State |
|---|---|---|---|
| `lin()`, the OKLCH matrix | Was `main.js:73` | `oklchLinear` (step 2) | Done: Rain is the reference port |
| `srgb()` with clamp, `knee()` | `main.js:826` (GLSL in `COMP_FS`) | `shared/output.js` (step 3) | Open: waits for its reference port, `stone` |
| `compile`, `uni`, the parallel-compile poll, `target`, `texParams` (family C) | `main.js:891` to `:1018` | `shared/gl.js` (step 4) | Open: waits for its reference port, `bismuth` |
| Hoskins `hash`, `vnoise` | GLSL in `COMP_FS` | `shared/noise.js` (step 9) | Open: waits for `frost` |
| `audio`, `live`, `unlock` (a hand copy of the audio kit) | `main.js:165` to `:203` | `audioKit()` (step 1, proved by `eyes`) | Open. Not in Rain's row of `docs/plans/ports.md`; Tom decides |
| `jit`, `level`, `track` | `main.js:161` to `:196` | `shared/voices.js` (step 7) | Waits for Tom |

`linear()` keeps its own gamut loop on top of `oklchLinear`: chroma shrinks by 0.9 until the colour fits. culori fits another way, so only the matrix moved.

## Files

<!-- gen:files -->
| File | Lines | Role |
|---|---|---|
| `index.html` | 55 | The page: markup, stage style, `<script type="module" src="main.js">`, then the three-line intro script |
| `main.js` | 1300 | The toy's module; `npm run check` type-checks it |
<!-- /gen:files -->

The intro script stays inline in the page, after `main.js`, so the modules run in the same order as before the move.
`main.js` keeps the MIT notice for the parts that follow Radiant's Rain on Glass and Codrops' RainEffect.

## Render pipeline

Two half-size and quarter-size backdrops, two full-size water maps, then one composite to the screen. Targets are RGBA16F when the GPU can render to float; else RGBA8.

| Pass | Target | Shader or material | Does |
|---|---|---|---|
| 1. Sharp street | `sharp`, half size, mipmapped | `TRI` + `BG_FS`, then `BOKEH_VS` + `BOKEH_FS` (additive) | Sky, skyline and wet street; each light as a disc. The drops sample it through their lens |
| 2. Soft street | `soft`, quarter size | The same, with `uBlur` 1 | The street as the fog shows it: wide soft bokeh |
| 3. Mist | `mist`, full size, kept | `DROP_VS` + `DROP_FS`, modes 0, 1, 2 | Spray stamps add; moving drops and wipes erase; every 0.5 s a faint sheet dries the old mist |
| 4. Wet | `wet`, full size, cleared | `DROP_VS` + `DROP_FS`, mode 0 | Every live drop stamps the drop bitmap: lens offset in R and G, depth in B, mask in A |
| 5. Composite | Screen | `TRI` + `COMP_FS` (`:808`) | Fog mixes sharp to soft and lifts the darks to a haze; drops refract `sharp` with a rim and a hot highlight; vignette, `knee`, `srgb`, dither |

Instance data: six floats per stamp (place, size, turn, height up and down), in device pixels. The fog is a CPU grid of 4 px cells, sent as an R8 texture.

### Uniforms

Every colour is OKLCH, made linear by `linear()` (`oklchLinear` plus the gamut loop) and set once after the link.

`BG_FS` (the street):

| Uniform | Type | Meaning | Range or default |
|---|---|---|---|
| `uSkyTop`, `uSkyMid` | `vec3` | Sky at the top, sky low | `oklch(0.27 0.06 272)`, `oklch(0.38 0.075 298)` |
| `uGlow` | `vec3` | City glow on the horizon | `oklch(0.54 0.085 42)` |
| `uBldg` | `vec3` | Buildings | `oklch(0.2 0.03 285)` |
| `uStreet`, `uSheen` | `vec3` | Street near, wet sheen far | `oklch(0.15 0.02 280)`, `oklch(0.34 0.055 330)` |
| `uRoof[40]` | `float[]` | Roof heights, in panel heights, from a seeded random | 0.19 to 0.44 |
| `uA` | `float` | Panel aspect | |
| `uBlur` | `float` | Edge softness | 0.026 sharp, 0.09 soft |

`BOKEH_VS` (the lights): `uBlur` is 0 for the sharp pass and 1 for the soft pass; `uT` is the time in seconds, half speed with reduced motion. Light colours (`LIT`): lamp, warm, cool, head, tail, teal, rose, blue, go, each an OKLCH value in `main.js:88`.

`DROP_FS`:

| Uniform | Type | Meaning | Range or default |
|---|---|---|---|
| `uMode` | `int` | 0 stamps the drop bitmap, 1 erases, 2 dries | |
| `uAmt` | `float` | Drying per sheet | 0.016 |

`COMP_FS`:

| Uniform | Type | Meaning | Range or default |
|---|---|---|---|
| `uHaze` | `vec3` | Colour the fog lifts toward | `oklch(0.5 0.022 285)` |
| `uPull` | `float` | Lens pull of a drop, in device pixels | 0.2 × canvas width |
| `uPr` | `float` | Device pixels per CSS pixel | |

## Sound

| | |
|---|---|
| Graph | Own context (drift): `audio()`, `live()`, `unlock()` (`main.js:165`). Compressor -12, 6, 4, 0.002, 0.12; output gain 0.55 |
| Engine | Raw Web Audio |
| Voices | Bed: 5.3 s of pink noise, low-passed, with a high hiss and an LFO on each. Patter: 7.1 s of tiny damped rings. Wind: slowed noise through a band that climbs with the slider. Squeak: a sawtooth through a narrow band, in short chirps while a wipe moves fast. Drip: a rising plink and a click when a big drop runs or merges, panned by place |
| Limits | 12 drip voices; a drip waits 0.08 to 0.28 s after the last |
| Sleep | The context suspends when the pane leaves the screen or the tab hides, and when sound goes off |

Weather sets the bed level, the low-pass and the patter: Drizzle 0.4, Rain 0.62, Storm 1.

## Quality and performance

| | |
|---|---|
| Pixel ratio | `pixelRatio(w, h, { maxDpr: 1.5, budget: 1.4e6, low })` (`main.js:1035`) |
| Slow-frame step | Own watch: after 30 frames, more than 40 net frames over 24 ms set `lowDpr`; a new quality choice clears it (`:1256`) |
| Idle | Never while in view: the rain falls on its own. The loop stops off screen or in a hidden tab |
| Reduced motion | Rain and mist at 0.45 of the rate, drops slide at 0.55 of the speed, the street's lights flicker at half speed, the bed at 0.8 of its level |
| Measured | `docs/plans/loading.md` (2026-11-09): 17 requests, 430 KB, stage shows at 0.5 / 0.7 s, intro lifts at 5.0 / 5.6 s, no long tasks |

## State and storage

| Key | Holds |
|---|---|
| `stimming.rain.sound` | Sound on or off |
| `stimming.quality` | Site-wide graphics quality |

## Tests and QA

No test file in `tests/`.
A change must give the same frame and the same sound. Port proof of 2026-11-15 (bean `stimming-zaqb`), on the real GPU (RTX 3070, ANGLE D3D11) and on SwiftShader:

| Check | Result |
|---|---|
| Number check, all 16 colours (6 sky, haze, 9 lights) | Not bit-equal. `lin()` rounds the matrix to 10 digits; culori does not. Largest gap 2.1e-7 in linear light, 1 to 12 float32 ulps. The gamut loop runs the same count for every colour |
| Floats sent to the GPU (vec3 uniforms, roofs, the light buffer) | Move only: 0 of 1,369 differ. With `oklchLinear`: 239 differ, by 14 ulps at most (2.4e-7). Roof heights are equal |
| Frames, move only (old `lin()` in `main.js`) | Pixel-equal at 1280 × 800 and 375 × 812, first frame and after each interaction, and with reduced motion |
| Frames, with `oklchLinear` | 2 to 31 pixels per frame differ (0.003 % at most), each by 1 of 255. No difference shows to the eye |
| Sound off | No audio context in any run |
| Sound on | One context, the same compressor (-12, 6, 4, 0.002, 0.12), output gain 0.55, the same four loops and squeaker, one suspend and one resume on a toggle. Drip counts vary between two runs of the old page too |
| Console | Clean. SwiftShader shows only the harness's own readback note |

How to get frames that repeat (headless Playwright):

- Seed `Math.random`, and drive `requestAnimationFrame` and `performance.now` by hand, so each frame is exactly 1/60 s. Turn off `KHR_parallel_shader_compile`, so the link never waits on a frame.
- With a real clock, two runs of one build differ in about a quarter of the pixels: the first frame's time step follows the observers in real time.
- On Windows, `--use-angle=metal` falls back to SwiftShader. `--use-angle=d3d11` gives the real GPU in headless Chromium.

## Known issues

None.

## Legacy build

None.

## History

| | |
|---|---|
| Epic | `stimming-80dc` (Bar v2), `stimming-3s8z` (code health) |
| Beans | `stimming-7hqo` (rainfall model), `stimming-uj31` (wind), `stimming-0pk8` (credits), `stimming-4dkg` (Bar v2), `stimming-zaqb` (code-health port) |
| Version | `version` in `toys.json`: 1.5 |
| Code-health port | 2026-11-15: `oklchLinear` replaced `lin()`; the script moved to `main.js`; the type check went from 4 errors to 0 |
