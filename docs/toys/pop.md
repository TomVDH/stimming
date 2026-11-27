# Pop field (`pop/`)

<!-- gen:identity -->
| | |
|---|---|
| Dutch | Bubbelplastiek /ˈbʏbəlplɑsˌtik/ |
| Motto | One is none. / Ééntje is geentje. |
| Shelf | Main, number 2 |
| Stage | None |
| Series | None |
| Accent | `oklch(0.9 0.2 128)` |
| Sound | Yes |
| Legacy build | Yes (`legacy.html`) |
| Signed off | Yes (`data-done` on the intro and the menu tile) |
<!-- /gen:identity -->

## Idea

A honeycomb sheet of bubble-wrap domes fills the stage. A tap pops one cell, a sweep pops a path, and a held squeeze charges a jumbo cell of seven and bursts it.
Eighteen materials change the light, the burst, the sound and the feel. Popped cells fill again after a time.
Each material picks a random colour range suited to its surface.
Material changes and Shuffle pick a new range; `?kind=` overrides the initial field.

## Controls

<!-- gen:bar -->
Bar: v3, the Signal bar, over Bar v2 (`pop/index.html:90`, `signal: true`).

| Slot | Holds |
|---|---|
| Top left (choice) | `Material`, stepper, 18 options, default `gloss`; `holo` shows as `Hologram`, `topo` as `Contours` |
| Bottom left (actions) | `Shuffle` (S) |
| Bottom right (slider) | None |
| Key strip (Bar v2) | click pop a bubble; drag pop a line of bubbles; hold burst a big bubble; arrows select a bubble |
| How to play (Bar v3) | Click: Pop a bubble. Drag: Pop a line of bubbles. Hold: Burst a big bubble. Hold: Pop a bubble with more force. Move: Move the light. Arrows: Select a bubble. Space: Pop the bubble. Enter: Pop the bubble. S: Shuffle the sheet. R: Reset the toy. |
| Settings | Quality; Reset in the footer |
| Dev (`?dev`) | None |

The sheet keeps clear of both bars: `bands` (`:771`) reads `ui.cover()`, and `ui.onCover` fits the sheet again.
A new sheet grows out from the Bar v3 Shuffle button, or from the Bar v2 die and stepper under `?bar=v2`. The rolling die is on the Bar v2 chip only.
<!-- /gen:bar -->

| Gesture | Does |
|---|---|
| Click or tap | Squeak on press; pop on release, with force from the squeeze (`:1969`) |
| Drag | Past 0.45 of a cell radius, the press turns into a sweep that pops the path |
| Hold | Charges a jumbo cell, then bursts it |
| Hover | Leans the point light toward the pointer |
| Keys | Arrows move a focus cell; Space or Enter holds, then pops (`:2033`); S shuffles; R resets, bound by the toy (`:2053`) |
| Wheel | None. A scroll lets go of the hover |

## Renderer and libraries

<!-- gen:stack -->
| | |
|---|---|
| Tier | three.js 0.170.0 (WebGL), orthographic, plus a Canvas 2D layer on top |
| Libraries | three (`EffectComposer`, `RenderPass`, `ShaderPass`, `UnrealBloomPass`, `CopyShader`), culori, gsap, simplex-noise |
| Importmap | Word for word, with `modulepreload` links |
<!-- /gen:stack -->

three.js lights the domes in six instanced layers; the 2D layer draws the films, the bits and the focus ring, and takes the input.
`docs/stack.md` lists Pop field as a port candidate: one orthographic view, no 3D scene. The bloom pass is the one part raw WebGL2 would need to bring.

## Shared modules

<!-- gen:shared -->
| Module | Imports |
|---|---|
| `shared/stim.js` | `initPage`, `audioKit`, `reduced`, `onReducedChange`, `css`, `linFit`, `oklchRgb`, `onQuality`, `pixelRatio`, `stage`, `pageReady` |
| `shared/intro.js` | `intro` |
<!-- /gen:shared -->

Drift: none. Pop field is the reference port for the library set (`AGENTS.md`): sound runs through `audioKit` and `kit.tone()`, colour through the `stim.js` helpers.

