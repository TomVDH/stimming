<!--
Toy doc. Rules: docs/plans/toy-docs.md. Prose: ASD-STE100, double density. No em dashes.
A section marked (gen) comes from toys.json, series.json or the page source.
-->

# Hot ice (`hotice/`)

<!-- gen:identity -->
| | |
|---|---|
| Dutch | None yet (Tom sets it) |
| Motto | None |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None (proposal: `science`) |
| Accent | `linear-gradient(90deg, oklch(0.96 0.02 230), oklch(0.84 0.08 72))` |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |
<!-- /gen:identity -->

## Idea

A shallow glass dish of clear, supercooled sodium acetate solution stands on a dark lab bench. It looks like water.
A touch seeds a crystal at that point. Fans of white needles race out, branch, meet the fronts of other seeds and lock along a seam, until the dish is solid, white and warm.
The lamp hangs on the pointer's mirror line, so its reflection follows the pointer over the liquid, and the needle fans catch it in turn. Reset melts the dish back to clear, from the rim in.

## Controls

<!-- gen:bar -->
Bar: v3 (the default). Bar v2 still builds, hidden.

| Slot | Holds |
|---|---|
| Choice | None |
| Action | Reset (key R): the melt |
| Slider | Cold: sets the next seed. Colder grows faster, branches more and has shorter needles. |
| How to play | `[CLICK] Seed a crystal`, `[MOVE] Move the lamp`, `[ENTER] Seed a crystal at random`, `[R] Melt the dish` |
| Settings | Lamp follows pointer (toggle, stored), site Quality |
| Dev (`?dev`) | Camera: Pitch, Yaw, Zoom, Field of view, View Reset. Look: Exposure, Needle sheen, Sparkle, Vapour. All stored. |
<!-- /gen:bar -->

| Gesture | Does |
|---|---|
| Click or tap | On liquid: a ripple ring, then a seed. On crystal: a dull knock. Sixteen seeds at most until the next melt. |
| Drag (touch) or move (mouse) | Moves the lamp. Its reflection sits under the pointer. On touch the lamp goes home on release. |
| Keys | Enter on the focused stage seeds a crystal at a random liquid point. R melts. |
| Wheel, pinch, tilt | None. |

Reset is disabled while the dish is clear and while it melts.

## Renderer and libraries

<!-- gen:stack -->
| | |
|---|---|
| Tier | Raw WebGL2 |
| Libraries | None (the page carries the importmap but imports no library) |
| Importmap | Word for word |
<!-- /gen:stack -->

The picture is one ray per pixel against analytic shapes (two planes, two cylinders) over a growth field in ping-pong float textures, so raw WebGL2 fits (`docs/stack.md`, decision guide 1).
The page needs `EXT_color_buffer_float` and a renderable RGBA32F target. Without them, the stage shows the fail line and the bar hides.

## Shared modules

<!-- gen:shared -->
| Module | Imports |
|---|---|
| `shared/stim.js` | `initPage`, `whenVisible`, `reduced`, `onReducedChange`, `audioKit`, `linFit`, `stage`, `pageReady` |
| `shared/detail.js` | `detail` |
| `shared/gl.js` | `TRI_VS`, `program`, `linked`, `target`, `free`, `bind`, `tri`, `renderable`, `onContextLoss` |
| `shared/glow.js` | `bloomChain`, `glowDetail` |
| `shared/output.js` | `OUTPUT` |
| `shared/grade.js` | `GRADE` |
| `shared/intro.js` | `intro` |
<!-- /gen:shared -->

No local copies of shared code. The noise and hash helpers in `NOISE` (`index.html:154`) are the toy's own.

## Files

<!-- gen:files -->
| File | Lines | Role |
|---|---|---|
| `index.html` | 1474 | The page: shell, growth field, scene, sound and vignette |
<!-- /gen:files -->

## Render pipeline

The growth field is a first-arrival-time field, as in an eikonal solver. Each cell holds when the crystal reaches it, so the front is a level set and stays smooth at any frame rate.

