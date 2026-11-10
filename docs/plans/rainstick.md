# Rain stick (`rainstick`) implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. One fresh session builds this toy, task by task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A long glass tube lies across a dark stage, full of beads and a forest of pins. Tilt it and the beads trickle down through the pins. Every bead that hits a pin clicks and lights that pin, so the tube rains light as it rains sound.

**Architecture:** CPU physics in the tube's own 2D frame: a few hundred bead discs, a lattice of pin discs, a spatial hash and position-based sub-steps. Raw WebGL2 draws the tube in three passes: a pin glow buffer that decays (K1 style), the beads as sphere impostors, and a glass composite with refraction, rim light and bloom.

**Tech stack:** raw WebGL2 on the `shared/stim.js` helpers; Tone.js through `kit.tone()`. No three.js.

**Spec:** shortlist 65 in [toy-ideas.md](../toy-ideas.md); "Rain stick" in [toy-plan.md](../toy-plan.md); rank 2 in [fidgets.md](fidgets.md); batch rules in [README.md](README.md); Bar v2 in [bar-v2.md](bar-v2.md).

| | |
|---|---|
| Size, estimate | M · $20 to $30 |
| Kits | none. The pin glow buffer copies the decay idea of K1 (`trails/index.html`, `K1: accumulation and decay`); it is not a full lift. |
| Before the build | nothing |

## The shot

A deep blue-black stage. One glass tube runs corner to corner at a shallow angle, nearly the full width, its ends capped with dark discs.
Inside: a staggered spiral of thin pins, seen side on, and a pile of beads resting at the low end.
A warm backlight sits behind the tube, low and off to one side, so the glass carries one long bright rim and the beads glow at their edges.
Nothing else: no hands, no stand, no cactus skin.

The first frame is a picture: the tube is mid-tilt and a thin trickle is already falling through the upper pins, each hit a small flash.

## Hero moments

1. **The turn.** Flip the tube. The pile slides off the end in a rush, then breaks into a trickle that rattles down through the pins for 10 to 15 s.
2. **Rain of light.** Each pin hit flashes the pin and fades over 400 ms. A dense trickle makes the pins shimmer like rain on a window at night.
3. **The tube sings.** The hollow tube adds its own low resonance under the clicks, so a full trickle has a body, not only a crackle.
4. **The last drops.** The trickle thins to single beads and stray clicks, then silence, and the pins fade dark.

## Loop

- **Drag:** the tube turns about its centre, following the pointer's angle. Beads feel the new slope at once.
- **Tap:** a shake: a small jolt along the tube. Beads jump and click.
- **Flip (F):** the tube turns over in 0.8 s with an eased spin.
- **Release:** the tube keeps its angle. The trickle runs out on its own.
- **Untouched:** the trickle ends and the loop sleeps. No drift.

## Bar (Bar v2)

| Slot | Content |
|---|---|
| Top left | Choice: Fill, `segments`: Seeds, Glass, Steel (keys 1, 2, 3) |
| Bottom left | Action: Flip, key `F` |
| Bottom right | Slider: Fill (the bead count, 120 to 480) |
| Bottom centre | Keys: `[DRAG] tilt` · `[CLICK] shake` · `[F] flip` |
| Settings | Pins: Sparse, Dense, Spiral (choice) · Glow (slider: pin flash strength) · Quality (shared) |
| Settings footer | Reset: the tube returns to its start angle with the beads at the low end |

Three visible controls.

| Fill | Bead | Sound | Look |
|---|---|---|---|
| Seeds | small, light, soft | dull ticks, low-passed near 2 kHz; a soft hiss | warm, matte, amber |
| Glass | medium | bright ticks near 5 kHz with a glassy ring | clear beads that refract the backlight |
| Steel | small, heavy | hard clicks with metal partials; fast, dense rain | mirror beads with sharp highlights |

### At 375 px

- The tube turns to run from the top left to the bottom right, at a steep angle, so it keeps its length.
- Bead counts drop by a third. Touch targets are 34 px.
- The choice moves bottom left as a stepper; Flip moves bottom right; Fill moves into Settings.

## Physics

The tube's frame: x runs along the axis, y across it. Gravity projects into this frame from the tube angle θ.

| Item | Rule |
|---|---|
| Step | Fixed 1/240 s with an accumulator. Position-based: predict, collide, derive velocity. |
| Beads | discs, radius 0.6 to 1.0 of the base radius, mass by Fill |
| Pins | discs on a staggered lattice. Spiral bends the rows into a helix seen side on. |
| Walls | the tube's inner walls at y = ±R, and the end caps |
| Contacts | bead against bead and bead against pin through a uniform grid (cell = 2 bead radii). Restitution 0.25 (Seeds), 0.4 (Glass), 0.5 (Steel). Friction 0.3. |
| Hits | a bead-pin contact with normal speed above a threshold emits a hit: pin index, speed, x |
| Sleep | the loop sleeps when no bead moves more than 0.0005 per step for 0.5 s |

