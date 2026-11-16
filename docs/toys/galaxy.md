# Galaxy (`galaxy/`)

<!-- gen:identity -->
| | |
|---|---|
| Dutch | Heelal /ˈheːlɑl/ |
| Motto | And off we fly at critical speed / En we vliegen weg met kritieke snelheid |
| Shelf | Main, number 6 |
| Stage | None |
| Series | None |
| Accent | `linear-gradient(100deg, oklch(0.8 0.16 305), oklch(0.87 0.13 200))` |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |
<!-- /gen:identity -->

## Idea

About 330,000 stars (about 200,000 on a phone) orbit a few heavy wells on a black panel. A tap places an object from the Add tray; a hold and drag flings a cluster of stars.
Wells merge, and a merger can fall into a black hole with a lensed disk and jets. Without WebGPU, the panel shows one line.

## Controls

<!-- gen:bar -->
Bar: v2 (`galaxy/index.html:88`). Galaxy is the reference port for Bar v2.

| Slot | Holds |
|---|---|
| Top left (choice) | `Add`, tray, 17 icons, default `star` |
| Bottom left (actions) | `Clear` (C) |
| Bottom right (slider) | `Gravity`, 0.3 to 1.2, default 0.3: the sim pace |
| Key strip | click place; hold and drag throw a cluster; drag move; scroll zoom |
| Settings | `Star streaks` (0 to 1, 0.18), `Effect streaks` (0 to 1.2, 0.18), Quality; Reset in the footer |
| Dev (`?dev`) | None |
<!-- /gen:bar -->

| Gesture | Does |
|---|---|
| Click or tap | Places the chosen object |
| Press on a well | Picks it up; release throws it with the drag speed |
| Hold on empty sky | After 180 ms or 7 px, streams a cluster of stars while held |
| Two fingers | Pinch zoom; cancels a hold |
| Wheel | Zoom, 0.55 to 1.5 |
| Keys | Space drops an object at the centre; `+`, `-` zoom; R resets |

## Renderer and libraries

<!-- gen:stack -->
| | |
|---|---|
| Tier | three.js 0.186.1 WebGPU (`WebGPURenderer`, TSL), WebGPU backend only |
| Libraries | `three/webgpu`, `three/tsl`, `BloomNode`, `AfterImageNode`, `curlNoise`, `WebGPU` capabilities |
| Importmap | Differs: three 0.186.1 entries only; no culori, tone, gsap or simplex-noise |
<!-- /gen:stack -->

The star sim runs as compute passes, which WebGL2 cannot run at this size. `docs/stack.md` names Galaxy one of the three WebGPU toys.

## Shared modules

<!-- gen:shared -->
| Module | Imports |
|---|---|
| `shared/stim.js` | `initPage`, `sound`, `oklchLinear`, `onQuality`, `pixelRatio`, `stage`, `pageReady`, `buildSteps` |
| `shared/intro.js` | `intro` |
<!-- /gen:shared -->

Drift (see `docs/plans/modularize.md`):

- Sound: its own `AudioContext` and gesture unlock (`:125` to `:245`), not `audioKit`. The shell's mute still holds through `sound.onChange`.
- Slow-frame watch: its own rule (40 net frames over 24 ms set pixel ratio 1), not `detail()`.
- The shared GLSL modules cannot reach a TSL toy (`docs/plans/shared-shaders.md`).

## Files

<!-- gen:files -->
| File | Lines | Role |
|---|---|---|
| `index.html` | 2073 | The page: CSS, markup, one module script |
<!-- /gen:files -->

## Render pipeline

| Pass | Target | Node or material | Does |
|---|---|---|---|
| 1. Compute | Storage buffers | `seedPass`, `updatePass`, `resetPass`, `countPass`, `gasStep`, `gasResolve`, `gasZero`, `gasClear` | Star gravity from up to 8 wells; flings, pulsars, strings, magnetars, wormholes, blasts; grid gas |
| 2. Stars | `pass(scene)` | `starMat` (`SpriteNodeMaterial`, additive, lensed), well dots, gas, disk, jets, shadow | The scene |
| 3. Effects | `pass(fxScene)` | Supernova shells, kilonova pairs, cosmic string, comet tails, beams | Long-exposure effects |
| 4. Exposure | Node | `Exposure` (an `AfterImage` subclass): `max(new, old * damp - 0.0005)` | Smooth trails, one for stars, one for effects |
| 5. Bloom | Node | `bloom(lit, 0.45, 0.35, 0.4)` | Glow; output is `lit + glow`, ACES filmic |

`countPass` counts stars per well; the page reads the counts back about twice a second for the sound.

### Uniforms (the ones a person tunes)

| Uniform | Type | Meaning | Range or default |
|---|---|---|---|
| `uDampStars` | `float` | Star trail decay | From `Star streaks` |
| `uDamp` | `float` | Effect trail decay | From `Effect streaks` |
| `uStarGain`, `uStarSize` | `float` | Star brightness and size | |
| `uW[8]`, `uWV[8]`, `uWH[8]` | `vec4` | Well place and mass, speed, horizon radius | Up to 8 wells |
| `uSettle`, `uArms` | `float` | Settling and spiral arms | |
| `uHole`, `uHoleR`, `uDiskGain`, `uJet` | mixed | The black hole, its disk and jets | |

## Sound

| | |
|---|---|
| Graph | Own `AudioContext` and compressor (drift: `audioKit` does this) |
| Engine | Raw Web Audio |
| Voices | A D-chord drone of 8 layers (MIDI 38 to 69), each a detuned oscillator pair under a lowpass, gated by cluster rank; `holeChord()` when a hole forms |
| Sleep | Suspends 400 ms after the loop pauses |

## Quality and performance

| | |
|---|---|
| Pixel ratio | `pixelRatio(w, h, { maxDpr: 1.5, low: lowDpr })` (`:1170`) |
| Slow-frame step | Own: a frame gap over 24 ms for 40 net frames sets pixel ratio 1; a new quality choice clears it |
| Idle | Runs only while the panel shows and the tab is visible |
| Phones | 196,608 stars, 16,384 disk and 4,096 jet particles |
| Reduced motion | Half-speed sim, no camera drift |
| Start-up | Compute and render shaders compile behind the intro. The intro's load line counts the five libraries, then five build steps: the device, the compute compile, the draw compile, two frames |

## State and storage

| Key | Holds |
|---|---|
| `stimming.galaxy.sound` | Sound on or off |
| `stimming.galaxy.streakStars` | Star streaks |
| `stimming.galaxy.streakFx` | Effect streaks |

## Tests and QA

None for Galaxy.

## Known issues

- Needs WebGPU. Browsers without it show only the fail line.
- The renderer is disposed only on the WebGL2 fallback path.

## Legacy build

None.

## History

| | |
|---|---|
| Epic | `stimming-ocok` |
| Plans | None of its own; rows in `bar-v2.md`, `bar-v2-migration.md`, `loading.md` |
| Version | None |