## Files

<!-- gen:files -->
| File | Lines | Role |
|---|---|---|
| `index.html` | 2142 | The page: CSS, markup, one module script |
| `legacy.html` | 1944 | The CPU-lit build |
<!-- /gen:files -->

## Render pipeline

| Pass | Target | Shader or material | Does |
|---|---|---|---|
| 1. Domes | Composer | `domeMat` ×2 (small, jumbo): four instanced layers, flat and swollen | Lights each dome per material |
| 2. Films | Composer | `filmMat` ×2: one textured quad per popped cell, from a sprite atlas | Draws the popped skin |
| 3. Bloom | Composer | `UnrealBloomPass` (strength 0.04, radius 0.35, threshold 0.96) | Faint glow on the hot highlights |
| 4. Copy | Screen | `ShaderPass(CopyShader)` | Puts the frame on the canvas |
| 5. 2D layer | 2D canvas | Canvas 2D | Wipe, bits, focus ring |

The camera is orthographic in CSS pixels, y down. Blending is premultiplied over.
Each material sets its roughness, metalness and reflection strengths in `PBR`.
The `MAT_COLOURS` table sets the available hue and chroma pairs.
The dome shader uses GGX, Smith masking and Schlick Fresnel for direct reflections.
The material patterns, colour ramps and thin-film effects remain stylized.

### Uniforms: `domeMat` (`:1811`)

| Uniform | Type | Meaning | Range or default |
|---|---|---|---|
| `uMap` | `sampler2D` | Shape map: hex or flower | `hexTex`, `flowerTex` |
| `uMat` | `int` | Material index into `MAT_DEFS` | 0 to 17 |
| `uLight` | `vec3` | The point light; it follows the pointer | |
| `uPbr` | `vec4` | Roughness, metalness, direct and softbox strengths | Per material |
| `uR` | `float` | Cell radius, px | From the layout |
| `uBox` | `float` | Quad box size | |
| `uBlocks` | `float` | Block size | 15 for disco, else 12 |
| `uShR` | `float` | Shape map radius | |
| `uShade` | `vec3` | Shade colour | |

Instanced attributes carry the palette stops (`aLo`, `aMi`, `aHi`, `aLi`) and the per-cell state (`aXf`, `aRa`, `aMisc`).

## Sound

| | |
|---|---|
| Graph | `audioKit({ keys })` (`:856`) |
| Engine | Tone.js through `kit.tone()`, loaded on the first gesture |
| Voices | `note` (PolySynth of MembraneSynth) and `ping` (PolySynth of Synth), 16 voices each; NoiseSynth bursts (crack, squeak, rattle, thump); `bloop`; `boom`; a creak that a squeeze opens |
| Per material | The `SND` table (`:925`) tunes the voices |
| Sleep | `kit.rest()` when the loop stops |

## Quality and performance

| | |
|---|---|
| Pixel ratio | `pixelRatio(w, h, { budget: Infinity })` (`:792`): no pixel budget, no cap |
| Slow-frame step | None |
| Idle | The loop stops when nothing moves; a timer wakes it for the next refill |
| Reduced motion | No entry inflation, no nudges or ripples, instant springs |
| Measured | `docs/plans/loading.md` has the loading row |

## State and storage

| Key | Holds |
|---|---|
| `stimming.pop.sound` | Sound on or off (the shell) |

## Tests and QA

None for Pop field. `tests/bar-v2.html` tests the shell it uses.

## Known issues

- No slow-frame step and no pixel budget. On a large High-quality screen, every pixel renders. Not seen as a problem yet.
- The about section (`section.about`) is empty and hidden: no vignette yet.

## Legacy build

`legacy.html` lights the domes on the CPU into a 2D sprite atlas and draws them with Canvas 2D. The header's Classic link reaches it.

## History

| | |
|---|---|
| Epic | `stimming-wzxt` (completed) |
| Plans | None of its own; rows in `docs/plans/loading.md` and `bar-v2-migration.md` |
| Version | None |
