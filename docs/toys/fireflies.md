# Firefly sync (`fireflies/`)

<!-- gen:identity -->
| | |
|---|---|
| Dutch | None yet (Tom sets it) |
| Motto | None |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None |
| Accent | `oklch(0.9 0.19 112)` |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |
<!-- /gen:identity -->

## Idea

A night meadow seen from a low rise: about 730 fireflies blink out of step, then pull each other into one shared beat in about a minute.
Each firefly sees only the flashes near it. A late one hurries, an early one waits. Below a threshold of Pull they never lock.
A touch startles a patch: a ring of flashes runs out and the patch loses the beat, then heals. A hold shines a lantern the swarm follows.

## Controls

<!-- gen:bar -->
Bar: v2 (`fireflies/index.html:101`).

| Slot | Holds |
|---|---|
| Top left (choice) | `Rhythm`, segments: Pulse (1), Double (2), Burst (3), default Pulse |
| Bottom left (actions) | `Shuffle` (S); `Lead` (L), a held action |
| Bottom right (slider) | `Pull`, 0 to 1, default 0.45: how hard each firefly answers a flash |
| Key strip | click scatter; drag sweep; hold lead; S shuffle |
| Settings | Quality; Reset in the footer |
| Dev (`?dev`) | `Exposure`, `Bloom`, `Light`, `Aperture`, `Spread`, `Sight`, `Reach` (all persist) |
<!-- /gen:bar -->

| Gesture | Does |
|---|---|
| Click or tap | Startles the fireflies within about a tenth of the stage: a ring of flashes runs out, they scatter, their clocks reset |
| Drag | Sweeps: the same startle along the path, pushed the way the hand goes |
| Hold still (380 ms) | Shines a warm lantern at the pointer; it keeps its own beat and counts as 40 fireflies; drag to carry it |
| Keys | 1, 2, 3 pick the rhythm; S shuffles; hold L for the lantern; Space or Enter on the focused stage scatters a patch |
| Wheel, pinch, tilt | None |

Rhythms: Pulse is one flash every 0.95 s. Double is two flashes 0.21 s apart every 1.3 s. Burst is four flashes 0.36 s apart every 3.4 s, so no rhythm flashes more than three times a second.

## Renderer and libraries

<!-- gen:stack -->
| | |
|---|---|
| Tier | Raw WebGL2 (GLSL), instanced quads |
| Libraries | None from the importmap; `shared/stim.js` loads culori itself |
| Importmap | Word for word |
<!-- /gen:stack -->

The scene is flat per-pixel work plus a few hundred sprites, so raw WebGL2 draws it with no library (`docs/stack.md`, rule 1).

## Shared modules

<!-- gen:shared -->
| Module | Imports |
|---|---|
| `shared/stim.js` | `initPage`, `whenVisible`, `reduced`, `onReducedChange`, `audioKit`, `linFit`, `stage`, `pageReady` |
| `shared/detail.js` | `detail` |
| `shared/glow.js` | `bloomChain`, `glowDetail` |
| `shared/output.js` | `OUTPUT` |
| `shared/grade.js` | `GRADE` |
| `shared/intro.js` | `intro` |
<!-- /gen:shared -->

Drift: none known. The noise GLSL is a local copy of the one in `stone/` (`docs/plans/modularize.md`).

## Files

<!-- gen:files -->
| File | Lines | Role |
|---|---|---|
| `index.html` | 1342 | The page: CSS, markup, vignette, one module script |
<!-- /gen:files -->

## Render pipeline

| Pass | Target | Shader or material | Does |
|---|---|---|---|
| Bake (once per size) | Two RGBA16F maps, full size | `BAKE_FS` (`:233`) | Sky, stars, woods at 160 m, the lantern tree, the meadow, three layers of front grass. Map 0: colour and inverse depth. Map 1: grass cover, grass rim, surface kind, leaf glow |
| Light | RGBA16F at a third to a sixth of the size | `LIGHT_VS`/`LIGHT_FS` (`:381`), instanced splats | Red: a pool on the ground under each flashing firefly. Green, blue, alpha: air glow in three depth bands (4, 12, 35 m) |
| Scene | HDR, full size | `SCENE_FS` (`:403`) | Lights the bake: pools on the meadow, air glow on leaves and bark, a warm rim on the front grass, haze over the sky; the grass sways |
| Fireflies | HDR, additive | `FLY_VS`/`FLY_FS` (`:445`), instanced quads | A sharp core far off, a soft disc nearer than 12 m; a nearer surface in the bake hides a firefly |
| Bloom | Half size chain | `bloomChain` from `shared/glow.js` | Threshold 0.9, five levels (three on Low) |
| Composite | Screen | `COMP_FS` (`:495`) | Bloom, `gdGrade` (tint, vignette, grain), `ouFilm` (ACES, sRGB, dither) |

