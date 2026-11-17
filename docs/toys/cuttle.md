<!--
Toy doc. Rules: docs/plans/toy-docs.md. Prose: ASD-STE100, double density. No em dashes.
A section marked (gen) comes from toys.json, series.json or the page source.
-->

# Cuttlefish skin (`cuttle/`)

<!-- gen:identity -->
| | |
|---|---|
| Dutch | None (Tom sets it) |
| Motto | None |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None |
| Accent | `linear-gradient(100deg, oklch(0.84 0.13 85), oklch(0.64 0.17 40), oklch(0.74 0.1 200))` (proposed; `toys.json` holds a temporary teal) |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |
<!-- /gen:identity -->

## Idea

A close view of living cuttlefish skin. Thousands of chromatophores, small elastic sacs of brown, red and yellow pigment, open and shut on springs over a pale, iridescent ground. The pointer is a thing the animal watches: waves of colour run out from it, stillness grows a figure under it, and a fast flick makes the skin flash pale.

## Controls

<!-- gen:bar -->
Bar: v3.

| Slot | Holds |
|---|---|
| Top left (choice) | Display, segments: Cloud (1), Mottle (2), Zebra (3), Flash (4) |
| Bottom left (actions) | Ink (I): a sepia cloud jets from the pointer; the skin flushes dark, then blanches |
| Bottom right (slider) | Zoom, 0.6 to 1.8: the lens on the skin; cells and patterns scale together |
| Key strip | `[MOVE] send waves of colour`, `[CLICK] send a pulse`, `[HOLD] make the skin stare`, `[DRAG FAST] startle the skin` |
| How to play | Eight rows: move, click, hold, drag fast, 1 2 3 4, I, Space, Enter |
| Settings | Startle flash (toggle, persisted); site Quality; Reset in the footer |
| Dev (`?dev`) | Skin: Sheen, Gloss, Twitch. Look: Exposure, Grain (sliders, persisted) |
<!-- /gen:bar -->

| Gesture | Does |
|---|---|
| Move (mouse) or drag (touch) | Rings of colour run out from the pointer, one per short stretch of travel. Cells right under a moving pointer pale. |
| Click or tap | One strong pulse ring. |
| Hold still (hover or press) | A stare grows under the pointer: an eye spot (Cloud, Flash), a framed white square (Mottle), or bars that curl into rings (Zebra). |
| Fast flick | A startle: a pale front races out, then the cells slam back dark. Cooldown 1.6 s. |
| Keys | 1 to 4 pick the display, I inks, Space or Enter on the focused stage pulses from the middle. |

## Renderer and libraries

<!-- gen:stack -->
| | |
|---|---|
| Tier | Raw WebGL2 |
| Libraries | None imported (culori through `shared/stim.js`) |
| Importmap | Word for word |
<!-- /gen:stack -->

The picture is flat per-pixel maths plus many small sprites, so raw WebGL2 draws it with no library (`docs/stack.md`, decision guide 1).

## Shared modules

<!-- gen:shared -->
| Module | Imports |
|---|---|
| `shared/stim.js` | `initPage`, `whenVisible`, `reduced`, `onReducedChange`, `audioKit`, `linFit`, `stage`, `pageReady` |
| `shared/detail.js` | `detail` |
| `shared/intro.js` | `intro` |
| `shared/output.js` | `OUTPUT` |
| `shared/grade.js` | `GRADE` |
<!-- /gen:shared -->

Local copies: the hash, value noise and fbm in `COMMON` (`cuttle/index.html:173`). No shared GLSL noise module exists yet. See `docs/plans/modularize.md`.

## Files

<!-- gen:files -->
| File | Lines | Role |
|---|---|---|
| `index.html` | 1290 | The page |
<!-- /gen:files -->

## Render pipeline

Each frame, in order (`render()`, `cuttle/index.html:917`):

| Pass | Target | Shader | Does |
|---|---|---|---|
| Cell update, x3 | Layer state texture (ping-pong, RGBA16F, one texel per cell) | `UPDATE_FS` (`:388`) | Each cell reads the skin's wish at its place (`skin()` in `PATTERNS`, `:221`), adds its own bias, wander and twitch, and moves on a damped spring. Opening is stiffer than shutting. |
| Ink | Ink grid (ping-pong, half the stage in CSS pixels, at most 640 wide) | `INK_FS` (`:649`) | Only while a cloud lives (14 s). Semi-Lagrangian advection by a lobed puff, a jet and two curl-noise swirls. |
| Pigment, x3 | Pigment buffer (RGBA16F, canvas size, mipmapped) | `CELL_VS` / `CELL_FS` (`:431`, `:477`) | One instanced quad per cell, additive. Each disc adds optical depth: uneven lobes, a thin middle, a darker rim, faint radial fibres. A small disc holds its pigment denser. Off-screen cells collapse in the vertex shader. |
| Mipmaps | Pigment buffer | `generateMipmap` | Only at detail level 1 or 2. Feeds the soft halo and the shadow. |
| Composite | Screen | `COMP_FS` (`:510`) | Leucophore white and dusky flesh, the iridescent film, the pigment as `exp(-depth)` with a soft halo, a faint pigment shadow, a pool of light, wet glints, ink, vignette, grain, film curve. |

