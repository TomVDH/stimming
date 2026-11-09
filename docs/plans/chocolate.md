# Chocolate tempering (`chocolate`) implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. One fresh session builds this toy, task by task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Temper chocolate by hand on a cold slab of Belgian black marble. Get the temperature curve right and it sets to a mirror with a clean snap. Get it wrong and it sets dull, grey and streaky, and crumbles.

**Architecture:** raw WebGL2. A CPU thin-film sim on a grid of about 256 × 160 cells holds thickness, temperature, two crystal fractions, shear, bloom and streak direction. Two RGBA16F textures carry it to one full-screen shader: marble, Beer-Lambert chocolate, a studio reflection seen through a pinhole camera, crystal glints and bloom.

**Tech stack:** raw WebGL2, Tone.js through `kit.tone()`.

**Spec:** the Belgian series (Broodautomaat, Frietkot, Lit motorway, Beer pour, Chocolate tempering); batch rules in [README.md](README.md); bar in [bar-v2.md](bar-v2.md).

| | |
|---|---|
| Size, estimate | M · $20 to $35 |
| Kits | none. K5 (`marble/`) is not needed: chocolate is a thin film, not a 2D flow. |
| Before the build | nothing |

## The shot

Top down onto a slab of Belgian black marble (Bleu Belge): blue-black stone with sharp white calcite veins. The slab fills the stage; no edge shows.
A softbox hangs out of frame, upper left. The polished stone reflects it as a soft pale rectangle.
A pool of molten chocolate lies on the stone. It reflects the softbox as a mirror does, and its edges bend the reflection.
A pinhole camera, not an orthographic one, so the reflection sits in one place and ripples distort it.

## Hero moments

1. **The pour.** A thick ribbon falls, folds onto itself and spreads into a mirror pool.
2. **The scrape.** The blade leaves a thin film behind it. The marble's white veins show through, tinted red-brown. A rolling wave builds in front of the blade.
3. **The shimmer.** In the window, microcrystals form: fine glints spark and fade across the surface. As it sets, the softbox reflection sharpens to mirror edges.
4. **The snap.** A tap on tempered chocolate cracks it in one straight line, with a bright fresh edge and a few chips that jump.
5. **The bloom.** Failed chocolate goes matte. Grey-white streaks of fat bloom rise along the scrape lines. A tap bends it and it crumbles.

## Loop

1. Pour: the chocolate lands hot (dark at 48 °C). All crystals melt.
2. Cool: scrape and fold on the cold marble. Thin films cool fast; thick pools hold their heat. Shear at 27 °C seeds crystals of forms IV and V.
3. Rewarm: to 31 to 32 °C, with the lamp or by folding in hot chocolate. Form IV melts; form V seeds stay.
4. Set: leave it. Form V grows from its seeds and the chocolate sets glossy.

## Gestures

| Gesture | Effect |
|---|---|
| Drag | Scrape: the blade pushes, folds and mixes, spreads thin, and shears. |
| Hold | Pour hot chocolate at that point. Hold and drag drizzles a ribbon. |
| Tap | On set chocolate: the snap test. On liquid: a small dimple. |
| Space | Pour at the centre (keyboard). |

## Bar (Bar v2)

| Slot | Content |
|---|---|
| Choice (`segments`) | Dark, Milk, White |
| Slider | Lamp: an overhead heat lamp, off to full. Its amber light spreads on the slab. |
| Actions | `+ Pour` (key P), `Clear` (key C) |
| Keys | `[DRAG] scrape` · `[HOLD] pour` · `[CLICK] snap` |
| Settings | Thermal: Halo, Full, Off · Marble: Chilled, Room · Pace: Calm, Brisk · Quality (shared) |
| Footer | Reset: a fresh hot pool |

| Chocolate | Melt | Cool to | Work at | Offset | Colour (OKLCH) |
|---|---|---|---|---|---|
| Dark | 45 to 50 °C | 27 to 28 °C | 31 to 32 °C | 0 | 0.29 0.05 40 |
| Milk | 40 to 45 °C | 26 to 27 °C | 29 to 30 °C | −2 | 0.44 0.08 55 |
| White | 40 °C | 25 to 26 °C | 28 to 29 °C | −3 | 0.9 0.045 88 |

### 375 px recompose

