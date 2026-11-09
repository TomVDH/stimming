# Bismuth crystals (`bismuth`) implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. One fresh session builds this toy, task by task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Drag up from a pool of liquid metal and pull out a bismuth crystal. Its square terraces step out while you drag, and a rainbow oxide film blooms across each new face.

**Architecture:** Raw WebGL2. The crystals are instanced boxes: each terrace edge is one box. The pool is one full-screen pass with a planar reflection of the crystals. Colour is thin-film interference, computed per pixel from the film thickness.

**Tech stack:** raw WebGL2 on the `shared/stim.js` helpers (Bar v2); Tone.js through `kit.tone()`.

**Spec:** one of five science-fair toys (Tom, 2026-11-09): Lichtenberg burn, Rubens tube, Smoke ring cannon, Flame test, Bismuth crystals. Batch rules in [README.md](README.md).

| | |
|---|---|
| Size, estimate | M · $20 to $35 |
| Kits | none |
| Before the build | nothing |

## Loop v2: Ratchet grow (Tom, 2026-11-09)

Tom found the first loop flat: a dark frame, small crystals, colour that took 9 to 26 s, and an abstract drag-up. He chose Ratchet grow. It replaces the Loop, the Bar keys and the cap below.

| Gesture | Answer |
|---|---|
| Hold | Terraces click out on one big hero crystal. The first click is instant; then the clicks speed up from 0.26 s to 0.07 s. Each new rim flashes white, then its film blooms round the spiral in about 1 s. |
| Click or tap | One terrace, one tick. No harvest. |
| Circle round the hero | It turns one to one; letting go leaves a spin. |
| Release after a hold | Harvest: the hero arcs up, flips once, shrinks and lands on the pile behind. A new seed rises at the centre. |

- The camera frames the hero and pulls back as it grows (16 terraces at most).
- The pile holds 7 crystals (4 on a phone); a full pile remelts its oldest one.
- Each terrace settles on its own film band (64 to 228 nm), so every crystal shows the rainbow.
- The key light swings slowly round the far side, so glints travel.
- Bar: Habit (Spiral, Hopper, Cluster), Heat (bloom speed, ember, hum), actions Harvest (H) and Clear (X). Space holds the ratchet.

## Why instanced boxes, not a raymarched SDF

A hopper crystal is only boxes: square frames that step in and down. The choice is instanced boxes.

1. **Hard edges for free.** Rasterized boxes give pixel-sharp terrace edges. An SDF gives soft edges unless it takes many steps.
2. **Cost follows the crystals, not the pixels.** Eight crystals of 14 terraces are about 450 boxes: one draw call. A raymarch tests every box at every step of every pixel, and a phone screen at 3x has 3 million pixels.
3. **Growth is data.** Each box carries its birth time, so growth and film age live in one instance buffer. The CPU appends boxes; the GPU never rebuilds a scene.
4. **The reflection is cheap.** The pool's mirror is the same draw again, flipped, into a half-size target.

The pool is the one full-screen pass. It has no geometry to march: one ray-plane hit per pixel.

## The shot

A dark space with no walls. A wide pool of liquid metal fills the lower part of the frame and fades into black at the far edge.
One long soft light hangs out of frame, upper left, and lies across the pool as a bright streak. That streak is the key light.
Crystals float on the pool. Solid bismuth is less dense than the melt, so the crystals float, as ice does on water.
The first frame shows three grown crystals, so the full colour range is on screen at once: one large Spiral at centre left, one Hopper at right, and a small one near the lens.

## Hero moments

1. **The pull.** You press on the pool and drag up. A seed breaks the surface, and terraces step out around it while it rises. The pool sags and rings under it.
2. **The bloom.** A new terrace comes out bright silver. Within seconds its film passes through gold, magenta and blue to green. Inner terraces are older, so one crystal shows the whole rainbow from rim to centre.
3. **The glint.** A crystal turns slowly as it floats. Each terrace catches the strip light in turn, and a hard white flash runs round the square spiral.
4. **The mirror.** Each crystal stands on its own reflection, broken by the pool's slow swell.

## Physical details

