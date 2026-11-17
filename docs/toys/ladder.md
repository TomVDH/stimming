# Jacob's ladder (`ladder/`)

<!-- gen:identity -->
| | |
|---|---|
| Dutch | None yet (Tom sets it) |
| Motto | None |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None (proposal: `science`) |
| Accent | `linear-gradient(100deg, oklch(0.74 0.13 52), oklch(0.78 0.15 300))` |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |
<!-- /gen:identity -->

## Idea

Two copper rods stand in a V on a dark transformer box in a dark lab. An arc strikes at the narrow foot, rides its own hot air up the rods, stretches as they part, writhes, loops over the tips and snaps. Then a new arc strikes at the foot.
The hand is breath: hold to blow and the arc bows away, tears early, or rides up faster. A mouse near the arc leans it away. The arc is the only light in the room.

## Controls

<!-- gen:bar -->
Bar: v2 (`ladder/index.html:117`).

| Slot | Holds |
|---|---|
| Top left (choice) | None |
| Bottom left (actions) | `Blow` (held; Space): an updraft from the box top |
| Bottom right (slider) | `Gap`, 0 to 1, default 0.45: half the gap at the tips, 1.9 to 8.4 cm; the rods swing to it in 0.25 s |
| Key strip | hold: blow on it; move: lean it; space: blow from below |
| Settings | `Arc flicker` (Off, Soft, Full; default Soft; kept), Quality |
| Dev (`?dev`) | `Climb`, `Writhe`, `Reach`, `Arc core`, `Air glow`, `Bloom`, `Shimmer`, `Room light`, `Exposure`, and the camera: `Distance`, `Pitch`, `Yaw`, `Field of view`, `Aim height`; not kept |
<!-- /gen:bar -->

| Gesture | Does |
|---|---|
| Click or tap | A puff of 0.22 s from the pointer |
| Press and hold | Breath from the pointer: a radial flow, 78 cm/s at full, falling off over 11 cm. From the side the arc bows away and tears early; from below it rides up faster; from above it is pushed down |
| Drag | The breath follows the pointer |
| Mouse over the stage | A near hand pushes the arc away (16 cm/s inside about 5 cm) and drags air as it moves |
| Keys | Space holds the Blow chip; Enter on the stage puffs from the left |

## Renderer and libraries

<!-- gen:stack -->
| | |
|---|---|
| Tier | Raw WebGL2 |
| Libraries | None from the importmap (the shell loads culori) |
| Importmap | Word for word |
<!-- /gen:stack -->

The room is a handful of analytic shapes seen through one full-screen ray pass, and the arc is one strip, so raw WebGL2 draws it with no library (`docs/stack.md`, decision guide 1).

## Shared modules

<!-- gen:shared -->
| Module | Imports |
|---|---|
| `shared/stim.js` | `initPage`, `whenVisible`, `reduced`, `audioKit`, `linFit`, `stage`, `pageReady` |
| `shared/intro.js` | `intro` |
| `shared/glow.js` | `bloomChain`, `glowDetail` |
| `shared/detail.js` | `detail` |
| `shared/output.js` | `OUTPUT` |
| `shared/grade.js` | `GRADE` |
<!-- /gen:shared -->

No local copies of shared code. The page keeps its own small `shader`, `program` and `target` helpers, as Worry stone and Steel wool do; `shared/gl.js` could replace them (`docs/plans/modularize.md`).

## Files

<!-- gen:files -->
| File | Lines | Role |
|---|---|---|
| `index.html` | 1616 | The page: CSS, markup, vignette, one module script |
<!-- /gen:files -->

## Render pipeline

The arc runs on the CPU as a chain of 44 nodes. The GPU draws the room, the arc and the air.

| Pass | Target | Shader | Does |
|---|---|---|---|
| 1. Arc step | CPU | `stepArc`, `stepLife` (`index.html:459`, `565`) | Buoyant climb, a two-scale curl field for the writhe, the hand's air, implicit tension, even resampling; roots stick and skip up the rods; loops that touch short out; a node that brushes a rod becomes a root |
| 2. Strips | CPU | `buildRibbon` | Catmull-Rom points between the nodes (4 per span), fine kinks in three octaves, one strip per arc (live and dying) |
| 3. Air advect | `sim` (RGBA16F, CSS size / 2.3) | `ADV_FS` (`index.html:1010`) | Trail (R, 0.13 s), heat (G, 0.9 s, rises 24 cm/s) and flame (B, 0.11 s, rises 32 cm/s); the breath, the Blow updraft and a curl field move them |
| 4. Air feed | `sim`, additive | `RIB_VS` + `INJ_FS` | The same strips, wide and soft, add trail, heat and flame |
| 5. Room | `hdr` (RGBA16F) | `SCENE_FS` (`index.html:656`) | Rays hit the bench, the wall, the box, two ribbed insulators and six rod capsules; two rays per pixel on edges; analytic coverage on the rods; eight light points (four per arc) light the room, with soft box and insulator shadows; the rods see each arc as three line segments (representative point); glowing copper from a rod heat texture |
| 6. Arc | `hdr`, additive | `RIB_VS` + `ARC_FS` | White core and violet sheath; copper vapour tints the sheath near the roots |
| 7. Root spots | `hdr`, additive | `SPOT_VS` + `SPOT_FS` | A white point and a warm halo where the arc grips the copper |
| 8. Bloom | Half size | `bloomChain` (`shared/glow.js`) | Threshold 2.2, cap 30, 4 levels (3 at Low) |
| 9. Composite | Screen | `COMP_FS` (`index.html:1042`) | Shimmer offset from the heat, air glow, bloom tinted violet, `gdGrade`, `ouFilm` |

