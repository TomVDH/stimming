# Calm jar (`calmjar/`)

<!-- gen:identity -->
| | |
|---|---|
| Dutch | Glitterpot /ˈɡlɪtərˌpɔt/ (draft, for Tom) |
| Motto | None |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None |
| Accent | `oklch(0.74 0.14 318)` |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |
<!-- /gen:identity -->

## Idea

The stage is the inside of a jar of clear liquid full of glitter. Drag to swirl it: the flakes lift, tumble and flash as they turn to the light.
Then they settle slowly, big flakes first and fine dust last, into layers by size.

## Rules

- No dome, no scene, no snow: the stage is the liquid, seen from inside the glass (F1 in `docs/plans/fidgets.md`, defaulted to yes).
- A flake flashes only when its tilt meets the light. It never glows on its own.
- The bed forms by size: settling speed grows with size.
- The jar's floor stands just above the bar (`ui.cover()`), so the bed stays in view.

## Direction

- Flat stage with 3D flake optics, chosen by the build chat for the MVP (Tom's open question: "3D or flat, and the presentation").
- The liquid is a 2D fluid seen face on; each flake is a small mirror with a 3D tilt and a holo film.
- Look rule: a deep backlit liquid; the flashes and the bloom carry the scene. Two faint curved glass lines mark the side walls.
- Reference: photos of real glitter calm jars. Flakes read dark until they meet the mirror angle, then flash white with a colour fringe; fine glitter reads as a haze.
- Icon: Tom's pick A of `icons/spike-calmjar-1.html` (2026-11-16). Intro emblem: its silhouette, `shared/emblems/calmjar.svg`.

## Controls

<!-- gen:bar -->
Bar: v3.

| Slot | Holds |
|---|---|
| Top left (choice) | Glitter (segments): Holo, Gold, Ocean, Ember (keys 1 to 4) |
| Actions | Shake (held, S), Flip (F) |
| Slider | Thickness: thin water to thick glycerin |
| Key strip | drag: swirl · click: lift · S: shake · F: flip |
| Settings | Flakes (count), Light (Back, Side), Quality, Reset |
| Dev (`?dev`) | None |
<!-- /gen:bar -->

| Gesture | Does |
|---|---|
| Click or tap | A jet lifts a puff of glitter from the bed under the pointer |
| Drag | The finger drags the liquid along its path: a swirl |
| Keys | 1 to 4 pick the glitter; hold S to shake; F turns the jar over |
| Wheel, pinch, tilt | None |

## Renderer and libraries

<!-- gen:stack -->
| | |
|---|---|
| Stack type | Shader |
| Tier | Raw WebGL2 |
| Libraries | None from the importmap |
| Importmap | Word for word |
<!-- /gen:stack -->

A 2D fluid and GPU particles in float textures need raw WebGL2; nothing here needs a scene graph.

## Shared modules

<!-- gen:shared -->
| Module | Imports |
|---|---|
| `shared/stim.js` | `initPage`, `whenVisible`, `fitCanvas`, `reduced`, `onReducedChange`, `linFit`, `quality`, `onQuality`, `audioKit`, `stage`, `pageReady` |
| `shared/intro.js` | `intro` |
| `shared/gl.js` | `TRI_VS`, `program`, `linked`, `target`, `free`, `bind`, `to`, `tri`, `onContextLoss` |
| `shared/glow.js` | `bloomChain` |
| `shared/grade.js` | `GRADE` |
<!-- /gen:shared -->

K5 (2D fluid) is a marked copy from Oil slick, with no-slip walls and body forces. The GPU flakes that ride it are new; Lotus leaf or Marbling may copy them.

## Files

<!-- gen:files -->
| File | Lines | Role |
|---|---|---|
| `index.html` | 61 | The page |
| `main.js` | 1186 | Fluid, flakes, bed, render, bar, sound, loop |
<!-- /gen:files -->

## Render pipeline

Passes in frame order. One row per pass.

| Pass | Target | Shader or material | Does |
|---|---|---|---|
| Bed | 256 x 16 cells, then 256 x 1 tops | `BED_VS` | Resting flakes add their volume to their column; a max blend marks the top flake |
| Bed sum | 256 x 1 | `BEDSUM_FS` | Sums the rows, smooths over 0.04 of the jar, caps the height at the top flakes |
| Force | velocity | `FORCE_FS` | Drag strokes, tap jets, the shake eddy, the flip spin; flow dies inside the pile |
| K5 | velocity, pressure | `ADV_FS`, `DIV_FS`, `JAC_FS` x 22, `GRAD_FS` | Advect, project, no-slip walls |
| Step | flake state (RGBA32F x 2, MRT) | `STEP_FS` | Flakes ride the flow, sink by size, tumble; a resting flake skips the step |
| Back | scene (RGBA16F) | `BACK_FS` | The backlit liquid, the pile's flecked interior, the glass foot |
| Flakes | scene | `DRAW_VS`, `DRAW_FS` | Point sprites: hexes, slivers, dust; mirror glint and holo film |
| Bloom | half size chain | `bloomChain` | Blooms the glints |
| Final | screen | `FINAL_FS` | Flip turn and zoom, wall refraction and lines, ACES, grade |

### Uniforms

| Uniform | Type | Meaning | Range or default |
|---|---|---|---|
| `CLASS[k].fall` | float | Settling speed of a class in thin liquid, jar heights per second | 0.2, 0.11, 0.065, 0.038 |
| `uSlow` | float | Thickness divides the settling speed | 1 to 1.75 |
| `uLift` | float | Flow a resting flake needs to lift, times its fall | 1 to 1.5 |
| `LIGHTS.*.sharp` | float | Glint lobe; Side is sharper and brighter | 90 (Back), 260 (Side) |
| `BED_TOP` | float | The settled bed's share of the jar height | 0.16 |

## Sound

| | |
|---|---|
| Graph | `audioKit()` |
| Engine | Raw Web Audio on the kit's context |
| Voices | Wash: looped noise through a low-pass, its level and cutoff follow the swirl. Shimmer: tiny high sine ticks, their rate follows the flakes still in motion. Slosh: band-passed noise at each shake reversal. Glug: three falling bubbles and a wash on Flip. Tap: one low bubble |
| Sleep | `kit.rest()` when the loop stops |

## Quality and performance

| | |
|---|---|
| Pixel ratio | `fitCanvas`, budget 2.4 M pixels on Standard |
| Slow-frame step | Own watch: pixel ratio 1, then three bloom levels, then 60 % of the flakes, then a 96-row fluid grid |
| Idle | Lively at full rate during input; drifting at 30 fps on a timer while the settle runs; the loop stops when the settle runs out (about 40 to 57 s by Thickness) or 60 s after the last input, after a 2 s ease |
| Reduced motion | The jar opens settled; flakes keep a fixed tilt and glow steadily; the settle runs at triple speed; Flip fades between states; no shake sway |
| Start-up | Programs link behind the intro, then one first frame and `gl.finish()` |
| Measured | 2026-11-22, headless Chromium with ANGLE GL on the dev PC: 60 fps during a swirl at 1280 x 800 (median frame 16.7 ms, p90 16.7 ms), 26 000 flakes. A phone is not measured yet |

## State and storage

| Key | Holds |
|---|---|
| `stimming.calmjar.sound` | Sound on or off |
| `stimming.calmjar.glitter` | Glitter choice |
| `stimming.calmjar.thick` | Thickness |
| `stimming.calmjar.flakes` | Flakes count factor |
| `stimming.calmjar.light` | Light: back or side |

## Attributions

| Source | Kind | Licence | Credit shows |
|---|---|---|---|
| K5 2D fluid from Oil slick and Marbling | Own code | Project | None |

## Tests and QA

Captures in `docs/qa/calmjar/`. A change must keep Q1 to Q10 of `docs/plans/README.md`: a clean console, 30 rAF calls a second or fewer while drifting, none asleep or hidden, and a context that suspends after the settle.

## Known issues

- A hard swirl can leave glitter dunes against the walls, where the no-slip flow is slow (`stimming-tvg4`).
- Not checked on a real phone or a real touch screen.

## Legacy build

None.

## History

| | |
|---|---|
| Epic | `stimming-oh7b` |
| Plans | `docs/plans/calmjar.md` |
| Version | None |
