# Lava skin (`lavaskin/`)

<!-- gen:identity -->
| | |
|---|---|
| Dutch | None (Tom sets it) |
| Motto | None |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None |
| Accent | `linear-gradient(100deg, oklch(0.6 0.2 33), oklch(0.86 0.15 80))` (proposal) |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |
<!-- /gen:identity -->

## Idea

A close view of slow basalt lava at dusk: plates of dark glassy skin with ropes and a silver sheen, over a bright interior. The flow creeps; seams flare open, glow and seal black again.
A press breaks the skin, a hold lets fresh lava well up and spread, a drag tears the skin open. Each break crusts over in about twenty seconds. Idea 331 in the pool.

## Controls

<!-- gen:bar -->
Bar: v2 (`lavaskin/index.html:107`).

| Slot | Holds |
|---|---|
| Top left (choice) | None |
| Bottom left (actions) | `Surge` (Space): seams open and three vents break out; `Shuffle` (S): new plates, new flow line |
| Bottom right (slider) | `Heat`: seam activity, glow, creep speed, cooling time |
| Key strip | click break; hold well up; drag tear; space surge |
| Settings | Heat shimmer (On, Off); Quality; Reset |
| Dev (`?dev`) | Glow, Sheen, Bloom, Plate size, Grain |
<!-- /gen:bar -->

| Gesture | Does |
|---|---|
| Click or tap | Breaks the skin: a crack flare and a small pool |
| Hold | Feeds a well under the pointer; it grows to about 0.84 world units and stays fresh while held |
| Drag | Tears the skin along the path; a slow drag tears wider. A drag that rests for 220 ms starts a well |
| Keys | Space surges, S shuffles |
| Wheel, pinch, tilt | None |

## Renderer and libraries

<!-- gen:stack -->
| | |
|---|---|
| Tier | Raw WebGL2 |
| Libraries | None imported |
| Importmap | Word for word |
<!-- /gen:stack -->

One flat view of per-pixel maths and a small field on a texture: the raw WebGL2 tier in `docs/stack.md`.

## Shared modules

<!-- gen:shared -->
| Module | Imports |
|---|---|
| `shared/stim.js` | `initPage`, `whenVisible`, `onQuality`, `reduced`, `onReducedChange`, `audioKit`, `stage`, `pageReady` |
| `shared/intro.js` | `intro` |
| `shared/detail.js` | `detail` |
| `shared/glow.js` | `bloomChain`, `glowDetail` |
| `shared/grade.js` | `GRADE` |
| `shared/output.js` | `OUTPUT` |
<!-- /gen:shared -->

Drift: none known. The page keeps its own value noise, gradient noise and Voronoi in GLSL; no shared module has them.

## Files

<!-- gen:files -->
| File | Lines | Role |
|---|---|---|
| `index.html` | 1022 | The page: CSS, markup, vignette, one module script |
<!-- /gen:files -->

## Render pipeline

| Pass | Target | Shader | Does |
|---|---|---|---|
| 1. Field | 512 x 512 RGBA16F, ping-pong, wraps | `FIELD_FS` (`:260`) | Cools the breaks, blanks texels that wrap round the window, adds up to 8 stamps a pass |
| 2. Scene | Full-size RGBA16F | `SCENE_FS` (`:303`) | Plates and seams (Voronoi), fine cracks, ropes, breaks; black-body light; the dusk sky in the glass |
| 3. Bloom | glow.js chain | `bloomChain` | Threshold 0.9; 5 levels, 3 on Low |
| 4. Frame | Canvas | `COMP_FS` (`:476`) | Heat shimmer from the bloom, bloom add, grade.js vignette and grain, output.js film curve |

The field lives in the lava's own frame: the view moves over it by `drift`, so the creep needs no advection.
The window is 16 world units a side; the view always fits inside it with a margin.

### Uniforms (the ones a person tunes)

| Uniform | Type | Meaning | Range or default |
|---|---|---|---|
| `uHeat` | `float` | Heat slider, eased over 0.8 s | 0 to 1, default 0.5 |
| `uGain` | `float` | Emission gain (Dev: Glow) | 2 |
| `uSheen` | `float` | Sky reflection on the glass (Dev: Sheen) | 1 |
| `uPlate` | `float` | Plate size in world units (Dev: Plate size) | 1.35 |
| `uSurge` | `float` | Surge envelope: up in 0.8 s, down by 9 s | 0 to 1 |
| `uKeep` (field) | `vec4` | Cooling rates per second: melt, heat, dome, folds | `1/tauMelt`, `1/tauHeat`, 1/70, 1/60 |

Temperature model: emission is Planck at 650, 540 and 430 nm, red 1 at 1300 K. Skin thickness `t` sets the surface heat as `560 K + (T - 560 K) e^-t`.

## Sound

| | |
|---|---|
| Graph | `audioKit({ noiseSeconds: 4 })` |
| Engine | Raw Web Audio |
| Voices | Bed: lowpassed noise rumble, a 210 Hz grumble and a 43 Hz sine, breathing on a 0.09 Hz wave, louder with heat, surge and a fed well. Crack: highpass snap, glass slivers (two detuned partials), low falling thump. Tear: crackle in step with the drag. Blorp: a gulp as a well feeds. Ticks: cooling skin clicks, more after each break. Surge: a deep falling thump and a run of cracks across the stereo field |
| Sleep | The bed fades with the flow; the kit suspends when the loop stops |

## Quality and performance

| | |
|---|---|
| Pixel ratio | `detail({ maxDpr: 2, budget: 2.4e6 })` (`:524`) |
| Slow-frame step | `detail()`; it reads only frames at the full rate |
| Idle | Lively (a hand, a surge, input in the last 3 s): every frame. At rest: 24 frames a second. After 60 s with no input the flow stalls over about 10 s; once the last break has cooled (3 cooling times), the loop sleeps |
| Reduced motion | No creep, no seam cycles, no vents, no shimmer. Breaks still open and crust over |
| Measured | 2026-11-15, Apple laptop, Quality High, 1984 x 1440 px: 120 fps (8.3 ms median frame interval) while held |

## State and storage

| Key | Holds |
|---|---|
| `stimming.lavaskin.sound` | Sound on or off |
| `stimming.lavaskin.shimmer` | Heat shimmer on or off |

## Tests and QA

No files in `tests/`. Checked in the browser pane on 2026-11-15: clean console, press, hold and drag with synthetic pointer events, Surge, Shuffle, the Settings sheet, 1280 x 800, 375 x 812 and 812 x 375. Tom has not listened to the sound yet.

## Known issues

- The seam network is one Voronoi field; seams cross plates only at cell borders. Bean `stimming-k3i9`.

## Legacy build

None.

## History

| | |
|---|---|
| Epic | None; feature bean `stimming-k3i9` |
| Plans | None; built from the lab10 batch brief |
| Version | None |