### The arc

| Value | Default | Meaning |
|---|---|---|
| `V0` | 13 cm/s | Climb speed, times `speedOf(len)`: 2.1 for short arcs down to 0.6 for long ones |
| `TENSION` | 2.6 cm²/s | Curve-shortening rate of the implicit smoothing |
| Writhe | 2.2 to 8.6 cm/s | Curl field amplitude, rising with the arc's length |
| Break length | (17 + 9 × Gap) cm, ± 10 % | Times (1 − 0.5 × cooling); cross-flow from the breath cools the arc |
| Tips | 0.5 s, or 1.35 × length + 0.5 cm | When both roots sit on the tips, the arc lets go |
| `MIN_AGE`, `MIN_CYCLE` | 0.38 s, 0.5 s | No break before 0.38 s; no strike sooner than 0.5 s after the last |

Measured on 2026-11-16 (probe, Mac): the default Gap gives a cycle of 2.2 to 2.4 s and every arc reaches the tips; Gap 0 gives 1.45 s cycles of 7 to 9 cm arcs; Gap 1 gives 2.1 to 3.5 s cycles of 22 to 27 cm arcs that snap at 0.74 to 1.0 of the rod. A side breath tears an arc after 0.9 s; breath from below climbs 47 % faster; the Blow key climbs twice as fast.

### Uniforms (the ones a person tunes)

| Uniform | Pass | Meaning | Default |
|---|---|---|---|
| `uLcol` | Room | Arc light colour times power: 820 × room power × `Room light` | 820 |
| `uSpecK` | Room | Highlight gain on the copper | 0.55 |
| `uHotK` | Room | Glowing copper gain | 2.2 |
| `uCoreK`, `uSheathK` | Arc | Core and sheath brightness, times `Arc core` | 9, 1.8 |
| `uCoreS`, `uSheathS` | Arc | Core and sheath width, device px | 0.03 and 0.14 cm, at least 0.5 and 1.4 px per unit of pixel ratio |
| `uShim` | Composite | Shimmer offset at full heat, device px | 3.2 × ratio × `Shimmer` |
| `uBloomK` | Composite | Bloom gain | 0.5 × `Bloom` |
| `uTrailC`, `uFlameC` | Composite | Air glow colours | 1.1 and 0.77 × `Air glow` |
| `uExpo` | Composite | Exposure | 1.1 × `Exposure` |

## Sound

| | |
|---|---|
| Graph | `audioKit({ gain: 0.5 })` |
| Engine | Raw Web Audio |
| Voices | The buzz: a sawtooth and a square at the mains hum, clipped, then a formant band and a low pass; it climbs from 100 Hz up to seven semitones with the arc, and the band from 480 Hz to 2.8 kHz. The sizzle: noise gated at the hum rate. Crackles: 10 to 77 a second, more on long arcs and under breath. The snap: a dry crack (a 6 ms high burst, a 35 ms band and a 170 to 48 Hz thump), and the buzz cuts out. The strike: a 4 ms tick. A loop that shorts: one crackle. The breath: soft band-passed noise |
| Sleep | The context suspends when the tab hides; muting suspends it too |

## Quality and performance

| | |
|---|---|
| Pixel ratio | `detail({ maxDpr: 2, budget: 2.4e6 })` |
| Slow-frame step | `detail()`: Standard falls to ratio 1, High to Standard; at Low the air buffer is smaller (CSS size / 3.2) and the bloom has 3 levels |
| Idle | Never idle: the arc never stops. The loop runs while the stage shows, at most about 60 fps on faster screens, and stops when the tab hides or the stage scrolls away |
| Reduced motion | The arc climbs smoothly: no root skips, a quarter of the writhe, slow fine kinks, no shimmer, no thread flicker, still grain; at a snap the old arc fades over 0.4 s while the next grows at the foot |
| Flicker comfort | The room light follows the arcs' power in 0.3 s and cross-fades between arcs, so the whole frame stays steady. Arc flicker sets the thread: Off (no wobble, 0.16 s fades), Soft (6 % wobble, 70 and 50 ms fades), Full (16 % wobble, a hard snap and a short bright strike) |
| Measured | 2026-11-16, Mac M3 Pro, probe at 2496 × 1504, High: GPU timer 4 to 10 ms a frame in a throttled background pane. Whole-frame luma over 5 s: within about ± 9 % of its mean, largest frame step 1.7 % (Off), 3.5 % (Soft), 4.5 % (Full), 3.1 % then 1.5 % (reduced motion); no opposing 10 % swings. Not measured on a phone |

## State and storage

| Key | Holds |
|---|---|
| `stimming.ladder.sound` | Sound on or off |
| `stimming.ladder.flicker` | Arc flicker: off, soft or full |

## Tests and QA

None in `tests/`. Checks for a change: a clean console; press, hold, drag and click on the stage; the Blow chip and Space; the Gap slider; Settings (Arc flicker, Quality); sound after a gesture; the bar at 1280 px, 375 × 812 and 812 × 375; reduced motion.

QA on 2026-11-16 (built-in browser pane, background tab, synthetic and real input, a probe copy for stills): all of the above passed. The pane ran at about 1 fps in the background, so motion and frame rate were judged from probe steps, not watched. Sound was checked by its nodes and a running context, not by ear.

## Known issues

- The sound has not been listened to; levels, crackle rate and the crack are first guesses.
- Motion and frame rate were not watched live; phone frame rate is not measured.
- The arc vapour tint reads the live arc's length for the dying arc too (minor).

## Legacy build

None.

## History

| | |
|---|---|
| Epic | `stimming-za3e` (feature) |
| Plans | None |
| Version | None |
