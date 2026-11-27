# Wind tunnel (`windtunnel/`)

<!-- gen:identity -->
| | |
|---|---|
| Dutch | None yet (Tom sets it) |
| Motto | Air has notes on your design. |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None |
| Accent | `linear-gradient(100deg, oklch(0.96 0.02 85), oklch(0.8 0.1 220))` |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |
<!-- /gen:identity -->

## Idea

A smoke wind tunnel seen from the side. Thin smoke lines stream through a black test section and part round one model.
Behind it they roll up into a street of whirls that peel off in turn. The hand drags and turns the model; the wake answers at once.
Wind moves the tunnel from smooth flow, through a clean vortex street, to a torn wake. Wide stages run the flow left to right; tall stages run it upward.

## Controls

<!-- gen:bar -->
Bar: v2 (`windtunnel/index.html:100`).

| Slot | Holds |
|---|---|
| Top left (choice) | `Shape`, segments: Cylinder (1), Wing (2), Plate (3), Duck (4), Teapot (5), default Cylinder; a stepper on phones |
| Bottom left (actions) | `Puff` (Space): a band of extra smoke leaves the rake |
| Bottom right (slider) | `Wind`, 0 to 1, default 0.5: the speed and the Reynolds number together |
| Key strip | drag move; drag around turn; click place; ← → turn |
| Settings | `Smoke lines`: Few 16, Some 26, Many 42 (persists); Quality; Reset in the footer |
| Dev (`?dev`) | `Exposure`, `Glow`, `Grain`, `Line width`, `Torn smoke` (all persist) |
<!-- /gen:bar -->

| Gesture | Does |
|---|---|
| Click or tap | On empty air: the model glides there. On the model: nothing |
| Drag | On the model: moves it. Off the model: turns it by the angle the hand sweeps round its pivot. The model follows with weight, at most 1.2 tunnel heights a second |
| Keys | With the stage focused: ↑ ↓ move the model across the screen, ← → turn it 5°. 1 to 5 pick the shape. Space puffs |
| Wheel, pinch, tilt | None |

Each shape takes its own start angle: the wing 5° nose up, the plate square to the flow. The wing stalls past about 15°.
A faint turntable ring round the model lights while the hand is on it; its index tick shows the angle.

## Renderer and libraries

<!-- gen:stack -->
| | |
|---|---|
| Tier | Raw WebGL2 (GLSL), ping-pong float textures |
| Libraries | None from the importmap; `shared/stim.js` loads culori itself |
| Importmap | Word for word |
<!-- /gen:stack -->

A 2D fluid on textures and one full-screen picture pass is per-pixel work, so raw WebGL2 draws it with no library (`docs/stack.md`, rule 1).

## Shared modules

<!-- gen:shared -->
| Module | Imports |
|---|---|
| `shared/stim.js` | `initPage`, `whenVisible`, `reduced`, `onReducedChange`, `audioKit`, `sound`, `linFit`, `stage`, `pageReady` |
| `shared/detail.js` | `detail` |
| `shared/output.js` | `OUTPUT` |
| `shared/intro.js` | `intro` |
<!-- /gen:shared -->

Drift: the shader, program and target helpers copy the `stone/` pattern. The glow is a local two-pass blur of the dye field, not `bloomChain` from `shared/glow.js`, because it starts from a low-resolution field and not from an HDR frame (`docs/plans/modularize.md`).

## Files

<!-- gen:files -->
| File | Lines | Role |
|---|---|---|
| `index.html` | 1451 | The page: CSS, markup, vignette, one module script |
<!-- /gen:files -->

## Flow model

- Tunnel units: the tunnel is 1 high and as long as the stage aspect. Velocity sits on an RG16F grid in cells per sim step of 1/60 s. Pressure and divergence sit on R32F.
- One step (`substep`, `:895`): the model's cells, MacCormack advection of velocity, implicit viscosity, confinement near the top of the range, a warm-started Jacobi pressure solve, the projection, then MacCormack advection of the smoke.
- Boundaries: even inflow on the left with a tiny wobble that breaks the symmetry, free-slip walls, zero-gradient outflow, no-slip on the model. A moving model gives its cells its own velocity, so the fluid gets out of its way.
- Wind (`:792`): the speed runs from 0.15 to 0.65 tunnel heights a second. The Reynolds number follows a table: 18 at 0, 45 at 0.25, 190 at 0.5, 480 at 0.75, 900 at 0.9, 1500 at 1, measured on the cylinder. Numerical viscosity adds to these, so the nominal values sit high. Confinement starts at 0.85.
- Substeps keep each trace near one cell: the wind sets them, and so does a fast model (`simulate`, `:994`).
- Smoke (`SADV2_FS`, `:411`) carries four channels. Dye: the smoke itself. Label: the inlet height a parcel left from, stored as an offset from its own height so half floats keep it exact. Torn: set where the label field folds or packs past 4 to 10 times its inlet density, and kept. Age: seconds since the rake.
- The picture draws crisp lines from the label at full screen resolution, so upstream lines stay sharp at any size. Torn smoke draws from the dye, softened by its own blur, with filaments from the scrambled label. This is the smear.
- Models are drawn once with Canvas 2D and baked to 512 x 512 distance maps (Felzenszwalb transform, `bake`, `:740`). Channel r is the picture; channel g is the sim. The teapot's sim map fills the handle hole, because 2D air cannot pass through a closed loop.

## Render pipeline