### Uniforms

Tuned through the Dev rows; the shaders take them as uniforms.

| Uniform | Type | Meaning | Range or default |
|---|---|---|---|
| `uExpo` | float | Exposure before the film curve | 0.3 to 3, 1 |
| `uBloomK` | float | Bloom strength, times the image scale on small screens | 0 to 2, 0.6 |
| `uLightK` | float | How strongly flashes light the scene | 0 to 6, 1 |
| `uLeafK`, `uRimK` | float | Leaf glow and grass rim gains | 0.05, 0.1 |
| `uSway` | float | Front grass sway in CSS px; 0 under reduced motion | 7 |

## Phase model

Each firefly keeps a clock `TH` from 0 to 1 and its own speed, spread about one beat by `Spread` times a factor per rhythm (`:567`).
Each step (`:832`), every flash is splatted onto a 1.5 m ground grid, with the firefly count beside it. Both blur by `Sight` (3 m). Their ratio is the mean flash a firefly sees.
The seen light, saturated, drives a phase response `-sin(2 pi (TH - centre))`: a flash just before a firefly's own hurries it, one just after slows it. `Reach` (0.25) mixes in the mean of the whole meadow.
`Pull` sets the coupling as a multiple of the Kuramoto threshold for the spread (`:600`): 12 x Pull^1.75. The meadow never locks below about Pull 0.25; at 0.45 it locks in 40 to 60 s; at 1 it snaps in a few seconds.
Light never slows a clock below a third of its speed, so a bright volley cannot freeze the meadow.

## Sound

| | |
|---|---|
| Graph | `audioKit()` |
| Engine | Raw Web Audio |
| Voices | Patter: up to three filtered noise clicks a frame from random onsets (rain). Tick: one glass sine with a bell partial a frame, from the nearest flash, on a D major pentatonic. Heartbeat: when a frame window holds far more onsets than chaos gives, a falling low sine and thud; Pulse plays lub and dub, Double plays its two flashes as lub and dub, Burst falls through the volley; a big crowd adds a warm D chord. Lantern: a low bell on each of its flashes. Whoosh: a band of noise on a scatter |
| Sleep | The context suspends when the stage is hidden; muted by default |

## Quality and performance

| | |
|---|---|
| Pixel ratio | `detail({ maxDpr: 2, budget: 2.4e6 })`: High uses the screen's ratio; Standard caps at 2 and 2.4 Mpx |
| Slow-frame step | `detail()`: two seconds under 38 fps step down once; Low uses ratio 1, a sixth-size light map, three bloom levels |
| Idle | The loop runs while the stage shows, because the fireflies never stop blinking. `whenVisible` stops the loop and the clocks when it is off screen or the tab hides |
| Reduced motion | No drift, no scatter push, no startle flashes, no grass sway, still grain, a smaller lens blur; flashes become slow glows. Sync still runs |
| Measured | 2026-11-15, Apple laptop, High, 1738 x 1872 px: 2.9 ms a frame median, 3.4 ms p90, with a forced GPU sync; the sim alone 0.2 to 0.3 ms |

## State and storage

| Key | Holds |
|---|---|
| `stimming.fireflies.sound` | Sound on or off |
| `stimming.fireflies.exposure`, `.bloom`, `.light`, `.aperture`, `.spread`, `.sight`, `.reach` | Dev rows |

## Tests and QA

No files in `tests/`. Checked on 2026-11-15 in the browser pane: a clean console, tap, drag, hold, Shuffle, Lead, the rhythm keys, the slider, Settings, sound output measured with an analyser, and 1280 x 800, 375 x 812 and 812 x 375. Reduced motion was checked by reading the code only.

## Known issues

- None known.

## Legacy build

None.

## History

| | |
|---|---|
| Epic | `stimming-oh7b` (Lab toys); bean `stimming-2d6w` |
| Plans | None |
| Version | None |
