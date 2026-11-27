# Spillway (`spillway/`)

<!-- gen:identity -->
| | |
|---|---|
| Dutch | Overlaat /ˈoːvərˌlaːt/ (draft) |
| Motto | Water taking the impressive way down. |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None |
| Accent | `oklch(0.84 0.08 215)` |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |
<!-- /gen:identity -->

## Idea

A concrete arch dam across a narrow gorge, seen from the plunge pool. Drag a gate up and the water goes from a trickle to a roar; the spray climbs the gorge and holds a rainbow. Close the gates and the face drains, drips and dries.

## Rules

- The camera does not move. The G-buffer draws once per size; only the crest box draws again while a gate moves.
- The sun stays low behind the camera, so the bow can show in the spray.
- Time-based drifts (foam, mist) integrate in JS as one phase each. A per-pixel speed times the clock shears the noise into stripes.

## Direction

- Late afternoon. One warm key from behind the camera, a cool sky fill, haze in the gorge.
- Simple shapes: two rock walls, the dam, five piers, a deck, five radial gates, the pool. No props.
- Physical details: the inception point (glassy water turns white part way down the face), pier wakes, the rainbow and its faint second bow, heavy gates with a clank, a wet face that dries slowly.
- Defaults chosen in batch 1 (2026-11-22), for Tom's review: 3D, day, gates by drag on the dam.

## Controls

<!-- gen:bar -->
Bar: v3.

| Slot | Holds |
|---|---|
| Actions | Open all (Space): opens or closes all gates |
| Slider | Gates: the level of all five |
| Settings | Quality (shared), Reset |
| How to play | Drag, click, Space, arrows |
<!-- /gen:bar -->

| Gesture | Does |
|---|---|
| Click or tap | Opens a shut gate wide, or shuts an open one |
| Drag | Up on a gate opens it; down closes it; across carries the level to each gate it crosses |
| Keys | Space opens or closes all; Up and Down raise or lower all by a tenth |
| Wheel, pinch, tilt | None |

## Renderer and libraries

<!-- gen:stack -->
| | |
|---|---|
| Stack type | Shader |
| Tier | Raw WebGL2 |
| Libraries | None from the importmap; Web Audio for sound |
| Importmap | Word for word |
<!-- /gen:stack -->

A fixed camera lets the costly raymarch run once; each frame pays only for light, water and spray.

## Shared modules

<!-- gen:shared -->
| Module | Imports |
|---|---|
| `shared/stim.js` | `initPage`, `whenVisible`, `pageReady`, `stage`, `reduced`, `onReducedChange`, `audioKit`, `sound` |
| `shared/intro.js` | `intro` |
| `shared/gl.js` | `TRI_VS`, `program`, `linked`, `target`, `free`, `bind`, `tri`, `onContextLoss`, `nextFrame` |
| `shared/glow.js` | `bloomChain` |
| `shared/detail.js` | `detail` |
| `shared/sky.js` | `SKY` |
| `shared/grade.js` | `GRADE` |
| `shared/output.js` | `OUTPUT` |
<!-- /gen:shared -->

None.

## Files

<!-- gen:files -->
| File | Lines | Role |
|---|---|---|
| `index.html` | 60 | The page |
| `main.js` | 501 | Camera, state, frame loop, pointer, bar |
| `shaders.js` | 575 | The four programs and the scene numbers |
| `sound.js` | 143 | Roar, trickle, gate motor and clank, drips |
<!-- /gen:files -->

## Render pipeline

| Pass | Target | Shader or material | Does |
|---|---|---|---|
| G-buffer | Three RGBA16F, full size | `GBUF` | Raymarches rock, dam, piers, deck, gates and the crest water. Stores dry light, wet light, depth, material, sun shadow and AO. The pool stores its body and a marched reflection. Six row bands at load; the crest box while a gate moves. |
| Mist | RGBA16F, half size (quarter on rung 2) | `MIST` | 14 steps through the spray box. Curtain, veil and boil densities; one step toward the sun shades each billow; the rainbow at 42 degrees and the second bow at 51. |
| Shade | RGBA16F, full size | `SHADE` | Wetness, the sheets on the face, drips, pool ripples, foam and churn, sky and clouds, gorge haze, then the mist over all. |
| Bloom | Half size chain | `bloomChain` | Threshold 1.1. |
| Final | Screen | `FINAL` | Bloom, grade (vignette, grain), fitted ACES. |

### Uniforms

| Uniform | Type | Meaning | Range or default |
|---|---|---|---|
| `uGate[5]` | float | Gate opening, G-buffer | 0 to 1 |
| `uFlow[5]` | float | Water on the face per bay, after the draining film | 0 to 1 |
| `uWet[5]` | float | Wetness of each bay's strip of the face | 0 to 1; 50 s decay |
| `uAmt`, `uTop`, `uReach` | float | Spray amount, top height (m), downstream reach (m) | 0 to 1; 10 to 80; 10 to 38 |
| `uRise`, `uDrift`, `uFoamRun` | float | Drift phases, integrated in JS | grow with time |
| `uDrop[24]` | vec4 | Drips: x, start time, brightness | |

## Sound

| | |
|---|---|
| Graph | `audioKit()` |
| Engine | Raw Web Audio |
| Voices | Roar: looped brown and white noise in three bands, by mean flow, panned to the flow. Trickle: a narrow noise band and plinks at small flow. Gate: a low motor hum while a gate moves, and a clank at each start and stop. Drip: a falling plink as each drip lands, panned by its x. |
| Sleep | Voices stop when nothing flows or moves; the context suspends 1.5 s later. At 60 s idle the roar fades with the time scale. |

## Quality and performance

| | |
|---|---|
| Pixel ratio | `detail()`: cap 1.5, budget 1.6 M pixels |
| Slow-frame step | `detail()`, three rungs: pixel ratio, then mist at quarter size and three bloom levels, then 9 mist steps |
| Idle | Lively (a drag, a moving gate, rows to draw) at full rate; drifting at 30 fps by timer; asleep 60 s after the last input; quiet scenes stop at once |
| Reduced motion | Time does not advance: no streaks, drift or drips. Gates and flow levels still answer. |
| Start-up | Program link, then the G-buffer in six row bands behind the intro, one first frame, `gl.finish()` |
| Measured | 2026-11-22, dev PC, headless Chromium with ANGLE GL: 60 fps during a drag at 1280 x 800. First frame 3.4 s on ANGLE D3D11. Tom checks a real device. |

## State and storage

| Key | Holds |
|---|---|
| `stimming.spillway.sound` | Sound on or off |

## Attributions

| Source | Kind | Licence | Credit shows |
|---|---|---|---|
| 3D value noise from one texture (green holds the next slice) | Technique | Common practice | No |

## Tests and QA

Captures: `docs/qa/spillway/`. Checks Q1 to Q10 in `docs/plans/README.md`, run 2026-11-22 (results in bean `stimming-xv1l`).

## Known issues

- The menu icon (Tom's pick A of spike spillway-1) draws three gates; the toy has five. `stimming-xv1l`
- The mist dither shows as faint grain on the shaded face at full size. `stimming-xv1l`

## Legacy build

None.

## History

| | |
|---|---|
| Epic | `stimming-oh7b` |
| Plans | `docs/plans/spillway.md` |
| Version | None |