| Pass | Target | Shader or material | Does |
|---|---|---|---|
| Model | RGBA16F, velocity grid | `OBS_FS` (`:280`) | Solid fraction, a third of a cell proud, and the model's velocity in its cells |
| Velocity advection | RG16F, velocity grid | `VADV1_FS`, `VADV2_FS` (`:294`, `:304`) | Back trace, reverse trace, half the error back; the plain trace wins out of range. Applies the boundaries |
| Viscosity | RG16F | `VISC_FS` (`:327`), 2 to 8 passes | Jacobi steps of the implicit diffusion solve |
| Confinement | R16F, RG16F | `CURL_FS`, `CONF_FS` (`:337`, `:349`) | Only from wind 0.85, only behind the model |
| Projection | R32F, RG16F | `DIV_FS`, `PRES_FS`, `PROJ_FS` (`:363` to `:386`) | Divergence, 22 to 40 Jacobi passes (0.6 times that when calm), the pressure gradient |
| Smoke advection | RGBA16F, 2 or 2.5 times the grid | `SADV1_FS`, `SADV2_FS` (`:398`, `:411`) | MacCormack on dye, label, torn and age; the rake injects fresh lines and puffs |
| Probe | RGBA32F, 4 x 1 | `PROBE_FS` (`:480`) | Velocity at four points behind the model, read back a frame later through a buffer and a fence |
| Glow | R16F, half the smoke size | `GLOWP_FS`, `BLUR_FS` (`:492`, `:500`) | Dense torn smoke under the light sheet, blurred twice |
| Picture | Screen | `SHOW_FS` (`:510`) | Bicubic smoke read, crisp lines or torn smoke, the light sheet, the turntable ring, the model with its rim, vignette, `ouFilm`, grain |

### Uniforms

| Uniform | Type | Meaning | Range or default |
|---|---|---|---|
| `uExp` | float | Smoke exposure before the film curve | 1.9 times the Dev row (0.4 to 2.5, 1) |
| `uGlowK` | float | Glow gain | 0.55 times the Dev row (0 to 3, 1) |
| `uGrain` | float | Grain after sRGB | 0.03 times the Dev row (0 to 3, 1) |
| `uW` | float | Line width in line units: about 1 CSS px, thinner on short stages | Dev row `Line width` (0.5 to 2.5, 1) |
| `uDyeK` | float | Torn smoke gain | 1.4 times the Dev row `Torn smoke` (0.2 to 3, 1) |
| `uTorn0`, `uTorn1` | float | Label packing where smoke starts and ends tearing | 4, 10 |

## Sound

| | |
|---|---|
| Graph | `audioKit()` |
| Engine | Raw Web Audio |
| Voices | Rush: 4 s of stereo pink noise through a low-pass that opens with the wind. Hiss: the same noise above 2.8 kHz at high wind. Fan: two sawtooths, 32 to 76 Hz, under a low-pass. Flutter: a low noise band with a 7 to 16 Hz tremolo; it swells with the cross-wind at the wake probe, so it pulses as whirls shed and stays silent in smooth flow; its pan swings with the whirls. Whoosh: band noise with the model's speed. Puff: a falling noise burst. Clunk: a falling sine and a click on a shape change |
| Sleep | The context suspends when the stage is hidden or the sound is muted; muted by default |

## Quality and performance

| | |
|---|---|
| Pixel ratio | `detail({ maxDpr: 2, budget: 2.6e6 })`: High uses the screen's ratio; Standard caps at 2 and 2.6 Mpx |
| Grid by level | Low: 112 rows, smoke 2x, 22 pressure passes. Standard: 160, 2x, 30. High: 200, 2.5x, 40. Rows never pass half the stage's cross size in CSS px. A new grid resamples the old fields, so a resize keeps the flow |
| Slow-frame step | `detail()`: two seconds under 38 fps step down once |
| Idle | The flow never stops, so the loop runs while the stage shows. Calm (2.5 s without input): the picture drops to 30 fps and the pressure solve to 0.6 of its passes. Steady (calm, and the wake probes still for 1.5 s): the sim stops; the picture runs at 30 fps and puffs still drift along the frozen lines. Any input thaws it. `whenVisible` stops everything off screen |
| Reduced motion | No ambient flicker on the lines, still grain, no canvas fade. The flow runs |
| Measured | 2026-11-15, Apple laptop, GPU timer queries. High, 1682 x 1872 px: sim 1.2 ms a step, picture and glow 1.4 ms. Standard, 1528 x 1701 px: sim 1.5 ms, picture 1.2 ms |

## State and storage

| Key | Holds |
|---|---|
| `stimming.windtunnel.sound` | Sound on or off |
| `stimming.windtunnel.lines` | Smoke line count |
| `stimming.windtunnel.exposure`, `.glow`, `.grain`, `.width`, `.smear` | Dev rows |

## Tests and QA

No files in `tests/`. Checked on 2026-11-15 in a background tab of the browser pane, where requestAnimationFrame runs at about 2 fps; a throwaway probe page stepped the sim on demand and sent canvas stills to a local sink.
Checked: a clean console; drag, turn and place with synthetic pointer events; the shape choice; Puff; the Smoke lines row; Reset; the Wind slider; sound start and mute (one AudioContext, running, then suspended); the layouts at 1280 x 800, 375 x 812 and 812 x 375; the steady freeze and its thaw, driven by hand; GPU time.
Not checked: the feel at full frame rate in a front tab, touch on a real phone, and reduced motion (read in the code only).

## Known issues

- A small grid-scale ripple can show in the shear layers off the plate's tips; it shows in full-size stills only (`stimming-bh9o`).
- A shape swap leaves the old shape's footprint dark for 1 to 3 s, until the wind flushes it (`stimming-bh9o`).

## Legacy build

None.

## History

| | |
|---|---|
| Epic | Lab batch; bean `stimming-bh9o` |
| Plans | None |
| Version | None |
