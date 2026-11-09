# Flame test (`flametest`) implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. One fresh session builds this toy, task by task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Flick a pinch of metal salt into a burner flame. The flame flares into that salt's colour, and a prism beside it fans the light into the salt's own emission lines.

**Architecture:** Raw WebGL2. One scene pass draws the flame, the beam, the prism, the fan of line shafts and the plate into an RGBA16F target. A mip-chain bloom and a grade pass finish it. The CPU holds the salt amounts, builds the live line list each frame, and moves the grains.

**Tech stack:** raw WebGL2 on the `shared/stim.js` helpers; Tone.js through `kit.tone()`. Bar v2.

**Spec:** science-fair batch (Tom, 2026-11-09), with Lichtenberg burn, Rubens tube, Smoke ring cannon and Bismuth crystals. Batch rules in [README.md](README.md).

| | |
|---|---|
| Size, estimate | M · $20 to $30 |
| Kits | none. The CIE fit comes from `prism/index.html` (`light: 24 wavelengths`), copied |
| Before the build | nothing |

## The shot

A dark room. No burner, no bench, no glassware: the flame stands on a small blue cone that rises from nothing.
To its right, a thin shaft of the flame's light crosses to a glass wedge. The wedge is only an outline with lit edges, and it points down.
Out of the wedge, a fan of thin coloured sheets of light rises onto a dark plate. Each sheet lands as one sharp line.
The plate shows only lines: no rainbow, no labels. Faint ticks every 50 nm are the only marks.
The first frame is a picture: a pinch of Lithium burns, so the flame is crimson and three lines stand on the plate.

## Hero moments

1. **The flare.** A flick puffs the flame up and out in the salt's colour within one frame. The colour then fades back to the gas flame's blue over seconds.
2. **Lines bloom.** The lines on the plate swell and glow as the salt catches, then thin and fade as it burns off. Each line's shaft dims with it.
3. **Mixes.** Flick Copper into a Strontium flame: the flame turns through a muddy mix while both line sets stand on the plate together.
4. **The doublet.** The loupe on the plate magnifies 16 times. The sodium line splits into two, 0.6 nm apart.
5. **The chord.** Each line plays as a tone, its light frequency shifted down 40 octaves. The sodium doublet beats slowly, about once every two seconds.

## Loop

- Click or tap: flick a pinch of the picked salt. Grains arc from the pointer into the flame and flash as they burn.
- Hold: feed the flame, as a wire loop held in it does. The colour holds while you hold.
- Drag: blow across the flame. It leans and gutters with the drag.
- The picked salt changes with the stepper or the number keys 1 to 7.
- Left alone, the salt burns off. The flame returns to its own faint blue and keeps a slow flicker.

## Bar (v2)

| Slot | Content |
|---|---|
| Choice | Salt, a `stepper` (seven options): Lithium, Sodium, Potassium, Copper, Strontium, Calcium, Barium. Each option has a colour dot and a number key. |
| Slider | Air: the burner's air valve, closed to open |
| Actions | Flick (`Space`), Shuffle (a random two-salt mix) |
| Settings | Cobalt glass: Off, On · Spectrometer: Prism, Grating · Trace sodium: Off, On · Quality (shared) · Reset in the footer |
| Keys | `[CLICK] flick` · `[HOLD] feed` · `[DRAG] blow` · `[1-7] salt` |

**Air.** Closed gives the lazy yellow safety flame: glowing soot, tall and soft. Its soot shines as a continuous rainbow on the plate, which drowns the lines. Open gives the roaring blue cone, and the lines stand out on black. The default is three quarters open.

**At 375 px.** The stepper moves to the bottom left, the two actions to the bottom right, and Air into Settings (Bar v2 rule).

## Salts

Flame colours are OKLCH. Lines are in nm; the weight is relative brightness in the flame. A band is a soft line with a width.

