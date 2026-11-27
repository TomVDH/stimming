# Purr (`purr/`)

<!-- gen:identity -->
| | |
|---|---|
| Dutch | None yet (Tom sets it) |
| Motto | Someone is comfortable, at least. |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None |
| Accent | `oklch(0.66 0.2 338)` |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |
<!-- /gen:identity -->

## Idea

A furry blob of no known species fills the stage, seen from above. A stroke lays the fur along the hand, and the pelt keeps the track, as velvet does. A calm, steady rhythm of strokes with the grain builds a purr; a stroke against the grain, or a poke, makes the fur bristle. Left alone, it sighs, slumps and sleeps.

## Controls

<!-- gen:bar -->
Bar: v3.

| Slot | Holds |
|---|---|
| Top left (choice) | Pelt, segments: Velvet, Shag, Frost, Ember (keys 1 to 4, with colour dots) |
| Bottom left (actions) | Shake (key S) |
| Bottom right (slider) | None |
| Key strip | `[DRAG] stroke the fur` · `[CLICK] poke the creature` · `[HOLD] rest a hand on it` · `[S] shake the creature` |
| Settings | Hand (slider: brush size, persisted) · Quality (site) · Reset in the footer |
| Dev (`?dev`) | Sheen, Rim, Exposure, Shells (sliders, not persisted) |
<!-- /gen:bar -->

| Gesture | Does |
|---|---|
| Click or tap | Pokes: the fur bristles round the finger, the body dents and jiggles, the eyes open, and it chirps. |
| Drag | Strokes: the fur lies along the stroke and keeps the track. With or across the grain it lies flat; against the grain it rises and bristles. The body leans toward the hand. |
| Hold (320 ms, no move) | Rests a hand: the fur under it presses flat, the body rises into it, and the purr builds slowly. |
| Keys | 1 to 4 pick a pelt. S shakes. With the stage focused, an arrow key strokes the back and Enter or Space pokes. |
| Wheel, pinch, tilt | None. |

A pelt change shakes the creature; the new coat settles out of the puff. Shake and Reset return the fur to its natural grain.

## Renderer and libraries

<!-- gen:stack -->
| | |
|---|---|
| Tier | Raw WebGL2 |
| Libraries | None imported by the page; culori loads through `shared/stim.js` |
| Importmap | Word for word |
<!-- /gen:stack -->

The picture is one view from above with per-pixel fur, so a full-screen shader pass is the lightest tier that draws it (`docs/stack.md`, decision guide step 1).

## Shared modules

<!-- gen:shared -->
| Module | Imports |
|---|---|
| `shared/stim.js` | `initPage`, `whenVisible`, `reduced`, `onReducedChange`, `audioKit`, `linFit`, `stage`, `pageReady` |
| `shared/intro.js` | `intro` |
| `shared/detail.js` | `detail` |
| `shared/glow.js` | `bloomChain`, `glowDetail` |
| `shared/output.js` | `OUTPUT` |
| `shared/grade.js` | `GRADE` |
<!-- /gen:shared -->

Local copies: the GL helpers (`shader`, `program`, `texture`, `target`) and the value-noise GLSL follow `stone/index.html`. No shared module holds them yet; see `docs/plans/modularize.md`.

## Files

<!-- gen:files -->
| File | Lines | Role |
|---|---|---|
| `index.html` | 1460 | The page |
<!-- /gen:files -->

## Render pipeline

Blob space is the creature's own frame: x right, y up, in units of its half-height. Every map covers the box `EXT` = (1.64, 1.52) round the blob centre (`purr/index.html:606`).

| Pass | Target | Shader or material | Does |
|---|---|---|---|
| Comb stamp | Comb map, 400 x 370, RGBA16F, ping-pong | `COMB_STAMP_FS` (`:280`) | One pass per stroke segment, poke or reset. xy holds the lie direction times how flat it lies, z the bristle, w the muss. |
| Comb relax | Comb map | `COMB_RELAX_FS` (`:318`) | Bristle and muss decay; the lie stays, so the track stays. It runs only while some bristle is left. |
| Strand and body maps | Two maps, 640 x 592, RGBA16F, one MRT pass | `PARAMS_FS` (`:331`) | Each frame: the strand vector (length times direction, from the skin normal toward the comb) with a root flag, and the skin height, normal and mask. It adds clumps, waves, muss, the purr tremble, eye partings, the hand press and poke dents. |
| Fur | HDR frame, RGBA16F | `FUR_FS` (`:423`) | A shell march per pixel, from the tips down. Shell t looks up the root that reaches the pixel at height t; each root cell holds one strand, and each shell tests one capsule piece of it. Kajiya-Kay light with two sheens, depth shade, a rim, Ember's glow and Frost's glints. Under the fur: dark skin, the eyes and the table. |
| Bloom | Half-size chain | `bloomChain` from `shared/glow.js` | Threshold 0.85; three or five levels by detail level. |
| Composite | Screen, or the sleep cache | `COMP_FS` (`:573`) | Bloom, vignette and grain (`GRADE`), then the film curve, sRGB and dither (`OUTPUT`). |
| Sleep blit | Screen | `SLEEP_FS` (`:589`) | Asleep: the cached frame, scaled about the body for each slow breath. |

