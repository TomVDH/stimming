# Rupert's drop (`rupert/`)

<!-- gen:identity -->
| | |
|---|---|
| Dutch | None yet (Tom sets it) |
| Motto | Strong opinions about which end you touch. |
| Shelf | Main, number 60 |
| Stage | Beta |
| Series | None |
| Accent | `linear-gradient(90deg, oklch(0.86 0.15 95), oklch(0.62 0.24 330), oklch(0.6 0.17 255), oklch(0.8 0.17 160))` (proposed, not yet in `toys.json`) |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |
<!-- /gen:identity -->

## Idea

A Prince Rupert's drop, a glass tadpole, lies on black acrylic in a graphite studio. Click the head: a big steel hammer swings down, bounces twice and lifts away. The glass rings and nothing happens; that is the joke.
Click the thin tail: pliers nip it and time drops to slow motion. One crack races up the core of the tail, then forks into a tree that fills the body and runs on to the front of the head. Frost follows the cracks, so the drop turns white in ragged fingers. The white drop holds for a beat, then bursts along its frost cells into a cloud of powder that settles on the table. Reset drips a glowing gob that quenches in steam and cools into a new drop.

The look follows real drops and real high-speed footage (Tom, 2026-11-16: the first build looked "cheap and not well done"). Tom picked the dark studio over a backlit lightbox in `rupert/stagelab.html`, which keeps both stages on a switch (`noindex`).

## Controls

<!-- gen:bar -->
Bar: v3 (`rupert/index.html:101`).

| Slot | Holds |
|---|---|
| Choice | `Light`, segments: Clear (1), Polarised (2), default Clear |
| Slider | `Time`, 0 to 1: scrubs the slow motion. Disabled until a snip. On phones it moves into Settings |
| Key strip (`?bar=v2`) | click head hammer the head; click tail snip the tail; h hammer the head; s snip the tail |
| How to play | 9 rows: each click, H, S, 1 2, R |
| Settings | `Replay speed` (0.4 to 2, 1), Quality, Reset (R): a new drop drips and quenches |
| Dev (`?dev`) | `Exposure` (0.4 to 2.5, 1.15), `Bloom` (0 to 1, 0.3), `Stress` (600 to 5000 nm, 2600), `Dispersion` (0 to 0.06, 0.014) |
<!-- /gen:bar -->

| Gesture | Does |
|---|---|
| Click or tap the head | The hammer swings down in 0.32 s, bounces twice and lifts away. Each contact rings the glass, flashes, jolts the drop and rings the water. Under Polarised light a ring of stress runs through the fringes. |
| Click or tap the tail | The pliers bite at that point and the burst starts. Near misses within 22 px count. |
| Click or tap mid-burst | Pauses or plays the slow motion. |
| Click or tap after the dust settles | Drips a new drop, as Reset does. |
| Click or tap the floor | A small ring on the water and a plip. |
| Drag the Time slider | Scrubs the burst forward and back; release plays on from there. |
| Mouse move | The cursor shows the tool: a hammer over the head, pliers over the tail. |
| Keys | H hammers, S snips at mid-tail, R resets, 1 and 2 pick the light. |

## Renderer and libraries

<!-- gen:stack -->
| | |
|---|---|
| Tier | Raw WebGL2 |
| Libraries | None imported |
| Importmap | Word for word |
<!-- /gen:stack -->

The picture is one full-screen ray march through one fixed camera, and the shards are one instanced draw, so no scene graph is needed (`docs/stack.md`, decision guide 1).

## Shared modules

<!-- gen:shared -->
| Module | Imports |
|---|---|
| `shared/stim.js` | `initPage`, `whenVisible`, `reduced`, `onReducedChange`, `audioKit`, `linFit`, `stage`, `pageReady` |
| `shared/intro.js` | `intro` |
| `shared/detail.js` | `detail` |
| `shared/glow.js` | `bloomChain`, `glowDetail` |
| `shared/grade.js` | `GRADE` |
| `shared/output.js` | `OUTPUT` |
<!-- /gen:shared -->

Drift: none known. The page keeps its own `spectral()` (also in Worry stone) and its own `fringe()` (photoelastic colour); either could move to a shared module.

## Files