Lattices: brown-black pitch 0.04, red 0.029, yellow 0.021 skin units, each turned its own way (`LAYERS`, `:694`). One skin unit is about the stage's short side, scaled by `920 / short` (clamped 0.8 to 1.9) and the Zoom slider.

### Uniforms a person tunes

| Uniform | Type | Meaning | Range or default |
|---|---|---|---|
| `uSheen` | float | Iridescent film strength (Dev: Sheen) | 0 to 2, 1 |
| `uGloss` | float | Wet glint strength (Dev: Gloss) | 0 to 2, 1 |
| `uNerve` | float | Per-cell wander and twitch (Dev: Twitch) | 0 to 2, 1; 0.3 with reduced motion |
| `uExpo` | float | Exposure before the film curve (Dev: Exposure) | 0.9 times 0.5 to 1.8 |
| `uGrain` | float | Film grain (Dev: Grain) | 0 to 2, 1 |
| `uRingK` | vec2 | Ring speed and width, skin units | 0.26 per s, 0.034 |
| `uRmax` | float | Open disc radius in pitches, per layer | 0.72, 0.6, 0.56 |
| `uK` | vec2 | Spring stiffness range, per layer | 22 to 40, 30 to 55, 42 to 80 |

## Sound

| | |
|---|---|
| Graph | `audioKit({ gain: 0.42 })` |
| Engine | Raw Web Audio on `kit.out` |
| Voices | Ring: a deep rising drop and a few wet ticks. Pulse: the same, louder. Startle: a falling sine thump, a low-pass rush, a spray of ticks. Stare lock: a slow 98 Hz swell with a fifth. Display change: a band-pass wash. Ink: a low-pass blast, a thump, bubbles. Crackle: faint ticks, denser while the skin changes. |
| Sleep | `kit.rest` once the loop stops; a hidden page suspends the context. |

## Quality and performance

| | |
|---|---|
| Pixel ratio | `detail({ maxDpr: 2, budget: 2.6e6 })`: High uses the screen's ratio; Standard caps at 2 and 2.6 M pixels |
| Slow-frame step | `detail()`: two seconds under 38 fps drop to level 0 (ratio 1, no mipmaps, no halo, no shadow) |
| Idle | After 90 s with no input (20 s with reduced motion) the skin slows to rest; once every cell settles, the loop stops. Any pointer move, key or control wakes it. `whenVisible` stops the loop off screen. |
| Reduced motion | Patterns run at a fifth of the pace; no rings, no startle; the display switch lands at once; less twitch; sleep after 20 s. |
| Measured | 2026-11-15, browser pane, 1280 x 800 at High (2496 x 1504 pixels): 4.4 ms a frame median, 6.2 ms at the 90th percentile, during a pointer sweep, synced by a one-pixel readback. Phone sizes not measured on a device. |

## State and storage

| Key | Holds |
|---|---|
| `stimming.cuttle.sound` | Sound on or off |
| `stimming.cuttle.startle` | Startle flash on or off |
| `stimming.cuttle.sheen`, `.gloss`, `.nerve`, `.expo`, `.grain` | Dev rows |

## Tests and QA

None in `tests/`. Checked in the browser pane on 2026-11-15 with a timer-driven probe copy: clean console, first frame, pointer rings, stare, startle, the four displays, Ink, Zoom, Settings (startle off stops the flash), sound starts after the toggle, reduced motion, sleep and wake, and the corners at 1280 x 800, 375 x 812 and 812 x 375. A change must keep `tests/bar-v2.html` passing.

## Known issues

- The wet glint can read as a pale smudge on very pale displays (Flash).
- Mottle's blotches are large at the default zoom; a wide stage shows only a few.
- Tom has not listened to the sound yet.

## Legacy build

None.

## History

| | |
|---|---|
| Epic | `stimming-oh7b` (Lab toys); feature bean `stimming-kg9m` |
| Plans | None (lab batch 10 brief) |
| Version | None |