### Uniforms

The pelt table (`PELTS`, `:109`) feeds the fur and strand passes. A person tunes these per pelt:

| Field | Meaning | Velvet, Shag, Frost, Ember |
|---|---|---|
| `L` | Fur length, blob units | 0.05, 0.15, 0.11, 0.085 |
| `cells` | Strand cells per blob unit (capped at two device pixels a cell) | 165, 90, 124, 118 |
| `lie` | How flat the fur lies: upright end, flat end | 0.3 to 0.93, 0.25 to 0.82, 0.3 to 0.88, 0.3 to 0.9 |
| `clump` | Pull toward clump centres | 0, 0.42, 0.25, 0.35 |
| `wave` | Low-frequency turn of the comb, radians | 0.3, 0.8, 0.45, 0.5 |
| `spec` | Sheen exponents: tip lobe, root lobe | 110/26, 70/18, 130/32, 95/24 |
| `sheen2` | Strength of the tinted root lobe | 1.1, 0.6, 0.5, 0.3 |
| `f0` | Purr pulse rate at rest, Hz | 25, 22, 27, 24 |

The shell count is `2.4 * L * 1.35 * cells`, clamped to 12 to 96, so one shell step never skips half a strand cell (`:696`).

## Sound

| | |
|---|---|
| Graph | `audioKit()` |
| Engine | Raw Web Audio |
| Voices | Purr: breath noise through a band-pass, chopped by a 22 to 30 Hz pulse train (a sine through a wave shaper), over a saw buzz at the same rate. Each frame it follows the breath: brighter, louder and a little quicker on the in-breath, with a dip where the breath turns. Its level follows content. Rustle: soft high noise held by each stroke event, with static clicks against the grain. Chirp ("mrrp?", or a grumpy "mrrh"), wake "mm?", grumble with a puff of air, sigh with a soft hum, and a shake "brrr": a saw through two formants with a rolled trill, or filtered noise. |
| Sleep | `hush()` fades the purr and the rustle when it falls asleep or the tab hides; `kit.rest()` then suspends the context. |

## Quality and performance

| | |
|---|---|
| Pixel ratio | `detail({ maxDpr: 2, budget: 2.4e6 })`; High gives the screen's ratio up to 3 |
| Slow-frame step | `detail()`: two seconds under 38 fps drop one level; a new quality choice clears it |
| Idle | Awake, the loop runs: it breathes and the purr follows the breath. After 8 s with no touch it sighs and settles; at 13 s it sleeps. Asleep, one cached frame breathes by scale alone at about 20 frames a second (one texture read per pixel). Hidden, the loop stops. |
| Reduced motion | No breathing, jiggle, shake wobble, purr buzz, fur tremble or ember flicker. Asleep, the loop stops. Strokes still lay the fur. |
| Measured | 2026-11-15, Apple M3 Pro, High, 1738 x 1872 px: 5.5 ms (Velvet), 7.3 ms (Shag), 7.8 ms (Frost), 6.1 ms (Ember) per frame. Phone numbers not measured. |

## State and storage

| Key | Holds |
|---|---|
| `stimming.purr.sound` | Sound on or off |
| `stimming.purr.hand` | Hand size, from Settings |
| `stimming.quality` | Site quality (shared) |

## Tests and QA

No files in `tests/`. QA on 2026-11-15 ran in the built-in browser pane with a throwaway probe page (a manual frame driver and canvas captures): console clean, strokes, pokes, holds, every Bar v2 control and key, the sleep cycle, the sound graph (purr pulse measured at 28 Hz), and 1280-class, 375 x 812 and 812 x 375 layouts. A change must keep the console clean and hold Bar v2 compliance (`docs/plans/bar-v2.md`).

## Known issues

- The sound was checked by measurement only, not by ear (`stimming-71qx`).
- Phone frame times are not measured (`stimming-71qx`).

## Legacy build

None.

## History

| | |
|---|---|
| Epic | None; feature bean `stimming-71qx` |
| Plans | None; idea 264 in `docs/toy-ideas.md` |
| Version | None |
