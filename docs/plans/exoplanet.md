# Exoplanet (`exoplanet`) implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. One fresh session builds this toy, task by task. Steps use checkbox (`- [ ]`) syntax.

## Context

Tom asked for "another cosmic one": an exoplanet detector built on spectrograms, mysterious, a little scary, and very realistic. Galaxy is the only cosmic toy on the shelf; Star trails, Orbits, Coast and meteor sit nearby. This toy is a radial-velocity spectrograph watching one star for a planet. The dread is quiet: a cold instrument, hiss, slow signal out of noise, and one target in four that is not a planet.

Decisions taken with Tom on 2026-11-09:
- **Core gesture:** fold the period. Drag scrubs a trial period; the rows re-sort by phase and snap into one clean signal at the right period.
- **The scare:** a star that will not fold. Deep, asymmetric, aperiodic dips; no line wobble; no periodogram peak. Like Tabby's star. You can only move on.
- **The shot:** a full-stage spectrogram waterfall, wavelength across, time down. Light curve and periodogram are thin traces at the edges.

**Goal:** Watch a spectrograph stack exposures of one star. Drag to fold the stack by a trial period until the wobble of the lines and the dark transit band line up. Some stars never line up.

**Architecture:** Raw WebGL2. Exposures are instanced horizontal strips; each strip samples a stellar line template shifted by that exposure's Doppler velocity, times a fixed telluric template, times its flux. A grade pass finishes it. The CPU holds the exposures, the fold order, the periodogram and the lock state.

**Tech stack:** raw WebGL2 on the `shared/stim.js` helpers; Web Audio through `audioKit`. Bar v2. Lab toy, `sub: "Stimming Lab"`, no emblem.

**Spec:** this document. House rules: `AGENTS.md`, `docs/toy-dev-plan.md` (Ground rules), `docs/plans/README.md` (batch rules, QA Q1 to Q10), `docs/plans/bar-v2.md`. Template toy: `flametest/index.html`.

| | |
|---|---|
| Size, estimate | M · $20 to $35 |
| Kits | none. Watchdog, frame loop, pointer machine and `audioKit` wiring copied from `flametest/index.html` |
| Before the build | `git pull --ff-only`; create the feature bean and its worktree (ADJUDANT.md) |

## The shot

A black CCD frame fills the stage. Wavelength runs left to right; time runs top to bottom, newest exposure at the top.
Forty to sixty dark absorption lines stand in a grey continuum, like a strip of an échelle order in a FITS viewer: grey on black, no colour.
Row by row the forest of lines leans left and right by a few pixels. That is the star, pulled by something unseen.
A few lines never move. Those are Earth's own air, the tellurics.
Some rows are dimmer: the transit. Some rows are missing: cloud.
At the left edge, one thin column of dots: each row's brightness, the light curve. Along the bottom edge, one thin trace: the periodogram, with a cursor at the trial period.
One small line of Iosevka at the top centre: `P — · K — · δ —`. It fills in when the fold locks.
The first frame is a picture: target 1 already holds a full stack of 256 exposures in time order, with the zigzag visible, no fold yet.

Palette: cold and nearly monochrome. Stage `oklch(0.08 0.01 230)`. Continuum grey `oklch(0.72 0.01 230)`. One accent for the lock and the cursor: pale cyan `oklch(0.85 0.08 200)`. Nothing purple.

## Hero moments

1. **The scramble.** The first drag throws the rows into new slots. The wobble becomes a jagged zigzag; the dim rows scatter. Rows slide, they do not teleport.
2. **The lock.** Within 0.4 % of the true period the fold eases the last stretch itself. The zigzag becomes one clean sine down the whole stage; every dim row stacks into one dark band; the light-curve column shows one dip; the readout fills in. The hum settles on one pitch and starts to breathe with the sine.
3. **The readout sweep.** A new exposure arrives as a CCD readout: a brightness sweep across the top row over 0.3 s, a shutter tick, then the stack moves down one slot. In a folded stack the new row flashes in at its phase slot.
4. **Tellurics stand still.** On the right period the stellar forest is a sine; three or four lines cut straight down through it, unmoved.
5. **The one that will not fold.** On a wrong target the dips are five to twenty times too deep, asymmetric, at no period. The rows never settle. The periodogram is a hiss with no peak. The lines do not wobble at all: the star dims and nothing pulls it. The hum detunes and growls.

