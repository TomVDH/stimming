# Steel wool (`steelwool/`)

<!-- gen:identity -->
| | |
|---|---|
| Dutch | None yet (Tom sets it) |
| Motto | None |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None |
| Accent | `oklch(0.79 0.17 62)` |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |
<!-- /gen:identity -->

## Idea

A pad of fine steel wool hangs in the dark. A tap is a 9-volt battery touching it: the threads under the contact glow, and glowing fronts crawl along the threads, branch where threads touch, race and die. They leave black oxide behind, with a ring of temper colours where threads got hot but did not burn.
A held press blows on the pad: the glow flares, the fronts run faster and catch more often, and sparks lift off and burst.

## Controls

<!-- gen:bar -->
Bar: v2 (`steelwool/index.html:106`).

| Slot | Holds |
|---|---|
| Top left (choice) | `Grade`, segments: Fine (1), Medium (2), Coarse (3); a pick gives a fresh pad of that grade |
| Bottom left (actions) | `Blow` (held; Space), `Reset` (R): a fresh pad |
| Bottom right (slider) | None |
| Key strip | click touch the battery; drag scrape; hold blow |
| Settings | `Sparks` (0 to 1, default 1, kept), Quality |
| Dev (`?dev`) | `Front speed`, `Branching`, `Dying`, `Afterglow`, `Glow`, `Bloom`, `Exposure`; not kept |
<!-- /gen:bar -->

| Gesture | Does |
|---|---|
| Click or tap | The battery touches: every thread within 0.03 pad units ignites, with a contact flash and a burst of sparks |
| Drag | Scrapes the battery along the path: a small contact every 6 px |
| Hold still (280 ms) | Blows at the pointer: a breath of radius 0.42 pad units; moving the pointer moves it |
| Keys | Space holds the Blow chip (a wide breath that follows the fire); R resets; 1, 2, 3 pick the grade; Enter on the stage touches a random spot |
| Mouse over the pad | Turns the key light a little, so the wire glints move |

## Renderer and libraries

<!-- gen:stack -->
| | |
|---|---|
| Tier | Raw WebGL2 |
| Libraries | None from the importmap (the shell loads culori) |
| Importmap | Word for word |
<!-- /gen:stack -->

The picture is many thin strips plus full-screen passes, seen flat, so raw WebGL2 draws it with no library (`docs/stack.md`, decision guide 1).

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

No local copies of shared code.

## Files

<!-- gen:files -->
| File | Lines | Role |
|---|---|---|
| `index.html` | 1300 | The page: CSS, markup, vignette, one module script |
<!-- /gen:files -->

## Render pipeline

The burn runs on the CPU. The GPU draws the threads from point textures.

| Pass | Target | Shader | Does |
|---|---|---|---|
| 1. Burn step | CPU | `makeBurn().step` | Fronts walk their strands; contacts light touching strands after a delay; breath revives glowing points |
| 2. Upload | `tDyn` (RG32F, 256 wide) | `texSubImage2D` | Only the rows that changed, in runs: ignition time and peak heat per point |
| 3. Heat stamps | `tPK` (R8, 680 x 500, pad space) | `STAMP_VS/FS`, MAX blend | Each ignition stamps a cone of radius 0.07 pad units: the peak heat of each spot |
| 4. Threads | `hdr` (RGBA16F) | `FIBRE_VS/FS`, premultiplied over | One strip per strand, back to front; silver wire with glints, temper colour, oxide, the glow |
| 5. Sparks | `hdr`, additive | `SPARK_VS/FS`, instanced | Streaks that cool and fall; forks; the two contact flashes |
| 6. Bloom | Half size | `bloomChain` (`shared/glow.js`) | Threshold 1, 5 levels (3 at Low); the result also lights the wire in the next frame, clamped, at gain 0.12 |
| 7. Composite | Screen | `COMP_FS` | Bloom through a soft knee, `gdGrade` (tint, vignette, grain), `ouFilm` (ACES, sRGB, dither) |

### The pad

`buildPad()` walks 900 (Fine), 520 (Medium) or 300 (Coarse) strands through a flow field inside a lumpy blob, with curls and a crimp kink at each 0.0075-unit step. About 156,000 points for Fine. Strands sort by depth, so the point order is the draw order. A contact grid (cells of 0.0095) finds touching points.

### The burn (per grade)