- The grid keeps its cell size on the short side, so the grid turns portrait (about 120 × 260).
- The blade is 0.3 of the short side (desktop 0.16), so a thumb clears a useful lane.
- The pool starts in the upper middle, clear of the bottom row of controls.
- The softbox reflection moves to the upper third.
- Shell: the choice becomes a stepper at bottom left, the actions sit bottom right, the Lamp slider moves into Settings.
- Touch: hold to pour, drag to scrape, tap to snap.

## Temperature as light

No numbers on the stage.

1. **Thermal halo.** A soft disc around the pointer shows the thermochromic liquid-crystal colours of the chocolate under it, as the strip thermometers in a kitchen do: dark below 26 °C, red at 27, green at 31.5, blue at 34, violet above. The colours shift with the chocolate's offset. Settings: Halo (default), Full (the whole sheet), Off.
2. **Heat shimmer.** Above 38 °C, the air ripples the reflections a little.
3. **The lamp.** Its amber glow grows with the slider.

## Physics

**Six forms.** Cocoa butter crystallises in forms I to VI. They melt near 17, 23, 25.5, 27.5, 33.8 and 36 °C. Only form V gives gloss, snap and contraction. The sim tracks two fractions: `v` (form V) and `u` (forms III and IV together).

Per cell, per sim second, with the offset `d` of the chocolate (`mV = 33.8 + d`, `mU = 28 + d`):

| Process | Rule |
|---|---|
| Melt V | above `mV`, `v` decays at `0.8 (T − mV)` per second |
| Melt U | above `mU`, `u` decays at `1.5 (T − mU)` per second |
| Nucleate U | below `mU`: `0.006 (mU − T)(1 + 2 shear)` |
| Nucleate V | below `mV − 3`: `0.001 (mV − 3 − T)(0.15 + 4 shear)`. Shear favours form V. |
| Grow V | `0.25 · v · free · clamp((mV − T) / 6, 0, 1.5)` |
| Grow U | `0.9 · u · free · clamp((mU − T) / 4, 0, 1.5)` |
| Latent heat | `T += 3 (Δv + Δu)` |

`free = 1 − v − u`. Solid fraction is `v + u`. Gloss is `v / (v + u)` once set.

This gives the real outcomes:
- Cool straight from the melt with no work: no V seeds; U wins. It sets dull and blooms.
- Cool and work at 27 °C, rewarm to 31.5 °C, then let it set: U melts, V seeds grow first. Glossy.
- Rewarm past 34 °C: the V seeds melt. Start again.
- Skip the rewarm: U and V both grow. Streaky.
- Hold it too long in the window: V keeps growing and the chocolate thickens, as real chocolate does.

**Heat.** `dT/dt = (Ts − T) k / (h + h0) + lamp · k_L / (h + h0)`. Thin films cool fast; pools hold heat. The marble's own temperature `Ts` warms under hot chocolate and drifts back to room, so the slab loses its chill over many cycles. Chilled marble starts at 15 °C, Room at 19 °C.

**Flow.** Thin-film (lubrication) flow: flux `−h³ / μ · ∇h`. Viscosity rises as the chocolate cools and grows without bound as it sets. A pool spreads, then slows on its own as it thins.

**Scraper.** A blade across the drag direction, cut into 32 bins. Each frame it picks up chocolate above a film thickness from the cells it swept, with their heat and crystals, and lays the load just ahead. The load rolls ahead as a wave and stays as a ridge when the blade lifts. A fast stroke leaves a thicker film; a slow push gathers. Set chocolate (solid above 0.6) does not move.

**Bloom.** After the set, `bloom` grows with `1 − gloss` over about 8 s. Its pattern follows each cell's last scrape direction.

**Contraction.** Tempered chocolate shrinks as it sets. Its edges lift a hair: a thin dark gap and a sharp rim light.

## Rendering

One full-screen pass over two textures: A = (h, T, v, u), B = (bloom, streak cos, streak sin, activity).