| Salt | Flame | Lines (nm, weight) | Bands (nm, width, weight) |
|---|---|---|---|
| Lithium | crimson, 0.58 0.22 15 | 670.8 (1.0), 610.4 (0.25), 460.3 (0.08) | |
| Sodium | orange-yellow, 0.82 0.17 80 | 589.0 (1.0), 589.6 (0.5) | |
| Potassium | lilac, 0.68 0.12 310 | 766.5 (0.8), 769.9 (0.5), 404.4 (0.35), 404.7 (0.2) | |
| Copper | green-blue, 0.74 0.15 170 | 510.5 (0.5), 515.3 (0.6), 521.8 (0.7) | CuCl: 428 (6, 0.35), 435 (6, 0.4), 443 (6, 0.35), 452 (6, 0.3), 488 (5, 0.3), 498 (5, 0.35); CuOH: 535 (14, 0.4) |
| Strontium | red, 0.6 0.21 28 | 460.7 (0.3) | SrOH: 606 (8, 0.6), 646 (6, 0.7), 659 (5, 0.8), 668 (6, 0.9), 682 (6, 0.6); SrCl: 636 (5, 0.4), 674 (4, 0.5) |
| Calcium | brick orange, 0.66 0.17 45 | 422.7 (0.5) | CaOH: 554 (8, 0.6), 602 (6, 0.5), 622 (7, 1.0), 646 (6, 0.35) |
| Barium | pale green, 0.86 0.13 125 | 553.5 (1.0), 455.4 (0.2), 493.4 (0.2) | BaOH: 487 (5, 0.3), 513 (6, 0.5), 524 (6, 0.55), 534 (6, 0.45) |
| Gas flame (always) | faint blue, 0.5 0.12 260 | CH: 431.4 (0.5) | C2 Swan: 473.7 (3, 0.2), 516.5 (3, 0.35), 563.5 (3, 0.15) |

Weights are drawn from published flame spectra and then tuned by eye. The table is the data; the code holds it as one `SALTS` object.

## Physical details

- **Sodium is everywhere.** With Trace sodium on (the default), every salt carries a little sodium. A faint 589 nm line shows under every salt, and the flame's base takes a yellow tinge.
- **Sodium lingers.** Sodium burns off over about 6 s; the other salts over about 2.5 s. A flick of sodium outlasts everything.
- **Cobalt glass.** The old way to see potassium through sodium: cobalt blue glass absorbs the yellow. With it on, the flame view and the plate both lose 560 to 620 nm, so potassium's lilac shows through a sodium flare.
- **Potassium is dim to the eye.** Its strong lines sit at the edges of sight, 404 and 767 nm. Its flame is faint, and its red pair sits at the plate's far end.
- **Prism or grating.** A prism spreads blue wide and squeezes red, following Cauchy's law. A grating spaces wavelengths evenly. Switching slides every line to its new place over 0.6 s.
- **Soot.** A closed air valve makes a yellow flame that shines as a blackbody near 1,500 K: a continuous glow on the plate, brightest in the red.
- **The inner cone.** The gas flame has a bright blue inner cone (CH and C2 light). Salts colour the outer mantle, not the cone.

## Tech

**Layout.** World units fit the stage's short side. Landscape: the flame sits at 0.24 W, its base at 0.2 H. The wedge sits at 0.43 W, beam height, and points down, so the fan rises. The plate spans 0.5 W to 0.94 W, from 0.6 H to 0.72 H. This keeps the plate clear of the bottom bar. Portrait recomposes (see Review focus).

**Wavelength to plate.** The prism uses the mean of `(1/λ² − 1/780²) / (1/390² − 1/780²)` (Cauchy) and `(780 − λ) / 390` (even); pure Cauchy crowds every salt into the plate's right third. The grating uses the even term alone. Violet lands at the plate's left, red at its right.

**Line colour.** The CIE 1931 multi-lobe fit from `prism/index.html` (Wyman, Sloan and Shirley), in GLSL, gives linear sRGB per wavelength. A floor lifts the dim edges so 404 and 767 nm still read as violet and deep red.

**Scene pass (one fragment shader).**