- **Hopper growth.** Atoms reach edges and corners faster than face centres, so the edges grow out and leave the faces hollow. Each new terrace is a square frame one step wider and one step higher than the last. The centre stays a stepped pit.
- **Square spiral.** Each frame's four edges sit a quarter step higher than the one before, so the terraces read as one square helix, not as rings.
- **Film colour is thickness.** Bi₂O₃ (n about 2.4) on bismuth. The film grows by the parabolic law, `d = k · sqrt(age)`, so it is fast first and slow later. Its colour runs: silver (under 20 nm), gold, bronze, magenta, purple, blue, green, then pale second-order yellow and pink.
- **Colour shifts with angle.** Seen at a grazing angle, the light's path in the film gets shorter, so each face shifts toward the colour of a thinner film. The hue changes as a crystal turns.
- **Edges oxidise first.** Edges cool first and meet more air, so the film is a little thicker there: each terrace has a darker-hued rim.
- **Floating.** Solid bismuth is about 3 % less dense than liquid bismuth. A crystal floats with a little of its base under the surface.
- **The melt is a mirror.** Clean liquid bismuth is near-white silver with a pink cast. A thin oxide skin drifts on it in faint iridescent swirls.

Bismuth melts at 271 °C, which does not glow. The under-glow is stylised: a warm ember deep in the pool, strongest at the centre, under the mirror. The Heat slider sets it.

## Loop

- **Drag up from the pool:** pull a crystal. It grows while the drag continues, faster with drag speed. Release: it settles back and floats.
- **Hold on the pool:** a crystal grows in place, slowly, without a lift.
- **Click or tap:** a seed. A small crystal pops up with three or four terraces.
- **Drag a crystal:** lift it again and move it. Lifting it out of the melt adds more terraces.
- **Untouched:** crystals bob and turn, the pool swells, and the film keeps blooming until it reaches its end colour.
- **Cap:** eight crystals (five at 375 px). The ninth sends the oldest back into the melt. It glows at the waterline and sinks.

## Bar

| Slot | Control | Content |
|---|---|---|
| Top left | Choice: Habit (segments) | Spiral, Hopper, Cluster |
| Bottom left | Actions | `+ Crystal` (key C), `Clear` (remelts all; key X) |
| Bottom right | Slider | Heat: pool glow, swell and film speed |
| Bottom centre | Keys | `[DRAG UP] pull a crystal`, `[HOLD] grow`, `[CLICK] seed`, `[DRAG] lift a crystal` |
| Settings | Toy rows | Air: Air, Argon (no film, bare silver) · Glints: slider · Turn: Off, On |
| Settings | Site | Quality: Standard, High (shared) |
| Settings | Footer | Reset: three new crystals, as on the first frame |

| Habit | Shape |
|---|---|
| Spiral | One square helix, a quarter step per edge. The default. |
| Hopper | Concentric square frames, flat rings, deep pit. |
| Cluster | A main Hopper with two to four small ones grown out at angles from its rim. |

## Tech

**Crystals: instanced boxes.**

- One unit cube mesh, 36 vertices with face normals. One instance buffer, up to 2,048 boxes.
- Each instance: centre (3), half size (3), crystal index (1), birth time (1), film offset (1), edge id (1). The crystal's pose (position, yaw, tilt, bob) lives in a uniform array of 8 entries.
- Growth: a box scales in from zero over 0.18 s after its birth, with a small overshoot.
- The vertex shader builds face UVs, so the fragment shader knows the distance to the box's edge for the thick-film rim.

**Thin film.**

- Thickness `d = dMax · sqrt(age / τ)`, capped at the crystal's end thickness. `τ` follows Heat. Argon sets `d = 0`.
- Reflectance per wavelength: the two-beam Airy sum, `R = r₁² + r₂² + 2 r₁ r₂ cos δ`, with `δ = 4π n d cos θₜ / λ`.
- Seven wavelengths from 410 nm to 690 nm, weighted by a fit of the CIE 1931 curves, into XYZ, then linear sRGB.
- Substrate: bismuth's own reflectance, near-white with a pink cast, mixes under the film.

**Light and glints.**

- An analytic environment: a black space with one long strip light (the key), one small cool fill and a faint warm glow from the pool below.
- Each face reflects that environment. Each terrace has a tiny tilt jitter, so terraces catch the strip at different moments. That is the glint.
- A specular peak with a high power gives the hard flash. Bloom with a threshold turns it into a star of light.

**Pool.**