| Pass | Target | Shader | Does |
|---|---|---|---|
| 0 | `wear` (RGBA8, 2048 x 2048) | `WEAR_FS` (`index.html:692`) | Once at build: the bench's wear and scratches |
| 1 | `st` (RGBA32F, N x N) | `SEED_FS` (`:183`) | A touch stamps a small disc. The disc is cut into five to nine fans that lean off the radius. |
| 2 | `st` x iterations | `RELAX_FS` (`:209`) | Each cell takes the earliest arrival over 16 neighbours. Needles grow fast along their axis and slowly across it. A needle keeps its parent's angle with a small wander and now and then branches. A streak value rides along the needle, so needles read as fibres. |
| 3 | `sum1` (RGBA16F, 64 x 64) | `SUM1_FS` (`:296`) | Per block: frozen, fresh and fresh-seam counts, and mean heat |
| 4 | `sum2` (RGBA32F, 8 x 8) | `SUM2_FS` (`:322`) | Sums for the CPU; read back through a pixel buffer and a fence |
| 5 | `hdr` (RGBA16F, canvas) | `SCENE_FS` (`:336`) | Bench, glass rim and walls, liquid (refraction to the bench, the lamp's mirror, meniscus, ripples), crystal (fibres, needle sheen, fan facets, glints, seams, the front), crystal shadows through the liquid, vapour |
| 6 | Bloom levels | `bloomChain` (`shared/glow.js`) | Threshold 2.2: the lamp's reflections and the glints |
| 7 | Canvas | `COMP_FS` (`:708`) | Vignette, film curve, sRGB, static grain, dither |

State channels in `st`: r arrival time (s), g needle angle, b streak, a grain (seed number plus a fan code in its fraction).
Iterations per frame: `ceil(v * dt * 2.2 / 1.7) + 1`, from 2 to 16 (24 under reduced motion), so the field runs ahead of the clock.
A scissor box round the seeds (radius 2.6 times the front) limits the passes. Cells settled 0.45 s behind the front exit at once (`relax`, `:848`).
The grid is 768 (High), 512 (Standard) or 384 (Low) cells across; a new level takes effect at the next clear dish.

The camera fits the dish to the stage (`fitCamera`, `:955`). Wide stages look down at 58 degrees; tall ones at up to 72 degrees.
Dish units: inner radius 1, wall to 1.03, rim 0.26 high, base top 0.03, liquid surface 0.12 (`DISH`, `:140`).

### Uniforms

`RELAX_FS`, per seed (set from Cold at the touch, `addSeed`, `:813`):

| Uniform | Type | Meaning | Range or default |
|---|---|---|---|
| `uV[16]` | float | Needle speed, cells a second | 0.3 to 1.0 dish radii a second, times the radius in cells |
| `uBr[16]` | float | Branch chance per cell | 0.0015 to 0.006 |
| `uAl[16]` | float | Streak renewal per cell (short needles when high) | 0.02 to 0.06 |
| `uSide` | float | Growth across a needle, as a share of along | 0.36 |
| `uJit`, `uBeta` | float | Angle wander per cell; branch angle | 0.02; 0.55 rad |

`SCENE_FS`:

| Uniform | Type | Meaning | Range or default |
|---|---|---|---|
| `uLpos` | vec3 | The lamp: 3.6 units out on the pointer's mirror line, never below 30 degrees | Rest: the reflection sits at (-0.34, 0.3) |
| `uShow` | float | The clock the picture shows | Crystal time; 1e4 for a still reveal |
| `uMelt` | float | Melt progress, rim first | 0 to 1 over 1.7 s |
| `uSheen`, `uSpark`, `uVap` | float | Needle sheen, glints, vapour | Dev, 1 each |
| `uRip[4]` | vec4 | Touch ripples: centre, age, strength | 1.1 s each |

## Sound

| | |
|---|---|
| Graph | `audioKit({ gain: 0.6 })` |
| Engine | Raw Web Audio on the kit noise buffer, plus two baked click loops |
| Voices | Crackle: a fine fizz loop and a drier snap loop, panned to where the dish froze; the summary sets their gain from the share of the dish that froze per second (`crackle`, `:1125`). Tinks: short high sines at random while it grows. Seam tick: a click and a short sine where two grains meet, each summary cell rests between ticks (`seamTick`, `:1150`). Touch: a falling blip and a snap. Knock on crystal. Settle when the last liquid locks. Melt: a sinking hush, small bubbles, one last drop. Still reveal: one swell of clicks. |
| Sleep | The loop end calls `kit.rest`; the crackle gains go to zero first. |

Checked on 2026-11-16 with an analyser on `kit.out`: the context runs after a real click on Sound; the crackle reads RMS about 0.007 to 0.012 while one seed grows. Heard by no one yet.

## Quality and performance

| | |
|---|---|
| Pixel ratio | `detail()` with `maxDpr: 2`, `budget: 2.2e6`; High takes the screen ratio |
| Slow-frame step | `detail()`: two seconds under 38 fps step down one level (pixel ratio, bloom levels). The grid follows at the next clear dish. |
| Idle | The loop stops when the dish is clear and the lamp is still, or 7.6 s after the last liquid locks (the heat and the vapour reach zero). Hidden pages stop at once. |
| Reduced motion | No racing front: the field relaxes out of sight, then the crystal fades in over 0.8 s with one swell of sound. No vapour, no ripples. The lamp stays home. The melt takes 0.5 s. |
| Measured | Not measured. The browser pane ran this page only as a background tab, so the frame rate and motion were not seen. |

## State and storage

| Key | Holds |
|---|---|
| `stimming.hotice.sound` | Sound on or off |
| `stimming.hotice.follow` | Lamp follows pointer |
| `stimming.hotice.pitch`, `.yaw`, `.zoom`, `.fov`, `.exposure`, `.sheen`, `.sparkle`, `.vapour` | Dev rows |
| `stimming.quality` | Site quality (shared) |

## Tests and QA

No files in `tests/`. QA on 2026-11-16 in the browser pane, in a background tab: clean console on load and after a seed; Reset by chip state and by key R; Enter seeds at random; Settings and Dev sheets; sound by real clicks; 1280 x 800, 375 x 812 and 812 x 375 with no overlap and no sideways scroll.
Stills came from a throwaway probe page that drives the clock by hand (growth, two and three seeds with seams, the solid dish under three lamp positions, the melt, all three sizes).
A change to this toy checks the same list, plus `tests/bar-v2.html` for any shell change.

## Known issues

- Motion and frame rate are not seen yet: the growth speed and the vapour drift need a look in a front tab. See `stimming-ljrm`.
- On a 375 px phone the toy name drops out of the top row; the shell does this when the row collides.
- A tap on crystal that a still reveal has not shown yet knocks instead of seeding (reduced motion only).

## Legacy build

None.

## History

| | |
|---|---|
| Epic | `stimming-ljrm` (feature) |
| Plans | None |
| Version | None |