| Element | Method |
|---|---|
| Flame | A teardrop field warped by two octaves of moving simplex noise. Inner cone: a narrow blue core. Mantle: the salt tint, mixed in linear light. A puff scales the height and the brightness. |
| Beam | A soft shaft from the flame's waist to the wedge, in the flame's colour. Haze noise moves in it. |
| Wedge | An equilateral triangle by SDF: a thin bright edge, a faint inner glow, a glint where the beam enters. |
| Fan | For each live line, a thin sheet from the wedge's exit point to the line's place on the plate. Brightness is the line's weight times the salt amount; a wide band gives a wider, softer sheet. |
| Plate | A dark strip. Each line is a sharp Gaussian in x (half-width 1.2 px for a line; the band's width in nm for a band). Ticks every 50 nm. |
| Glow | A soft floor bounce under the flame, in its colour. |

Live lines go in as a uniform array, `vec4 uLine[48]`: wavelength, weight, width in nm, and a spare.
The CPU rebuilds it each frame from the salt amounts and drops lines under 0.002.

**Post.** Threshold, five-level mip-chain bloom, then a grade: ACES-style tone curve, vignette, film grain.

**Grains.** CPU particles, at most 240. Each flies on a ballistic arc from the pointer into the flame, then flashes for 80 ms in the salt colour and adds its share to the salt amount. They draw as additive point sprites into the scene target.

**Salt amounts.** `amount[s] += pinch` on arrival, then `amount[s] *= exp(-dt / τ[s])`. The flame tint is the amount-weighted mean of the salt colours, in linear light. The puff is `1 − exp(−age / 0.05)` up, then a 0.6 s decay.

## Sound

- **Gas roar:** pink noise through a band-pass. Its centre and level rise with Air; a puff opens it for a moment.
- **Flick:** a short dry tick, then a soft whoomp as the grains catch.
- **Crackle:** tiny noise bursts per grain that burns, with jittered pitch and level.
- **The chord:** each live line is a sine at `c / λ / 2⁴⁰` (404 nm gives about 674 Hz; 767 nm about 356 Hz). Its level follows the line's weight times the salt amount. The sodium doublet beats near 0.5 Hz.

## Finesse

- The first frame already burns: Lithium is lit, and its lines stand on the plate.
- The flare answers within one frame of the tap. Grains arrive later, and each one adds a spark.
- Lines are sharp, never blurred into a rainbow, except under soot.
- A shaft and its line brighten and fade together.
- The flame never goes fully white. Strong mixes saturate in hue, not to white.
- The flame leans and gutters under a drag, then straightens over a second.

## Reduced motion and idle

- **Reduced motion:** the flame flickers at 25 % speed. Grains still fly, but slower and fewer. A puff swells the flame less.
- **Idle:** this toy drifts. The flame flickers at 30 fps; 60 s after the last input it eases still over 2 s and the loop stops.
- **Hidden:** the loop and the sim clock stop at once.

## Review focus

1. **375 px portrait.** The flame stands lower left, at 0.28 W and from 0.22 H to 0.52 H. The wedge sits at 0.66 W, beam height. The fan rises to a plate across the top, from 0.06 W to 0.94 W, 0.66 H to 0.73 H. The bar's bottom row sits below the flame.
2. **The doublet.** At plate scale the two sodium lines sit 1 to 2 px apart. Only the loupe splits them, never a widened plate.
3. **Bloom on bright lines.** Sodium is the brightest line. The threshold keeps it from washing the plate white.
4. **Mixes stay readable.** Three salts at once give up to 30 lines; each line keeps its own colour.
5. **No float targets.** Without `EXT_color_buffer_float`, show `.fail`.

## Tasks

### Task 1: Blockout

**Files:** Create `flametest/index.html` and the bean. Add the `toys.json` entry and the Lab menu `<li>` with its `toys.flametest` hook.

**Produces:** `SALTS`, `lines()`, `SCENE_FS`, the bloom chain and `layout()`.

- [ ] Flame, beam, wedge, fan, plate, bloom and grade. The stepper picks a salt; a tap puffs it in at once (no grains yet).
- [ ] Q1, Q2, stills at 1280 and 375 px. Checkpoint with Tom.
- [ ] Commit: `Flame test: blockout of flame, prism and plate`.

### Task 2: Flick, feed and blow

- [ ] Pointer state machine, grains, burn-off, feed on hold, blow on drag. Air slider and soot.
- [ ] Shuffle and Flick actions. Q4.
- [ ] Commit: `Flame test: grains, feed, blow and the air valve`.

### Task 3: The loupe

- [ ] A round loupe over the plate (hover on mouse, press on touch). It magnifies 16 times and splits the sodium doublet.
- [ ] Commit: `Flame test: the loupe on the plate`.

### Task 4: Sound

- [ ] Gas roar, flick, crackle and the spectrum chord. Q9.
- [ ] Commit: `Flame test: roar, crackle and the chord of light`.

### Task 5: Settings and QA

- [ ] Cobalt glass, Spectrometer, Trace sodium, persistence, Reset. Watchdog ladder. Idle and hidden.
- [ ] Q1 to Q10 in the browser pane. Tick the bean and record the cost. Commit.

## Kit handoff

None. The CIE fit and the line plate suit any later spectrum toy.