- One full-screen pass. Each pixel finds the ray's hit on the plane y = 0.
- Normal: two layers of moving noise for the slow swell, plus ring ripples from each pull (up to 8 sources, as uniforms).
- Colour: the mirror reflects the same environment, then the half-size reflection target, offset by the ripple normal. The ember glow adds from below, by Heat.
- Oxide skin: a faint thin-film tint in slow noise swirls across the surface.
- Fresnel: the pool is darker straight down and brighter at a grazing angle, toward the far edge.

**Post.** Half-size bright pass, two blur levels, then a composite with a grade, a vignette and grain.

**First frame.** Three crystals already grown, their films part way bloomed: the first frame shows silver, gold, magenta, blue and green.

## Sound

- **Ticks:** one soft crystalline tick per new terrace. A short FM tone at 2 to 5 kHz, pitch rising as the crystal grows, with pitch, time and level jitter. Panned by the crystal's x.
- **Hum:** the melt. A low sine at 55 Hz plus soft brown noise through a lowpass; Heat raises its level and filter.
- **Pull:** a viscous slurp as the seed breaks the surface: a short bandpass sweep.
- **Remelt:** a soft sizzle as a crystal sinks.
- **Glint:** a very faint high shimmer when a strong glint fires. Rare.

## Finesse

- The film colour sweeps across a face from the rim inward, never as a flat switch.
- A crystal grows faster when you drag faster. A slow drag gives fewer, wider terraces.
- The pool sags under a pull and rings when the crystal settles.
- Glints are rare and sharp. A turning crystal flashes one terrace at a time.
- Argon gives bare crystals of pink-silver: proof that the colours come from the film.

## At 375 px

- The camera tilts steeper and pulls back. The pool fills the lower two thirds and crystals rise into the upper third.
- The cap drops to five crystals, and the first frame shows two.
- Bloom runs at quarter size.
- Every gesture has a touch form: the hold is 260 ms; the drag threshold is 8 px.

## Reduced motion and idle

- **Reduced motion:** no swell, no bob and no turn. Terraces appear without the overshoot. The film still blooms, but evenly over 2 s.
- **Idle:** this toy drifts. It runs at 30 fps when drifting and sleeps 60 s after the last input. The film reaches its end colour before the sleep.

## Review focus

1. **Film banding:** seven wavelengths must give smooth hues, with no stripes in the gold-to-magenta step.
2. **Mirror seam:** a crystal's base must meet its reflection at the waterline with no gap.
3. **A drag that starts on a crystal:** it lifts that crystal and does not seed a new one.
4. **The cap:** the ninth crystal remelts the oldest, never the one in hand.
5. **Glint bloom:** many glints at once must not flash the whole screen.

## Tasks

### Task 1: Blockout (checkpoint)

**Files:** Create `bismuth/index.html` and the bean. Add the `toys.json` entry and the Lab menu `<li>` with its `toys.bismuth` hook, so the shell shows the name and the Lab reaches the page.

**Produces:** `CRYSTAL_VS/FS`; `POOL_FS`; `grow(crystal, steps)`; `film(d)`; `layout()` with the 1280 and 375 px cameras.

- [ ] Pool pass with swell, mirror, ember and reflection. Three static crystals with film and glints. Bloom and grade.
- [ ] Bar v2 spec in place, wired to stubs.
- [ ] Stills at 1280 and 375 px. Checkpoint with Tom.
- [ ] Commit: `Bismuth: blockout, three crystals on a liquid-metal pool`.

### Task 2: Pull and grow

**Produces:** the pointer state machine; `pull`, `seed`, `lift`; the cap and the remelt.

- [ ] Drag up pulls and grows; hold grows; tap seeds; drag a crystal to lift it.
- [ ] Film age per terrace; float, bob and turn.
- [ ] Commit: `Bismuth: pull a crystal out of the melt`.

### Task 3: Pool life

- [ ] Ripple sources, the sag under a pull, the settle ring, the oxide skin swirls. Heat slider.
- [ ] Habit chips and Settings rows live.
- [ ] Commit: `Bismuth: the pool rings and the heat`.

### Task 4: Sound

- [ ] Ticks, hum, pull slurp, remelt sizzle, glint shimmer. Q9.
- [ ] Commit: `Bismuth: ticks and the melt hum`.

### Task 5: Menu icon and QA

- [ ] The Lab icon in the angular brut style, interactive on the pointer.
- [ ] Q1 to Q10 in the browser pane. Tick the bean and record the cost. Commit.

## Kit handoff

None. The thin-film function suits Oil slick or a soap toy later, if Tom wants one source for it.