- The trickle rate barely depends on how full the tube is. Granular flow through a gap is set by the gap, not the head of beads above it (Beverloo). The pins are the gaps.
- Steel beads fall fastest and rattle the most; Seeds lose energy at each hit and drift down.

## Tech

**Pin glow buffer.** A half-resolution `R16F` texture. Each hit stamps a small soft dot at its pin, scaled by speed. Each frame multiplies the buffer by a decay for a 400 ms half-life. The buffer drives the pin glow and a soft spill on the glass.

**Beads.** One instanced quad per bead, a sphere impostor. Seeds: matte with a warm rim. Glass: refraction of the backlight through the sphere, a caustic dot on the far side. Steel: a mirror of a blurred environment gradient with a hard specular.

**Pins.** Thin lines in the composite pass, dark against the backlight, lit by the glow buffer.

**Tube.** The composite pass draws the glass: a slight lens refraction near the walls, a long rim highlight, a faint inner reflection of the pins, and thickness darkening at the edges.

**Post.** A small Kawase glow chain on the pin glow and the highlights, then a grade with grain and a vignette.

## Sound

- **Hits:** each hit plays one short sample-free voice: a noise burst through a band filter, plus for Glass a short sine ring and for Steel two inharmonic partials. Level follows hit speed; pan follows x along the screen.
- **Cap:** 60 single hits per second. Past the cap, a granular bed (band noise with random gating) takes the surplus, so a rush reads as rain, not a buzz.
- **Tube body:** all hits feed a resonant bandpass at the tube's low mode (f = c / 2L, about 170 Hz for a 1 m tube) at a low level.
- **Flip:** a soft whoosh of the beads sliding down the glass.
- Pitch, time and level jitter on every hit. Muted by default.

## Finesse

- Each hit lights its own pin. Sound and light share one event.
- Glass beads throw a small caustic dot onto the far wall of the tube.
- The pile at the low end settles into a slope at the angle of repose.
- A shake throws a few beads back up past the pins.
- The tube's body tone swells with the hit rate.

## Reduced motion and idle

- **Reduced motion:** pin flashes fade over 150 ms and stay dim. Flip turns the tube at once, with no spin.
- **Idle:** lively while beads move. The loop sleeps when the beads settle. No drift.

## Review focus

1. **Tunnelling:** a fast Steel bead never passes through a pin. The sub-step and the maximum speed cap prevent it.
2. **Fill change mid-trickle:** new beads spawn at the low end, removed beads leave from the pile, never from the flight.
3. **Rapid flips:** the spin animation retargets; the beads never see an angle jump.
4. **Hit storms:** a full flip with 480 Steel beads stays under the voice cap and the granular bed carries the rest.
5. **Frame cost at 480 beads:** the hash keeps contacts linear. Log step time in the bean.

## Tasks

### Task 1: Blockout (checkpoint)

**Files:** Create `rainstick/index.html`, the `toys.json` entry and the menu Lab entry with a low-fi icon and its `toys.rainstick` hook. Commit shared files with `--hunks`.

**Produces:** `tube` (`{ angle, pins, beads }`), `step(h)`, the spatial hash, `hits[]`.

- [ ] Tube, pins, beads and the backlight. Drag turns the tube; beads trickle. Flat bead shading is fine here.
- [ ] Bar v2 spec with Fill, Flip, the slider and the Settings rows wired as stubs.
- [ ] Q1, Q2 and stills at 1280 and 375 px. Checkpoint with Tom.
- [ ] Commit: `Rain stick: blockout, beads through pins in a glass tube`.

### Task 2: Sound first

- [ ] Hit voices per Fill, the cap and the granular bed, the tube body, the flip whoosh. Q9.
- [ ] Tom listens before the look work starts. Checkpoint with Tom.
- [ ] Commit: `Rain stick: the rain sound`.

### Task 3: Light

**Produces:** the pin glow buffer, bead impostors per Fill, the glass composite and the glow chain.

- [ ] Pin flashes, bead shading, glass, post.
- [ ] Q4: the loop sleeps after the beads settle. A still mid-trickle for each Fill.
- [ ] Commit: `Rain stick: every hit lights its pin`.

### Task 4: Finish and QA

- [ ] Pins, Glow and persistence. The performance ladder: pixel ratio 1, then the glow chain, then the bead count.
- [ ] Q1 to Q10 in the browser pane. Tick the bean and record the cost. Commit.

## Kit handoff

None. The bead and pin solver, marked as a section, suits a pachinko or a Galton board toy later.