<!-- gen:files -->
| File | Lines | Role |
|---|---|---|
| `index.html` | 2277 | The page: CSS, markup, vignette, one module script |
| `stagelab.html` | 2321 | Lab (`noindex`): the same toy with a switch between stage B (the toy's) and the backlit stage A |
<!-- /gen:files -->

## Render pipeline

| Pass | Target | Shader | Does |
|---|---|---|---|
| 1. Scene | `hdr.col` (RGBA16F) and `hdr.dep` (RG16F) | `SCENE_FS` (`:218`) | Ray march of the drop (body A from the head, tip piece B after a cut), the hammer and the pliers; glass with refraction, one inner reflection, six-wavelength dispersion and seven trapped bubbles; the crack tree, frost cells, heat glow, photoelastic fringes; the acrylic floor with rings, a mirror that fades with height, the lens shadow and its caustic; steam; flashes. Writes hit distance and a glass flag for pass 2. |
| 2. Shards | `hdr.col`, additive | `PART_VS` / `PART_FS` (`:1011`) | Up to 14,000 instanced chips, drawn twice: the mirror in the floor, then the chips. Paths are closed form in show time; the depth target hides chips behind steel and dims them behind glass. |
| 3. Bloom | Half-size chain | `bloomChain` from `shared/glow.js` | Threshold 1.0; 5 levels, 3 on Low. |
| 4. Composite | Screen | `COMP_FS` (`:1123`) | Bloom, the slow-motion tint and vignette, `gdGrade`, `ouFilm`. |

The drop is a chain of 23 round cones on 24 points (`REST`, `:1208`), with no blends: a blend at a joint shows as a rib. It is a long teardrop, three times longer than wide, lying on its belly; it tapers on a curve into a thread that rises and curls back. No section sinks into the floor. After a snip the chain splits at the cut. A crumbling tail is cut back on the CPU as the release front passes.

The crack tree (`growCracks`, `:1395`) grows on the CPU at the snip and goes to the shader as a float texture, two texels per segment, sorted by birth arc. All live cracks move in step through one cross-section; their count follows its area, from one in the tail to 24 in the head. A fork aims into the widest empty angle; cracks push apart, and one stops when two meet. The front runs up the tail 2.2 times faster than through the body (`TAIL_K`), and the white drop holds for 0.8 s (`WHITE`) before the head bursts. In the shader a crack is a narrow face along its line: dark in clear glass, flashing only where it mirrors a light. Frost spreads out from the cracks a little behind them; shattered glass is two scales of 3D cells. At the burst each large frost cell becomes one chip where the eye saw it (`makeDust`, `:1487`, with the shader's `hash33` in float32 steps); fine dust fills the rest.

### Uniforms (the ones a person tunes)

| Uniform | Type | Meaning | Range or default |
|---|---|---|---|
| `uStress` | `float` | Retardation scale of the stress fringes, nm per head radius | Dev `Stress`, 2600 |
| `uDisp` | `float` | Spread of the glass index from violet to red | Dev `Dispersion`, 0.014 |
| `uPolar` | `float` | Clear (0) to Polarised (1); fades over 0.45 s | Light choice |
| `uFront` | `float` | Crack front, in arc s (0 at the tip, 1 at the back of the head) | From the burst clock |
| `uCrk`, `uNCrk` | `sampler2D`, `int` | The crack tree and its segment count | Grown at the snip, up to 768 |
| `uHeat` | `float` | Heat of a new drop; the thin tail cools first | 1 at the drip, 0 when cool |
| `uExposure`, `uBloomK` | `float` | Film exposure and bloom strength | Dev rows, 1.15 and 0.3 |

## Sound

| | |
|---|---|
| Graph | `audioKit()` |
| Engine | Raw Web Audio: sine partials and filtered noise from the kit's noise buffer |
| Voices | Hammer: a click, four beating glass partials near 2.9 kHz, a steel ping, a table thud. Snip: two clicks and a thin ring. Time drop: a sine falling from 230 to 32 Hz under a dark swell. Crack front: low crackle grains while the front runs, and while a scrub crosses it. Burst: a long low boom and 40 slowed tinkles. Ramp: tinkles that climb back to their real pitch. Dust: a sprinkle of ticks. Tip: one tink when it lands. Floor tap: a plip. Drip: a whoosh; quench: a plop, a long hiss, cooling ticks and a last ting. |
| Sleep | `kit.rest` after the loop stops |

## Quality and performance

| | |
|---|---|
| Pixel ratio | `detail({ maxDpr: 2, budget: 2.2e6 })`, `D.dpr(w, h)` |
| Slow-frame step | `detail()`: two slow seconds drop one level. Steps per level: march 56/80/100, inner 18/28/36, mirror 28/44/56; shards 5000/9000/14000 at snip time; bloom 3 or 5 levels |
| Idle | The loop runs only while the hammer, the snip, the replay, the drip, the light fade, a ring or a flash moves; `whenVisible` stops it off screen |
| Reduced motion | The hammer shows at the contact without a swing or jolt; a snip jumps to the settled end (the slider still scrubs); a new drop appears in place and cools; no water rings; the light switches at once; no slow-motion grade |
| Measured | 2026-11-15, Mac, High quality, 1280 x 800 (canvas 2496 x 1504): frame interval median 8.3 ms, p90 9.3 ms over a full snip and replay; 8 to 17 ms as the burst starts. Building 14,000 shards takes 14 ms. Not measured on a phone. 2026-11-16, after the rebuild: headless runs read 38 to 60 fps through the crack and the burst on a busy shared GPU; a clean measure is still to do. Building the chips from the frost cells takes 26 ms once, at the snip. |

## State and storage

| Key | Holds |
|---|---|
| `stimming.rupert.sound` | Sound on or off |
| `stimming.rupert.speed` | Replay speed |
| `stimming.rupert.exposure` | Dev: exposure |
| `stimming.rupert.bloom` | Dev: bloom |
| `stimming.rupert.stress` | Dev: fringe scale |
| `stimming.rupert.disp` | Dev: dispersion |

## Tests and QA

No files in `tests/`. On 2026-11-15, in the built-in browser pane: a clean console on load and through hammer, snip, replay, scrub and reset; the burst arc frame by frame; sound output from every voice measured on `kit.out`; layouts at 1280 x 800, 375 x 812 and 812 x 375. A change must keep the console clean and hold `tests/bar-v2.html` rules at the three sizes.

## Known issues

- On phones the Time slider sits in Settings (the Bar v2 rule with a choice and an action), so the scrub is one tap further away. (`stimming-2gnm`)
- During the slow motion the pliers cover the snipped tip; it shows when they let go. (`stimming-2gnm`)
- A small stepped highlight sits on the drop's underside where it meets the floor; the lumps, bubbles, skin ripple and floor caustic are ruled out. (`stimming-zdo0`)
- Frame rate after the rebuild is not cleanly measured. (`stimming-zdo0`)

## Legacy build

None.

## History

| | |
|---|---|
| Epic | `stimming-2gnm` (feature) |
| Rebuild | `stimming-bfva` (stage probe), `stimming-zdo0` (model, crack, shards), 2026-11-16 |
| Plans | None |
| Version | None |
