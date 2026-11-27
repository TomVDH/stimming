<!--
Toy doc. Rules: docs/plans/toy-docs.md. Prose: ASD-STE100, double density. No em dashes.
A section marked (gen) comes from toys.json, series.json or the page source.
-->

# Schlieren candle (`schlieren/`)

<!-- gen:identity -->
| | |
|---|---|
| Dutch | None yet (Tom sets it) |
| Motto | Hot air finally showing its work. |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None (proposal: `science`) |
| Accent | `linear-gradient(100deg, oklch(0.62 0.012 255), oklch(0.95 0.04 85))` |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |
<!-- /gen:identity -->

## Idea

A heat source stands in a round schlieren mirror. Its heat rises as a grey, curling relief: one side of each streak is bright, the other side is dark.
The pointer is a hand. It pushes the plume aside and splits it. Held still, it warms the air, and its own heat rises off it.
A click is a finger snap: a thin sound wave crosses the mirror, and it lights a dead source.

## Controls

<!-- gen:bar -->
Bar: v2.

| Slot | Holds |
|---|---|
| Top left (choice) | Source, segments: Candle (1), Cup (2), Iron (3), Match (4) |
| Bottom left (actions) | Blow (held, key B) |
| Bottom right (slider) | Sensitivity: six stops of knife sensitivity |
| Key strip | `[MOVE] stir`, `[HOLD STILL] warm`, `[CLICK] snap`, `[B] blow`; touch: `[DRAG] stir`, `[HOLD STILL] warm`, `[TAP] snap` |
| Settings | Filter (Knife, Colour, Shadow, stored), site Quality, Reset |
| Dev (`?dev`) | Knife angle, Lift, Curl, Pace, Grain (all stored) |
<!-- /gen:bar -->

| Gesture | Does |
|---|---|
| Click or tap | A snap: a sound wave crosses the mirror. A dead source lights when the wave reaches it. A spent match strikes a new one. |
| Drag (touch) or move (mouse) | The hand sweeps a capsule through the air at the pointer speed. It stirs and splits the plume. |
| Hold still | The hand warms the air round it. A faint plume rises off it. |
| Keys | 1 to 4 pick a source. The same lit source stays; a match strikes again. B holds a breath from the left; nine tenths of a second blows a flame out. |
| Wheel, pinch, tilt | None. |

## Renderer and libraries

<!-- gen:stack -->
| | |
|---|---|
| Tier | Raw WebGL2 |
| Libraries | None (the page carries the importmap but imports no library) |
| Importmap | Word for word |
<!-- /gen:stack -->

The picture is one flat quad of per-pixel maths over a 2D fluid on ping-pong textures, so raw WebGL2 fits (`docs/stack.md`, decision guide 1).
The page needs `EXT_color_buffer_float` for half-float targets. Without it, the stage shows the fail line and the bar hides.

## Shared modules

<!-- gen:shared -->
| Module | Imports |
|---|---|
| `shared/stim.js` | `initPage`, `whenVisible`, `reduced`, `onReducedChange`, `audioKit`, `linFit`, `stage`, `pageReady` |
| `shared/detail.js` | `detail` |
| `shared/output.js` | `OUTPUT` |
| `shared/intro.js` | `intro` |
<!-- /gen:shared -->

The film grain and the dust hash are local (`ih`, `h21` in `COMPOSITE`). `shared/grade.js` has a similar grain; the toy keeps its own because the grain is static, so a sleeping frame does not boil.

## Files

<!-- gen:files -->
| File | Lines | Role |
|---|---|---|
| `index.html` | 1246 | The page: shell, sim, render, sound and vignette |
<!-- /gen:files -->

## Render pipeline

One sim step runs per 1/60 s of sim time, at most three per frame. The render runs once per frame that stepped.

| Pass | Target | Shader | Does |
|---|---|---|---|
| 1 | `vel` (RG16F, n x n) | `ADV_VEL` (`index.html:296`) | Moves the velocity along itself, with a midpoint trace and damping |
| 2 | `curl` (R16F) | `CURL` (`:304`) | Vorticity |
| 3 | `vel` | `FORCE` (`:316`) | Vorticity confinement, buoyancy, room draught, flame draught, match puff, breath, hand capsule, solids |
| 4 | `div` (R16F) | `DIV` (`:371`) | Divergence times h squared; closed floor |
| 5 | `prs` (R16F) x iters | `JACOBI` (`:384`) | Pressure; open sides and top |
| 6 | `vel` | `PROJECT` (`:395`) | Subtracts the pressure gradient |
| 7 | `tHat` (R16F, m x m) | `ADV_T` (`:412`) | Heat, forward step |
| 8 | `tBack` | `BACK_T` (`:420`) | Heat, back step |
| 9 | `tmp` | `HEAT` (`:428`) | MacCormack correction with a clamp, cooling, top sponge, all heat sources |
| 10 | `grad` (RGBA16F, m x m) | `GRAD` (`:496`) | Slope (x, y) and curvature of the heat |
| 11 | Canvas | `COMPOSITE` (`:506`) | Mirror disc, filter, dust, grain, silhouette with a fringe, flame, wick, ember, sound-wave rings |