| Value | Fine | Medium | Coarse | Meaning |
|---|---|---|---|---|
| `v` | 30 | 22 | 14 | Front speed, points a second |
| `die` | 0.012 | 0.016 | 0.022 | Chance a front dies at each point |
| `jump` | 0.006 | 0.0066 | 0.006 | Chance a touching point catches, per check |
| `rc` | 0.0058 | 0.0072 | 0.0095 | Contact radius, pad units |
| `dz` | 0.22 | 0.24 | 0.26 | Largest depth gap for a contact |

Breath (0 to 1 at a point) multiplies speed by 1 + 1.6b, catching by 1 + 2.5b, and dying by 1 - 0.7b. A climbing front runs up to 1.4 times faster. Breath on a still-glowing point can start a dead front again.
A Node prototype (2026-11-15) measured the spread: one Fine tap burns about 5 % of the strand points unblown, about 25 % with 3 s of breath. The dark zone looks larger: unburnt wire within about 0.02 pad units of a burnt point turns oxide grey.

### What the wire shows

| State | Look |
|---|---|
| Unburnt | Silver, lit by a key light (Kajiya-Kay), with glints on the shaved facets; deep strands sit in shade |
| Heated, not burnt | Temper colour by peak heat: straw, bronze, purple, blue, slate; at high heat, oxide grey |
| Burning | Hot iron colour (dull red to pale yellow) with a soft skirt; breath makes it hotter |
| Burnt | Dull oxide grey with a faint sheen; the strand thins and crumbles into gaps |

### Uniforms (the ones a person tunes)

| Uniform | Type | Meaning | Range or default |
|---|---|---|---|
| `uTBurn`, `uTCool` | `float` | Burn time, then the cooling time | 0.22 s; 0.42 s times `Afterglow` |
| `uTPeak` | `float` | Heat of a burning thread; 1 is dull red; the cap is 3.1 | 2.4 |
| `uGlow` | `float` | Glow gain | 6 times `Glow` |
| `uGlowW` | `float` | Width of the glow skirt round hot wire, device px | 1.3 times the pixel ratio |
| `uFireK` | `float` | How much last frame's bloom lights the wire | 0.12 |
| `uBloomK`, `uExpo` | `float` | Bloom and exposure in the composite | 1 times `Bloom`, 1.05 times `Exposure` |

## Sound

| | |
|---|---|
| Graph | `audioKit()` |
| Engine | Raw Web Audio |
| Voices | Bed: a high fizz for burning threads, a low roar under breath, the breath; crackles (band-passed noise, a few ms) at up to 90 a second; a zap on contact (snap, buzz, crackles); a scrape crackle; fork pops; a thump and rustle for a fresh pad |
| Sleep | `kit.rest()` when the loop stops |

## Quality and performance

| | |
|---|---|
| Pixel ratio | `detail({ maxDpr: 2, budget: 2.6e6 })` |
| Slow-frame step | `detail()`: Standard falls to ratio 1, High to Standard; bloom 3 levels at Low; spark cap 500, 1100, 1600 |
| Idle | The loop stops when no front runs, no ignition waits, nothing glows, no spark flies, no breath blows and the light rests |
| Reduced motion | No thread quiver, no flicker, a quarter of the sparks and no forks, the light stays put (checked 2026-11-15 with a faked media query) |
| Start-up | The pad builds, pre-burns 2.5 s on the CPU and draws its first frame in about 100 ms (2026-11-15, Mac, High) |
| Measured | 2026-11-15, Mac in the browser pane, High: a big blown fire (3,165 burning points, 288 fronts, 540 sparks) costs about 1.4 ms of CPU a tick, and about 4.2 ms a frame with the GPU synced, at a 1738 x 1872 canvas. Not measured on a phone |

## State and storage

| Key | Holds |
|---|---|
| `stimming.steelwool.sound` | Sound on or off |
| `stimming.steelwool.sparks` | Sparks |

## Tests and QA

None in `tests/`. Checks for a change: a clean console, a tap and a hold on the pad, the three grades, Reset, sound after a gesture, and the bar at 1280 px, 375 x 812 and 812 x 375.

QA on 2026-11-15 (browser pane, synthetic and real input): all of the above passed; the loop stops when the fire dies (no frames in 3 s). Sound was checked by its nodes and a running context, not by ear.

## Known issues

- The sound has not been listened to; levels and the crackle rate are first guesses.
- Phone frame rate is not measured. A Fine pad draws about 316,000 strip vertices a frame.

## Legacy build

None.

## History

| | |
|---|---|
| Epic | `stimming-4sph` (feature) |
| Plans | None |
| Version | None |
