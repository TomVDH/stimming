# Bench (`bench`) implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. One fresh session builds this toy, task by task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** One backlit beaker, two experiments. Electrolysis: switch on the current, and bubbles stream from two electrodes while the indicator blooms into a rainbow from acid to base. Clock: pour one clear liquid into another, wait, and the beaker snaps to ink black.

**Architecture:** Raw WebGL2 with Marbling's 2D stable-fluids solver (K5) in the beaker's cross-section. Each experiment adds scalars that the flow advects: a signed acid-base value for Electrolysis, and a mix fraction plus reaction progress for Clock. Bubbles are CPU particles that push the fluid up.

**Tech stack:** raw WebGL2 on the `shared/stim.js` helpers; Tone.js through `kit.tone()`.

**Spec:** shortlist 42 (Iodine clock) and 43 (Electrolysis) in [toy-ideas.md](../toy-ideas.md); "the chemistry bench", rank 19 in [toy-plan.md](../toy-plan.md); batch rules in [README.md](README.md).

| | |
|---|---|
| Size, estimate | M · $20 to $35 |
| Kits | Uses K5 from `marble/index.html` (`simStep()`) |
| Before the build | D5: one page with two chips. If Tom says no, build Electrolysis alone as `electro`, from Tasks 1, 2, 4 and 5. |

## The shot

A tall glass beaker, shown only by light: two thin vertical highlights on the glass, a bright meniscus line, and a soft lab light behind.
No stand, no labels, no wires above the frame. In Electrolysis, two dark graphite rods dip into green liquid.
The first frame shows the rainbow already formed: red at the left rod, violet at the right, green in the middle.

## Hero moments

1. **The rainbow.** Acid builds at the anode (+) and base at the cathode (−). The universal indicator spans every colour between: red, orange, yellow, green, blue, violet. Where the two meet, they cancel back to green.
2. **Two to one.** The cathode makes twice as many bubbles as the anode, because water splits into twice as much hydrogen as oxygen.
3. **The snap.** In Clock, after the delay the liquid turns blue-black. Well-mixed swirls go first, and a black front follows the swirls through the rest.
4. **The wait.** In Clock nothing shows the countdown. The tension is the toy.

## Loop

**Electrolysis.**

- Hold: current on. Bubbles stream from nucleation points on the rods; the colours bloom. Release: current off; bubbles stop, and colours drift and slowly blend.
- Tap: a 0.4 s pulse of current.
- Drag: stir. The colours swirl and neutralise toward green.

**Clock.**

- Hold: pour liquid B from the top at the pointer's x. The level rises.
- Release: stop pouring.
- Drag: stir. Better mixing makes a cleaner snap.
- After the delay, the snap. Reset empties the beaker to liquid A alone.

## Bar

| Control | Content |
|---|---|
| Chips | Electrolysis, Clock |
| Slider | Current (Electrolysis) or Delay (Clock): the label changes with the chip, as Sonar's does |
| Actions | Stir, Reset |
| Settings | Indicator: Universal, Cabbage · Bubbles: Fine, Coarse · Quality: Standard, High (shared) |
| How | Hold: current on, or pour · Drag: stir · Space: hold to switch on or pour (mouse devices only) |

## Tech

**K5 lift.** Copy Marbling's `HEAD`, `FORCE_FS`, `ADV_FS`, `DIV_FS`, `JAC_FS`, `GRAD_FS` and `simStep()` into a marked `K5` section. Leave its dye, comb and print programs behind. Then change:

| Item | Marbling | Bench |
|---|---|---|
| Domain | the tray, aspect `TA` | the beaker's cross-section, a 2:3 portrait box |
| Grid | by tray | 128 × 192 on High, 96 × 144 on Low |
| Forces | ink drops, comb, strokes | bubble lift splats, stir splats, pour jet |
| Walls | closed by clamped reads | the same: the beaker is the box; the surface is a free top below the level |
| Flow decay | τ up to 0.38 s | τ 1.5 s, so convection rolls live longer |

Scalars travel through a second advection program on the same velocity. Add light diffusion: one Jacobi-style blur per step at a small weight.

**Electrolysis.**

- One signed scalar `s`. The anode adds `+k·I` near its rod and the cathode adds `−k·I` near its own, where I is the Current.
- Diffusion and stirring make + and − meet. Their sum cancels on its own; the neutralisation needs no extra code.
- pH = `7 − 4 · tanh(s)`. The colour comes from the indicator's ramp.

| Indicator | pH 3 | 5 | 6 | 7 | 9 | 11 |
|---|---|---|---|---|---|---|
| Universal | red 0.6 0.2 25 | orange 0.72 0.17 55 | yellow 0.85 0.16 95 | green 0.68 0.15 150 | blue 0.55 0.15 255 | violet 0.45 0.17 300 |
| Cabbage | pink 0.65 0.17 350 | pink-violet 0.55 0.14 330 | violet 0.45 0.13 310 | purple 0.45 0.1 295 | blue 0.55 0.1 245 | green 0.7 0.14 140 |

