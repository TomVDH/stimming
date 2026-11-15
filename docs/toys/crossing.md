<!--
Toy doc. Rules: docs/plans/toy-docs.md. Prose: ASD-STE100, double density. No em dashes.
-->

# Crossing button (`crossing/`)

<!-- gen:identity -->
| | |
|---|---|
| Dutch | None yet (Tom sets it) |
| Motto | None |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None |
| Accent | `oklch(0.84 0.16 85)` (the box's traffic yellow) |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |
<!-- /gen:identity -->

## Idea

The push-button box of a Belgian pedestrian crossing, close up, at night, on a wet street. The hand does one thing: it presses the button. The box ticks slowly on red; a press lights the WACHT lamp and fills a ring of sixteen LEDs, and each tick knocks one dot out, faster and faster, until the light goes green and the ticker rattles.
Impatience gets a reaction: every press knocks a dot out early, the box rattles on its clamps, and the LED legend talks back (WACHT, WACHT!, JA JA!, GEDULD). Empty the ring by force and the box gives in: ALLEE!

## Controls

<!-- gen:bar -->
Bar: v2 (`crossing/index.html:111`).

| Slot | Holds |
|---|---|
| Top left (choice) | None |
| Bottom left (actions) | None |
| Bottom right (slider) | None |
| Key strip | click press; hold push hard; space press |
| Settings | Quality; Reset in the footer |
| Dev (`?dev`) | `Wait` (0.4 to 3, 1: scales the countdown), `Glow` (0 to 2, 1: LED bloom) |
<!-- /gen:bar -->

| Gesture | Does |
|---|---|
| Click or tap | Presses the button. On red it sends the request; in the wait it knocks one dot out; on green the legend says GA! |
| Hold | Pushes harder: the cap sinks further, the box leans back, the clamps creak |
| Several fingers | Each finger is a press |
| Keys | Space or Enter presses (held keys hold) |
| Wheel, pinch, tilt | None |

## Renderer and libraries

<!-- gen:stack -->
| | |
|---|---|
| Tier | Canvas 2D |
| Libraries | None (culori through `shared/stim.js`) |
| Importmap | Word for word |
<!-- /gen:stack -->

The picture is one flat object over a soft background, so Canvas 2D draws it: tier 2 in `docs/stack.md`. Heavy work is prerendered once per size; a frame is about ten image draws plus the box's small parts.

## Shared modules

<!-- gen:shared -->
| Module | Imports |
|---|---|
| `shared/stim.js` | `initPage`, `whenVisible`, `reduced`, `audioKit`, `css`, `oklchRgb`, `stage`, `pageReady` |
| `shared/detail.js` | `detail` |
| `shared/intro.js` | `intro` |
<!-- /gen:shared -->

No local copies of shared code.

## Files

<!-- gen:files -->
| File | Lines | Role |
|---|---|---|
| `index.html` | 1550 | The page: CSS, markup, vignette, one module script |
<!-- /gen:files -->

## Render pipeline

Prerendered on each resize (`resize`, `crossing/index.html:743`):

| Layer | Size | Holds |
|---|---|---|
| `bg` | half the frame | Facades, shop windows, the zebra, kerbs, the far signal housing, drawn at a twelfth and scaled up (the blur); then sodium and city bokeh and their wet streaks |
| `spill.red`, `spill.green` | a quarter | Each lens's light: on the facade, a pool on the road (stronger on the paint, via the bar mask), the long broken reflection |
| `lampSpr.red`, `lampSpr.green` | half | The lit lens: halo, glow and the soft pictogram (standing man, walking man) |
| `boxSpr` | full | The box in box units: clamps, side face, yellow face with the sodium key light, hood, drips, beads, lamp window, steel bezel, LED sockets, grille, arrow plate |
| `unlit`, `legend` | full | The 35 x 7 LED matrix: dark dots and glass; the lit word and its glow, cached per word and colour |

Each frame (`draw`, `crossing/index.html:1027`), in order:

| Pass | Blend | Does |
|---|---|---|
| Background | copy | `bg` |
| Signal | lighter | The lit lens sprites and spills, at the eased lamp levels |
| Air | lighter | A thin wash of the signal colour; a green burst when green comes |
| Cars | over, lighter | Dark soft bodies, headlight glare and flare, tail lights, wet streaks, the beam ahead |
| Pole | over, lighter | A cylinder gradient, and a rim of the signal colour |
| Box | over, lighter | `boxSpr` under the wobble and the push; the signal rim; legend; LED ring; button cap; tactile arrow; sound marks |
| Grade | over, overlay | The vignette; moving grain (not at the Low level) |

### Tuning

| Value | Where | Meaning | Default |
|---|---|---|---|
| `gap(n)` | `:770` | Seconds to the next tick with n dots left | `waitK * (0.16 + 0.5 * (n / 16) ** 1.5)`: about 6 s for the ring |
| `LOCATOR`, `RATTLE` | `:768` | The red tick and the green rattle | 1.05 s, 1/11 s |
| `GREEN`, `FLASH`, `CLEAR` | `:769` | Green, flashing green, the red pause before a new wait | 5.2 s, 2.4 s, 1 s |
| `levelOf(n)` | `:779` | The legend word by presses in one wait | 4, 7 and 10 presses |
| Give in | `knock` | The hand empties the ring with 6 presses or more | ALLEE! |
| `DOZE` | `:769` | Seconds on red without a press before the ticks stop | 30 |

## Sound

| | |
|---|---|
| Graph | `audioKit()`: a bus into `kit.out`, and a send to a convolver with a synthesized street response (facade slaps and a damp 0.3 s tail) |
| Engine | Raw Web Audio. Short sounds are synthesized sample by sample into buffers once (`makeBuffers`), then replayed with a pitch jitter |
| Voices | Locator tick (red, 1.05 s); wait ticks (pitch and level rise as the dots run out); rattle (11 a second, strong and weak in turn, drier buffer); press clack and thud (three variants); release click; request beep (two square notes); ring fill (16 rising blips); grumble (sawtooth buzz: one, two, then a long sag); sigh (falling triangle and a breath of noise, when the box gives in); GA! (two bright bips); creak (a slow sawtooth through a resonant band-pass, on a hard hold); cars (band-passed noise swish with a falling Doppler sweep, tyre hiss, a pan across) |
| Timing | A 15 ms scheduler (`pump`) commits ticks up to 60 ms ahead at exact times; audio plays 25 ms after its logical time |
| Sleep | After 30 s on red without a press the box dozes: no ticks, no timers, and `kit.rest` suspends the context |

## Quality and performance

| | |
|---|---|
| Pixel ratio | `detail({ maxDpr: 2, budget: 3.2e6 })`; the backdrop is drawn at half and a quarter of that |
| Slow-frame step | `detail()`: two seconds under 38 fps drop to the Low level (ratio 1 on Standard, no grain) |
| Idle | The frame loop runs only while something moves: the wait, green, cars, springs and tick marks. On red it wakes for each tick for a third of a second. Dozing stops it. A hidden stage stops the clock, the scheduler and the loop |
| Reduced motion | No box wobble, tick jolt, cars, sound marks, ring chase or arrow buzz; a soft green burst; flashing green dims instead of going out |
| Measured | Not measured yet |

## State and storage

| Key | Holds |
|---|---|
| `stimming.crossing.sound` | Sound on or off |
| `stimming.crossing.wait` | Dev: the countdown scale |
| `stimming.crossing.glow` | Dev: the LED bloom |
| `stimming.quality` | The site quality (shared) |

## Tests and QA

No files in `tests/`. Checks for a change: a clean console on load and after each phase; a press on red starts the wait; mashing reaches ALLEE!; green rattles and flashes back to red; the doze stops the loop; 1280 px, 375 x 812 and 812 x 375 keep the box clear of the corners.

## Known issues

None recorded. Open questions for Tom live in bean `stimming-d3p9`.

## Legacy build

None.

## History

| | |
|---|---|
| Epic | Bean `stimming-d3p9` (Lab batch lab10, group D) |
| Plans | None; idea 277 in `docs/toy-ideas.md` |
| Version | None |