## Loop

- Drag left or right: scrub the trial period on a log scale from 0.5 to 20 days. The fold updates every frame. Near a periodogram peak the drag stiffens (a detent).
- Scroll, or two-finger drag up and down on touch: fine period, one tenth of the drag gain.
- Tap or hover a row: that exposure's 1-D spectrum cut shows as a thin trace at the top edge for as long as the pointer stays, and for 2 s after a tap.
- Pick a target with the stepper or keys 1 to 8. Shuffle draws a random target. Each switch re-exposes the stack over about 1.5 s.
- Reset: unfold to time order, trial period cleared, exposure to default.
- Left alone, exposures keep arriving every 1.2 s at the default exposure. After 60 s the shutter closes and the loop sleeps.

## Bar (v2)

| Slot | Content |
|---|---|
| Choice | Target, a `stepper` (eight options): catalog-style designations, each with a number key 1 to 8. Two of the eight are wrong stars. |
| Slider | Exposure: short to long. Short gives fast rows and heavy noise; long gives slow rows and a clean spectrum. Default is one third. |
| Actions | Shuffle (random target, `Space`) |
| Settings | Tellurics: Off, On · Cosmic rays: Off, On · Stretch: Linear, Log · Quality (shared) · Reset in the footer |
| Keys | `[DRAG] fold` · `[SCROLL] fine` · `[TAP] cut` · `[1-8] target` |

**At 375 px.** The stepper moves bottom left, Shuffle bottom right, Exposure into Settings (Bar v2 rule). The top-edge cut trace and the readout stay; the light-curve column narrows to 8 % of the width.

## Targets

Each target is a seed and a few numbers. Designations look like a catalog but match no real star. Line forests come from a spectral type.

| # | Designation | Type | Lines | v sin i | Planet | Kind |
|---|---|---|---|---|---|---|
| 1 | TOI-4811 | G2 | 52, medium | 2 km/s | P 3.52 d, deep, hot Jupiter | planet |
| 2 | HD 219134 c | K3 | 60, dense, deep | 1 km/s | P 6.76 d, shallow | planet |
| 3 | WASP-1207 | F6 | 34, shallow, broad | 9 km/s | P 1.09 d, deep, fast | planet |
| 4 | KIC 8462852 | F3 | 30, broad | 12 km/s | none | wrong |
| 5 | GJ 3470 | M1 | 60, dense, crowded | 1 km/s | P 12.4 d, shallow | planet |
| 6 | HAT-P-2219 | K0 | 56 | 3 km/s | P 2.21 d, eccentric (skewed sine) | planet |
| 7 | EPIC 204278916 | K5 | 58 | 2 km/s | none | wrong |
| 8 | TOI-700 d | M2 | 60, crowded | 1 km/s | P 18.7 d, faint, long | planet |

Shuffle draws a random type, period, depth and velocity amplitude, and is wrong with probability one in four.

**Scales.** True Doppler shifts are sub-pixel. The toy exaggerates the wobble to 2 to 6 px at 1280 px and says so nowhere on the stage; the readout prints the true K in m/s. Transit depth draws at 3 to 6 times its true value for planets and 15 to 40 % for wrong stars.

## Physical details