**Bubbles.** CPU particles, up to 600.

- Each rod has 6 to 10 nucleation points; each point emits at a rate set by the Current. The cathode rate is twice the anode rate.
- Each bubble rises at a speed set by its radius, with a side wobble, grows a little as it rises, and pops at the surface.
- Each bubble adds a small upward force splat to the fluid. Together they drive the convection plumes beside each rod.

**Clock.**

- **Mix fraction** `m`: liquid B poured in.
- **Progress** `p`: grows at `rate · 4m(1 − m) / delay`, so it grows only where both liquids meet, and fastest where they are evenly mixed.
- Where `p` passes 1, the starch complex forms: the colour goes to blue-black (0.18 0.06 270) within 0.15 s, with a faint amber edge at the front.
- **Pour:** the jet enters at the surface at the pointer's x, with downward velocity and `m = 1`. The liquid level rises with the volume poured, to 85 % full at most.
- **Delay:** 4 s to 20 s.

**Render.** One pass over the beaker.

- **Light:** a lab panel behind, OKLCH 0.92 0.01 240, graded top to bottom.
- **Liquid:** Beer-Lambert through a fixed depth with the indicator colour. A clear liquid stays near the panel colour.
- **Glass:** two vertical highlight strips, a thin rim at the edges, and the meniscus as a bright curved line.
- **Bubbles:** bright cores with dark rims, so they read as refraction.
- **Rods:** dark graphite with a soft side highlight.
- A vignette and fine grain.

## Sound

- **Electrolysis:** a fine fizz from granular clicks; the rate follows the bubble count, panned by rod. Pops at the surface. A faint 100 Hz hum from the supply while the current runs.
- **Pour:** bandpassed noise with a gurgle modulation.
- **Stir:** a glass rod clinks on the beaker's side: short, high, glassy tones with random pitch.
- **The snap:** a soft low whomp and one glassy chime, exactly as the front starts.

## Finesse

- Bubbles leave from the same few points on each rod, in streams, as real nucleation sites do.
- Plumes beside the rods carry colour up, and it curls over at the surface.
- In Clock, a poorly stirred beaker snaps in patches; a well stirred one snaps nearly at once.
- The meniscus wobbles a little when bubbles pop.
- Cabbage indicator gives a whole new palette from the same chemistry.

## Reduced motion and idle

- **Reduced motion:** bubbles rise slower and wobble less, stir is half strength, and the snap is a 0.6 s fade.
- **Idle:** no drift. The loop sleeps when the current is off, no bubbles are left and the flow has settled. In Clock it stays awake until the snap ends.

## Review focus

1. **A chip change mid-pour or mid-current:** the hold ends, and the beaker resets for the new experiment.
2. **Hold on touch:** the pointer state machine makes a hold after 260 ms. A tap still answers: a 0.4 s pulse of current in Electrolysis, a small splash in Clock.
3. **Delay changed mid-countdown:** `p` keeps its value, and the new rate applies from then on.
4. **Pour to the top:** the pour stops at 85 % and the cursor shows `not-allowed`.
5. **A hidden tab mid-countdown:** the sim clock stops, so the snap waits for your return.

## Tasks

### Task 1: The beaker (K5 lift)

**Files:** Create `bench/index.html` and the bean.

**Produces:** marked `K5` with `simStep(dt)`; `advectScalar(tex, dt)`; `beaker` (render pass); `splat(x, y, vx, vy, r)`.

- [ ] Lift K5 and change it as in the table. Lab light, glass, meniscus and rods.
- [ ] Q1, Q2 and a still at 1280 and 375 px. Checkpoint with Tom.
- [ ] Commit: `Bench: a backlit beaker on Marbling's fluid (K5)`.

### Task 2: Electrolysis

**Produces:** `s` (scalar texture); `bubbles`; `current(on)`.

- [ ] Signed scalar, both indicators, nucleation points, the 2:1 rates, bubble lift and stir.
- [ ] Seed the first-frame rainbow. Screenshots of Universal and Cabbage. Checkpoint with Tom.
- [ ] Commit: `Bench: electrolysis, a rainbow from acid to base`.

### Task 3: Clock

**Produces:** `m` and `p` (scalar textures); `pour(x, on)`; `snap`.

- [ ] Mix fraction, progress, the pour jet and rising level, the snap with its front, and Reset.
- [ ] Screenshots before, during and after the snap.
- [ ] Commit: `Bench: the iodine clock`.

### Task 4: Sound

- [ ] Fizz, hum, pour, clink and the snap. Q9.
- [ ] Commit: `Bench: fizz, pour and the snap`.

### Task 5: Bar, menu and QA

- [ ] Bar with the label that changes per chip, Settings and persistence. `toys.json`, and the menu Lab entry with its hook.
- [ ] Q1 to Q10. Tick the bean and record the cost. Commit.

## Kit handoff

K5, marked, with scalar advection and bubble splats. Kelvin dropper does not need it. Chromatography (38) or Marbling's own rework could copy it.