The domain is a unit square with y up. The mirror is a disc of radius 0.46 in its middle (`DISC`, `:639`).
The sources are signed distance fields in `SCENE` (`:218`). The same code feeds the sim and draws the silhouettes.
The flame leans with the air: every pass reads the velocity just above the wick (`leanNow`).

### Uniforms

`COMPOSITE`:

| Uniform | Type | Meaning | Range or default |
|---|---|---|---|
| `uK` | float | Sensitivity: deflection to brightness | `0.013 * 2^((slider - 0.5) * 6)`, about 0.0016 to 0.1 |
| `uMode` | int | 0 knife, 1 colour filter, 2 shadow (shadowgraph) | Settings, Filter |
| `uKnife` | vec2 | Knife normal | Dev, Knife angle, 0 degrees: a vertical edge |
| `uGrain` | float | Static grain | Dev, Grain, 0.03 |
| `uRings` | vec4[4] | Sound waves: centre, radius, strength | Radius grows at 1.5 a second; strength `110 * exp(-2.4 t)` |

`FORCE` and `HEAT`:

| Uniform | Type | Meaning | Range or default |
|---|---|---|---|
| `uLift` | float | Buoyancy per unit of heat | Dev, Lift, 1 |
| `uCurlK` | float | Vorticity confinement | Dev, Curl, 1.2 |
| `uJet` | float | Flame draught | 0.3 times the flame |
| `uCool` | float | Heat loss a second | 0.06, plus 2.5 times the settle fade |
| `uHandT` | float | Hand warmth | 0.2 times the warmth, 0 to 1 |

## Sound

| | |
|---|---|
| Graph | `audioKit({ gain: 0.5 })` |
| Engine | Raw Web Audio on the kit noise buffer |
| Voices | Flutter: looped low-pass noise; the flame and the stir near it set its gain (`hearFrame`, `:946`). Breath: band-pass noise while Blow holds. Events: snap, match strike (scrape grains, then a swell), candle light, flame out, cup clink, iron switch, iron relay ticks every 2.5 to 5.5 s. |
| Sleep | The loop end calls `kit.rest`; the voices go to zero first (`hush`). |

Levels measured on 2026-11-15 at `kit.out`: still flame RMS 0.0008, hand stir near the flame 0.006, breath 0.023. These were read with an analyser, not heard.

## Quality and performance

| | |
|---|---|
| Pixel ratio | `detail()` with `maxDpr: 2`, `budget: 2.6e6`; High takes the screen ratio |
| Sim grid | Per level (`LEVELS`, `:641`): Low n 160, heat to 512, 16 passes; Standard n 256, heat to 1024, 24 passes; High n 256, heat to 1024, 30 passes. The heat grid follows the disc size in device pixels, in steps of 64. |
| Slow-frame step | `detail()`: two seconds under 38 fps step down one level. A level change resamples the fields, so the plume stays. |
| Idle | After 90 s with no input, a lit source dies: the candle gutters, the cup cools, the iron sleeps. The match burns out in about 17 s anyway. When nothing feeds or moves the air, the heat fades over 8 s, the fields clear and the loop stops. Hidden pages stop at once. |
| Reduced motion | No flicker jitter and no sound-wave rings. The air runs at half pace, and only while a hand works it plus 4 s. The first frame holds still. Sources never die by idle. |
| Measured | 2026-11-15, Apple silicon, High, 2496 x 1424 canvas: about 1.4 ms a frame for one step and the render. Phone hardware not measured. |

## State and storage

| Key | Holds |
|---|---|
| `stimming.schlieren.sound` | Sound on or off |
| `stimming.schlieren.filter` | Knife, colour or shadow |
| `stimming.schlieren.angle`, `.lift`, `.curl`, `.pace`, `.grain` | Dev rows |
| `stimming.quality` | Site quality (shared) |

## Tests and QA

No files in `tests/`. QA on 2026-11-15 in the browser pane: clean console; source picks by click and by key; hover stir with real pointer events; Settings, Dev, Filter rows; sound on with every event voice and no errors; idle gutter, settle and stop; snap relight; 1280 x 760, 375 x 812 and 812 x 375 with no overlap and no sideways scroll.
A change to this toy checks the same list, plus `tests/bar-v2.html` for any shell change.

## Known issues

- The breath enters as a smooth warm bubble, not a ragged jet. See `stimming-fegy`.
- Swapping sources leaves the old source's warm skin in the air; it rises away as a ghost outline. This reads as true, but Tom may want it cleared.
- On 812 x 375 the key strip covers the flame for its first 8 s.

## Legacy build

None.

## History

| | |
|---|---|
| Epic | `stimming-fegy` (feature) |
| Plans | None |
| Version | None |