- **Tellurics do not move.** O₂ and H₂O lines sit fixed in the detector frame while every stellar line shifts. With Tellurics off they vanish, as a corrected spectrum would show.
- **Barycentric drift.** In time order the whole stellar forest also leans slowly with the seasons (Earth's own motion, a sine over 365 days, half a pixel per 30 rows). The fold removes it, as the pipeline's barycentric correction does.
- **Rossiter–McLaughlin.** During transit the planet hides part of the rotating star, so each line core grows a small bump that travels from the blue wing to the red wing across the transit rows. Strongest on the F stars with high v sin i.
- **Rotational broadening.** Hot, fast stars have few, shallow, wide lines; cool, slow stars have many narrow deep ones. The template is convolved with a rotational kernel of width v sin i.
- **Noise.** Photon noise scales with the square root of flux; read noise is constant. Short exposure doubles both. Transit rows are noisier because they are dimmer.
- **Cosmic rays.** Each row carries zero to three hot pixels or two-pixel streaks that never repeat in another row. In a folded stack they are the only thing that stays scattered.
- **Weather.** About one row in nine is missing. In time order it is a black row with a 1 px dashed mark at the left. In a folded stack the gaps disappear into the phase order.
- **Readout.** A new row appears as a brightness sweep from left to right over 0.3 s, then a soft shutter tick. The CCD reads out after the shutter closes, so the tick comes first and the sweep follows by 80 ms.
- **The wrong star.** Dips of 15 to 40 %, ingress slower than egress, durations that vary, no repeat. Flux between dips drifts by a few percent. The lines hold still to the pixel.

## Sound

- **Cryostat hum:** two detuned low sines near 54 Hz and a filtered noise floor. Always on while the loop runs, under everything.
- **Shutter tick:** one short filtered click per new exposure, jittered in pitch and time, panned to the row's arrival side.
- **Hiss:** white noise through a high shelf. Its level follows the display noise, so a short exposure hisses more.
- **The stir:** while dragging, a granular rustle whose density follows the drag speed and the number of rows in flight.
- **The planet:** once locked, a pure tone near 220 Hz whose pitch follows the RV sine as a phase cursor sweeps the folded stack, one orbit every 8 s. A soft, dull thud as the cursor crosses the transit band. This is the sonification real teams use.
- **The wrong star:** no lock, so no planet tone. Instead a sub-harmonic of the hum at 27 Hz swells for 2 s each time the phase cursor crosses a dip, at no regular interval. The hum's two sines detune further apart the longer the target stays on screen.
- Mute by default; starts on the first gesture; the context suspends when the loop sleeps (`kit.rest`).

## Finesse

- The first frame is a full stack with a visible zigzag.
- Every drag answers within one frame: rows start to slide at once, the periodogram cursor moves at once.
- Rows slide to their slots over 0.35 s with an ease-out; they never swap in one frame.
- The lock eases the last 0.4 % of period on its own, so the sine becomes clean without a jitter.
- The dark band of the transit has soft edges (ingress and egress), never a hard-edged bar.
- The readout flickers through two or three wrong digits before settling on the lock, like a real fit converging.
- Nothing on the stage is purple. Nothing is coloured except the single cyan accent.

## Reduced motion and idle

- **Reduced motion:** rows re-sort without the slide; the readout sweep is off; the phase cursor still sweeps, since it carries the sound.
- **Idle:** this toy drifts. Exposures keep arriving at 30 fps draw rate; 60 s after the last input the shutter closes, the hum fades over 2 s and the loop stops. Any input reopens it.
- **Hidden:** the loop and the exposure clock stop at once.

## Review focus

1. **375 px portrait.** The waterfall keeps its full width; the light-curve column is 8 % wide; the periodogram sits above the bottom bar's row with 44 px of clearance. The drag works with one finger; two fingers fine-tune.
2. **Realism of the frame.** It must read as a detector frame, not a chart: no axes, no gridlines, no labels on the stage except the one readout. Check against a real échelle order strip.
3. **Lock tolerance.** 0.4 % must be reachable by finger on a phone. If not, widen the detent, not the tolerance.
4. **The wrong star must not feel broken.** Its rows still slide, the periodogram still redraws; the stage is alive, only nothing resolves.
5. **No float targets.** If the grade pass can work on an RGBA8 target, do that, so `.fail` is rarer than in Flame test.

## Tech

**One file,** `exoplanet/index.html`, laid out as `flametest/index.html`: head with `color-scheme` dark and an inline `html{background}`, Gabarito, `../shared/stim.css`, `../shared/intro.css`; `.intro` with `intro-name` and `intro-sub` "Stimming Lab", no emblem; `.wrap > main > .stage.stage--exoplanet` with `p.fail`; `section.about` with `h1.display` and a hidden `.vignette`; the standard importmap word for word; then the module.

**Shell.** `initPage({ id: 'exoplanet', bar })` (`shared/stim.js:158`). Handles: `ui.choice.set`, `ui.slider.set`, `ui.action('shuffle')` (keyed by verb), `ui.setting(id).value`, `ui.keys`, `ui.hideControls` (L731–761). Read persisted settings back as Flame test does (`flametest/index.html:133–138`). Gate the intro on `glReady` as Flame test does (L140–143).

**No render targets.** A CCD frame needs no bloom. Draw straight to the canvas in one pass and grade (stretch, grain, vignette) in the same fragment shader. Keep `compile`, `locate` and the `KHR_parallel_shader_compile` polling from Flame test (L467–498) verbatim. Drop `target`, `free`, `bind` and `draw` (L514–538). `.fail` fires only on no WebGL 2.

**Templates.** On each target switch the CPU builds two `Float32Array(4096)`: the stellar template (Gaussian lines of the type's density and depth, convolved with a rotational kernel of width v sin i) and the telluric template (fixed O₂ and H₂O lines). Upload both as `R16F` 4096 × 1 textures with `LINEAR` filtering. R16F sampling is filterable in WebGL 2 core; only rendering to it needs an extension, and this toy never renders to it. The window spans 12 nm of wavelength across the stage.

**Exposures.** `N = 256` records in parallel Float32Arrays: `t` (days), `rv` (px), `flux`, `seed`, `transit` (phase in transit, or −1), `gap`, `rm` (skew), `y` and `yTo`. Each is one instanced strip. Copy Cloud chamber's layout: a static 4-vertex corner buffer at location 0 and one `DYNAMIC_DRAW` instance buffer with two `vec4` attributes at divisor 1 (`chamber/index.html:335–350`), uploaded each frame with `bufferSubData` (L401–407). Pack `[y, rv, flux, seed]` and `[transit, gap, rm, age]`. 256 × 32 B per frame.

**Strip fragment.** `x` → wavelength. Sample the stellar template at `x − rv` and the telluric at `x`; multiply; multiply by `flux`; add the Rossiter bump near line cores when `transit ≥ 0` (a Gaussian in `x` centred at `rm`, scaled by the local line depth); add photon noise (hash of `seed`, `x`, scaled by `sqrt(flux)` and the exposure) and read noise; cosmic rays where a second hash passes a threshold; a gap row is black with a dashed mark at the left edge. Then the grade: linear or log stretch, grain, vignette. Strip edges snap to whole device pixels in the vertex shader and overlap by 1 px, so eased `y` leaves no seams.

**Edges.** A second small program on the same corner VAO draws the light-curve dots (one instance per row, `x` from `flux`, `y` from the row) and the periodogram (one instance per trial period). Additive blend, drawn after the strips. The spectrum cut on hover or tap is a `LINE_STRIP` of 512 points from a CPU array: the CPU already holds the template and the row's parameters, so no GPU readback.

**Readout.** One DOM span inside the stage, `font: 500 11px/1 var(--slab)` as `.stim-ui` uses (`shared/stim.css:300, 318`), in a toy-local class. Top centre, under the top corners.

**Layout.** Corners inset 12 px with 26 px chips (36 px coarse); the key strip sits bottom centre (`shared/stim.css:307–327, 460–463`). Reserve 52 px top and 64 px bottom (62 and 88 px coarse). The periodogram trace sits 70 px above the bottom edge, the cut trace under the top reserve. The light-curve column is 10 % wide in landscape and 8 % in portrait. Recompose on `W >= H * 0.95` as Flame test does (L560). `layout()` calls `fitCanvas(canvas, { maxDpr: 2, low: rung >= 1 })` (`stim.js:940`).

**Fold.** `phase_i = frac(t_i / P)`. Sort indices by phase; assign `yTo` by rank; ease `y` toward `yTo` with a 0.35 s ease-out. Unfolded, rank is by `t`. **Periodogram:** a Lomb-Scargle on `rv` and a box-least-squares on `flux`, each over 400 log-spaced trial periods, summed and normalised; recomputed when an exposure arrives, never per frame. **Lock:** inside 1.5 % of the true period, ease `P` toward it with a 0.25 s exponential; inside 0.4 %, lock. Drag gain is divided by `1 + 6 · power(P)`, the detent. A wrong star has no true period, so it never locks.

**Pointer.** Night viaduct's machine (`viaduct/index.html:330–357`): 8 px or 260 ms, capture on press, `pointercancel` and `lostpointercapture` end every gesture. Horizontal drag: `P *= exp(dx · k)`. Wheel as Ulam spiral does it (`ulam/index.html:487–495`): `passive: false`, `preventDefault`, `deltaMode === 1 ? deltaY * 16`. Two-finger vertical drag on touch is the fine control.

**Frame loop and watchdog.** Copy Flame test L861–906: `live()`, `wake()`, `frame()` with `try`/`finally`, 30 fps while drifting (`now − lastDraw >= 31`), `SLEEP = 60000`, `EASE = 2000`, `kit.rest(() => !settling())`. The ladder: rung 1 pixel ratio to 1, rung 2 no grain, rung 3 `N` to 128. `onQuality` resets `rung` and the slow timer as Flame test does (L1156). `whenVisible(stage, …)` stops the loop and the exposure clock and suspends audio (L1115–1163).

**Sound.** `audioKit({ keys })` (`stim.js:768`): `kit.live()` returns the context only when sound is on, `kit.out` is the bus, `kit.noise` is a 1 s white-noise buffer, `kit.rest(isIdle)` suspends after a quiet spell. Schedule the shutter tick and thud on `ac.currentTime + delay` as Flame test's `burst` does (L781–794). Keep a count of pending nodes so `rest` counts them as busy.

## Tasks

### Task 1: Blockout

**Files:** `git pull --ff-only`. Create the feature bean (`beans`) and its worktree. Create `exoplanet/index.html`. Add the `toys.json` entry (`name: "Exoplanet"`, `number: null`, `sub: "Stimming Lab"`, `emblem: null`, `nl` and `ipa` drafts, `sound: true`, `series: "science"`) and the Lab menu `<li>` at the end of `section.lab` in `index.html`, with a `toys.exoplanet` hook (`play()` returns a GSAP timeline that scrambles three line marks then snaps them to one sine; `rest()` straightens them). Template: `<li>` at `index.html:2056–2075`, hook at L3388–3396, `loop()` at L2415.

**Produces:** `TARGETS`, `template()`, `STRIP_VS`, `STRIP_FS`, the instance buffer, `layout()`.

- [ ] Templates, 256 strips in time order, tellurics, grade. The stepper picks a target; a switch re-exposes the stack.
- [ ] Q1, Q2, stills at 1280 and 375 px. Checkpoint with Tom.
- [ ] Commit: `Exoplanet: blockout of the waterfall`.

### Task 2: Fold, scrub and lock

- [ ] Pointer machine, drag on log P, wheel and two-finger fine, phase sort with eased `y`, the detent, the lock ease.
- [ ] Periodogram trace with cursor, light-curve column. Q4.
- [ ] Commit: `Exoplanet: fold, scrub and lock`.

### Task 3: Texture of the frame

- [ ] Transit dip with soft ingress and egress, Rossiter skew, cosmic rays, weather gaps, barycentric lean, readout sweep.
- [ ] Spectrum cut on hover and tap, the Iosevka readout with the converging digits.
- [ ] The two wrong targets and the one-in-four wrong Shuffle.
- [ ] Commit: `Exoplanet: tellurics, transits and the cut`.

### Task 4: Sound

- [ ] Hum, shutter tick, hiss, the stir, the planet tone and thud on lock, the wrong star's growl. Q9.
- [ ] Commit: `Exoplanet: hum, shutter and the wobble`.

### Task 5: Settings and QA

- [ ] Shuffle, Reset, Tellurics, Cosmic rays, Stretch, persistence. Watchdog ladder. Idle, hidden, reduced motion.
- [ ] Q1 to Q10 in the browser pane; `tests/run.sh` (Bar v2) passes; the menu script parses. Tick the bean, record the cost. Commit through `tools/commit.sh`, open the PR, merge.

## Verification

1. **Syntax (Q1):** write the module and the menu script to `.mjs` and run `node --check`.
2. **Console (Q2):** load `/exoplanet/` in the browser pane, wait for `.intro` to leave, drive the stepper, Shuffle, the slider, every Settings row, drag, wheel, tap. No errors or warnings.
3. **Stills (Q3):** 1280 × 800 and 375 × 812 (touch), one per hero moment: the scramble, the lock, a wrong star. Tom sees them.
4. **Frame budget (Q4, Q5):** 32 or fewer frames per second while drifting; none 62 s after the last input; none after `visibilitychange` hidden.
5. **Reduced motion (Q6):** rows re-sort without the slide; the readout sweep is off.
6. **Bar (Q7, Q8):** five controls or fewer; keys 1 to 8, Space, and arrows on the stepper all work; `tests/run.sh` passes at 1280, 375 × 812 and 812 × 375.
7. **Sound (Q9):** with `stimming.exoplanet.sound = 1`, the context runs after the first drag and is suspended 62 s after the last input.
8. **Lock by finger:** on the 375 px touch emulation, each of the six planet targets locks within 20 s of dragging. If not, widen the detent.
9. **Realism check:** compare a 1280 px still with a real échelle order strip by eye. No axes, no gridlines, no colour but the accent.

## Kit handoff

None. The instanced-strip stack and the fold suit any later waterfall toy (Sonar's listen mode, idea 54).

## Open for Tom

- Dutch name. Draft: **Exoplaneet**, IPA `ˌɛksoːplaːˈneːt`.
- Series. Draft: `science`. Galaxy carries none; Star trails carries `dark`.
- Designations. The table mixes real names (KIC 8462852 is Tabby's star; HD 219134, GJ 3470 and TOI-700 are real systems) with invented ones. Default: make all eight catalog-shaped but fictional, and keep KIC 8462852 only if Tom wants the nod.
- This plan file is copied to `docs/plans/exoplanet.md` in the repo as the first step of Task 1, so the build session reads it from there.

## Rev 2: three instruments (Tom, 2026-11-09)

Tom's read of Rev 1: it is an instrument readout, not a telescope, and it looks like Sonar's waterfall. The toy becomes one star seen through three instruments. The fold gesture is shared; the wrong stars stay wrong in every mode.

| Instrument | The shot | Gesture | At lock | Wrong star |
|---|---|---|---|---|
| Transit | The star as a limb-darkened, granulated disc with four diffraction spikes, left. The light curve as dots, right, in time order or folded. | Drag folds. | The dots form one dip. A black planet disc crosses the star on every pass of the phase cursor. | The disc dims deep and ragged. No silhouette, ever. |
| Spectrograph | Rev 1's waterfall, unchanged. | Drag folds, tap cuts. | The sine and the band. | No wobble. |
| Coronagraph | A black mask on the star, a thin leak ring, a boil of speckles. | Hold to integrate: the speckles average down. Drag still folds. | A faint dot emerges beside the mask and, when locked, walks its orbit with the cursor. | No dot. A ragged arc of dust comes up instead. |

**Bar.** The choice is a `tray`: Transit, Spectrograph, Coronagraph (keys T, S, C). Target becomes a stepper row in Settings; Shuffle stays the main way to a new star. Keys: `[DRAG] fold` · `[HOLD] expose` · `[TAP] cut` · `[SPACE] shuffle`.

**Tech.** Two more fragment programs on the quad VAO: `STAR_FS` (disc, spikes, halo, scintillation, silhouette from the cursor's phase and the target's transit duration) and `CORO_FS` (mask, leak ring, speckle field from hashed octaves rotating with the sky, planet PSF at the orbit position, integration as `1 / sqrt(1 + 40 · integ)` speckle contrast). `integ` rises over 4 s while held and falls over 8 s. The light curve in Transit mode uses the marks program at full width, 3 px dots. The exposure clock, the fold, the periodogram and the sound run under every mode.

**Opening shot.** Transit, target 1, time order: the star breathes, the curve scrolls, one dip is already in it.

## Rev 3: the spectrograph reads the atmosphere (Tom, 2026-11-09)

The Spectrograph becomes the composition instrument, in true colour. The window is 380 to 780 nm. Each row is the star's dispersed spectrum in the colours a CCD would record under the star's own Planck curve, with real Fraunhofer lines and the telluric oxygen and water bands. Above the waterfall sits the transmission spectrum: the planet's size by wavelength, measured from the transit rows. It is noise until the fold locks; then sodium, potassium, water, titanium oxide, methane and a haze slope come up where the planet's air absorbs, each tagged in its own colour once it stands three sigma above the noise. A hold integrates faster. A wrong star brings up a flat grey line: dust, not an atmosphere.
