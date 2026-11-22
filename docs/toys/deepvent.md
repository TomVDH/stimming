# Deep vent (`deepvent/`)

<!-- gen:identity -->
| | |
|---|---|
| Dutch | Diepzeebron /ˈdipseːˌbrɔn/ (draft, for Tom) |
| Motto | None |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None |
| Accent | `oklch(0.86 0.13 205)` |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |
<!-- /gen:identity -->

## Idea

A black smoker chimney stands on the sea floor in black water. Its plume rises and marine snow falls.
The pointer is a lure light: the only light in the scene. Where it goes, the dark opens on the rock, the minerals, the smoke and the snow.

## Rules

- The lure is the only light. The one other glow is the dull ember at the vent mouth.
- No life at the vent in the MVP: rock, minerals, smoke and snow only.
- The camera does not move. The light moves.

## Direction

- 3D, fixed camera, chosen by the build chat for the MVP (Tom's open question: "3D or flat, and the presentation").
- Look rule: simple shapes; light and haze carry the scene. The water stays near black away from the light.
- Water takes red first: near light is warm white, far light goes blue-green.
- Icon: Tom's pick A of `icons/spike-vent-1.html` (2026-11-16).

## Controls

<!-- gen:bar -->
Bar: v3.

| Slot | Holds |
|---|---|
| Top left (choice) | None |
| Actions | Flash (F) |
| Slider | Light: how bright the lure is, so how far the dark opens |
| Key strip | move: move the light · click: flash · arrows: move the light |
| Settings | Quality, Reset |
| Dev (`?dev`) | None |
<!-- /gen:bar -->

| Gesture | Does |
|---|---|
| Move (mouse) | The lure follows the pointer on a soft spring |
| Drag (touch) | The lure follows the finger |
| Click or tap | The lure flashes: the whole scene shows, then fades |
| Keys | Arrows move the lure 0.3 m; F flashes; R brings the lure back |
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

A few simple shapes as signed distance fields cost less than meshes, lights and post passes in three.js.

## Shared modules

<!-- gen:shared -->
| Module | Imports |
|---|---|
| `shared/stim.js` | `initPage`, `whenVisible`, `fitCanvas`, `pageReady`, `stage`, `reduced`, `onReducedChange`, `onQuality`, `quality`, `audioKit` |
| `shared/intro.js` | `intro` |
| `shared/gl.js` | `TRI_VS`, `program`, `linked`, `target`, `free`, `bind`, `tri`, `to`, `onContextLoss` |
<!-- /gen:shared -->

None. The noise is a 64³ periodic gradient-noise volume, baked at load.

## Files

<!-- gen:files -->
| File | Lines | Role |
|---|---|---|
| `index.html` | 813 | The page |
<!-- /gen:files -->

## Render pipeline

| Pass | Target | Shader | Does |
|---|---|---|---|
| Scene | `scene`, RGBA16F, 0.5 of the canvas (0.7 on High) | `SCENE_FS` | Raymarches the chimney and floor, lights them from the lure with a soft shadow, marches the plume (44 steps), adds the water's backscatter. Alpha holds the depth. |
| Snow | `snow`, RGBA16F, same size | `SNOW_VS`, `SNOW_FS` | Points, one per flake; each falls on a path from its seed. Lit by the lure with forward scatter; out of focus near and far. Hidden behind rock and thick smoke by the scene depth. |
| Bloom | `b1`, `b2`, a quarter of `scene` | `BRIGHT_FS`, `BLUR_FS` | Bright pass, then a blur across and down |
| Composite | Screen | `COMP_FS` | Heat shimmer over the mouth, filmic curve, vignette, grain and dither |

### Uniforms

| Uniform | Type | Meaning | Range or default |
|---|---|---|---|
| `uL` | vec3 | Lure position, on the plane z = -1.4 | x -4.5 to 3.2, y 0.25 to 7.5 |
| `uI` | float | Lure intensity | 1.2 to 6.7 from Light; times 6 at the peak of a flash |
| `uLc` | vec3 | Lure colour | cool white, whiter in a flash |
| `uE` | float | Ember at the mouth | 0.035 |
| `SIG` | const | Water extinction per metre (r, g, b) | 0.17, 0.065, 0.05 |

## Sound

| | |
|---|---|
| Graph | `audioKit()` |
| Engine | Raw Web Audio |
| Voices | Vent: low filtered noise under a thin hiss, panned to the chimney, a little louder when the light is near. Swish: band-passed noise, level and pitch from the lure's speed, panned with the lure. Flash: three sine partials with a watery echo; pitch, level and partials jitter. |
| Sleep | The voices fade when the loop stops; the context suspends 1.5 s later |

## Quality and performance

| | |
|---|---|
| Pixel ratio | `fitCanvas`, cap 2 and the shared budget; the scene draws at 0.5 of that (0.7 on High) |
| Slow-frame step | Own watch (batch rule): pixel ratio to 1, then scene scale times 0.75, then half the snow |
| Idle | Lively while input is recent, the lure moves or a flash fades. Drifting at 30 fps for plume and snow. 60 s after the last input the plume and snow ease to a stop and the loop stops. |
| Reduced motion | The plume and snow stand still. The lure still follows, on a stiffer spring. A flash is half as bright. |
| Start-up | Noise bake, shader link, one frame and `gl.finish()` behind the intro |
| Measured | 2026-11-22, Tom's PC, headless Chromium with ANGLE GL: median frame 16.7 ms (60 fps) at 1280 x 800 while the lure moves. Not yet checked on a phone. |

## State and storage

| Key | Holds |
|---|---|
| `stimming.deepvent.sound` | Sound on or off |

## Attributions

| Source | Kind | Licence | Credit shows |
|---|---|---|---|
| Henyey-Greenstein phase function | Technique | Public knowledge | None |
| Single-scatter glow of a point light (closed-form line integral) | Technique | Public knowledge | None |

## Tests and QA

QA captures: `docs/qa/deepvent/`. A change must pass Q1 to Q10 in `docs/plans/README.md`.

QA on 2026-11-22: Q1 to Q10 pass. Drifting asks for 30.5 frames a second; hidden and asleep ask for none; the audio context runs after a gesture and is suspended once asleep; reduced motion settles to no frames.

## Known issues

- The plume does not shadow the rock, and the rock does not shadow the water's glow.
- Headless capture on Tom's PC needs `--use-angle=gl`.

## Legacy build

None.

## History

| | |
|---|---|
| Bean | `stimming-qlbm` |
| Plans | `docs/plans/deepvent.md` |
| Version | None |