1. **Marble.** Domain-warped veins as thin bright ridges, fine fossil specks, a faint blue cast. Polished: Fresnel 0.04 with low roughness.
2. **Chocolate cover.** Beer-Lambert per channel over the marble: films under about 0.08 show the veins, tinted red.
3. **Normals.** Bicubic height, with fine streaks along the scrape direction.
4. **Reflection.** View rays from a pinhole camera. The environment is a dark studio: one softbox and one thin strip light. Roughness widens their edges: 0.02 when liquid, near 0.005 when tempered and set, 0.35 when untempered and set.
5. **Crystal glints.** A hash grid of micro-facets. Density follows `v` and `u`; brightness follows `activity` (the crystal growth rate). V glints are small, sharp and warm white; U glints are larger and dull.
6. **Bloom.** Anisotropic noise along the streak direction mixes in grey-white.
7. **Grade.** ACES, vignette, grain. The lamp adds an amber pool of light.

## Sound

- **Scrape:** brown noise through a bandpass. The level follows blade speed; the pitch drops and a sticky click enters as the chocolate thickens.
- **Fold:** a wet slap when the load lands as a ridge.
- **Pour:** a low glug that thickens as the pool grows.
- **Snap, tempered:** a short crack with resonances at 2 to 5 kHz and a tiny ring.
- **Snap, failed:** a dull low thud with crumbly ticks.
- **Setting:** faint tiny ticks as crystals form, quieter than the room.
- No hit repeats exactly: pitch, time and level jitter.

## Finesse

- Liquid chocolate is always glossy. Temper shows only on setting.
- Thin spots show the veins with a red-brown cast; thick pools are near black.
- The blade leaves a clean film edge and side ridges at its ends.
- The crystal shimmer is sparse and brief, never a uniform glitter.
- The tempered set reflects the softbox with sharp corners.
- Bloom streaks follow the strokes that made them.
- The snap line is straight; the failed break wanders and crumbles.
- The marble warms where hot chocolate sat, so a chilled slab slows down over many cycles.

## Frame loop and idle

- Lively while a gesture or a pour runs, or while any cell changes fast.
- Drifting at 30 fps while chocolate cools or sets.
- Asleep when every cell is set or at slab temperature, and nothing moved for 2 s. Also asleep 60 s after the last input.
- Hidden: stops at once; the sim clock stops too.

## Reduced motion

- No heat shimmer. Glints show but do not flash.
- Gestures still answer.

## Performance

- The sim runs on the CPU: 41 k cells, two flow substeps per frame. Budget 3 ms.
- Ladder: pixel ratio to 1, then the glint grid off, then a coarser grid (cell size × 1.4).

## Review focus

1. **Mass:** the scraper conserves chocolate; the total does not drift over a minute of scraping.
2. **Stability:** the flow step caps mobility, so a hot thick pool never explodes.
3. **375 px portrait:** the pool and the blade both work with a thumb.
4. **A chip change mid-work:** it changes the next pour only; the slab keeps its chocolate.
5. **Outcome legibility:** a first-time player can see why it bloomed. The halo is the teacher.

## Tasks

### Task 1: Blockout (checkpoint)

**Files:** create `chocolate/index.html`, the bean, the `toys.json` entry and the menu Lab entry with an interactive hook.

- [ ] Marble, Beer-Lambert cover, studio reflection, pinhole camera, grade.
- [ ] CPU sim: heat, flow, crystal kinetics, bloom. Scraper with load, pour on hold, thermal halo.
- [ ] Bar v2 spec wired (choice, Lamp, `+ Pour`, `Clear`, Settings rows).
- [ ] Stills at 1280 and 375 px: the first pool, a scrape with veins through the film, a tempered set, a bloomed set.
- [ ] Commit: `Chocolate tempering: blockout`. Checkpoint with Tom.

### Task 2: The set

- [ ] Glint grid, roughness by outcome, contraction rim, bloom streaks along scrape lines.
- [ ] Stills of the shimmer and both sets.
- [ ] Commit: `Chocolate tempering: shimmer, gloss and bloom`.

### Task 3: Snap and pour

- [ ] Snap test: crack line, fresh edge, chips; crumble for failed sets. Pour ribbon that coils. Heat shimmer.
- [ ] Commit: `Chocolate tempering: snap, crumble and ribbon`.

### Task 4: Sound

- [ ] Scrape, fold, pour, both breaks, setting ticks. Q9.
- [ ] Commit: `Chocolate tempering: scrape, slap and snap`.

### Task 5: Settings, idle and QA

- [ ] Persisted Settings, sleep rules, the performance ladder.
- [ ] Q1 to Q10 in the browser pane. Tick the bean and record the cost. Commit.
