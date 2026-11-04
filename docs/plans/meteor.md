# Coast and meteor (`meteor`) implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. One fresh session builds this toy, task by task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A calm cove at dusk. Tap the sky: a meteor streaks in, its light sweeps the cliff's shadow across the bay, and the boom arrives late. The biggest one hits beyond the horizon, and the sea pulls back, then returns.

**Architecture:** three.js 0.170 on the K2 night scene (as Fireworks fixed it), with K6 for fragments. A GSAP timeline runs each event on the sim clock. One moving light drives every lit shader. Cliff shadows come from a short raymarch through a height texture.

**Tech stack:** three.js 0.170 (EffectComposer, UnrealBloomPass, ShaderPass, OutputPass), GSAP 3.13 (`gsap` from the importmap), simplex-noise, Tone.js through `kit.tone()`.

**Spec:** shortlist 15 in [toy-ideas.md](../toy-ideas.md); rank 10 in [toy-plan.md](../toy-plan.md); batch rules in [README.md](README.md).

| | |
|---|---|
| Size, estimate | L · $40 to $70 |
| Kits | Uses K2 and K6 from `fireworks/index.html` |
| Before the build | D1, and Fireworks built first |

## The shot

A low camera on a pebble beach in a small cove. One dark headland rises on the left; the sea runs out to a clean horizon.
The sun has just set: a band of orange low on the horizon, deep blue above, the first stars.
Small waves wash in. Nothing else is in the frame.

## Hero moments

1. **The sweeping shadow.** The fireball is a moving light. The headland's shadow swings across the water and the beach as it falls. This is the shot.
2. **A glitter path.** Its light lays a path of glints across the waves toward you.
3. **Light, then a double boom.** The sky flashes in silence. Seconds later a sonic boom cracks twice (the N-wave) and rolls around the cove.
4. **The sea pulls back.** After an Impact, the water drains from the cove and wet stones glint. It is quiet. Then a long swell rises, breaks and refills the cove in foam.
5. **A persistent train.** A glowing trail stays in the sky after a Fireball. It twists in the high wind and fades from green to lit smoke.

## Loop

The tap point sets the entry direction and where the event ends.

| Size | What happens | Length |
|---|---|---|
| Pebble | A shooting star burns up. A short streak, a soft flash, no sound but a faint sizzle. | 2 s |
| Fireball | A long streak that breaks up (K6 fragments), an airburst flash, the persistent train, a delayed double boom. | 25 s |
| Impact | Beyond the horizon: a flash dome, a shock ring racing over the sea, a white condensation dome, a steam column, then the draw-back and the return. | 45 s |

A new tap during a long event queues it, one at most.

## Bar

| Control | Content |
|---|---|
| Chips | Pebble, Fireball, Impact |
| Slider | Dusk: the last light, to night |
| Action | Shower: a dozen Pebbles over 20 s |
| Settings | Letterbox: Off, On · Cliff: Left, Right · Quality: Standard, High (shared) |
| How | Click/Tap: a meteor there · Drag: look around · Space: shower (mouse devices only) |

## Tech

**Scene (K2 from Fireworks).** Sky dome with dusk palettes, `haze()`, bloom at half size, grade with letterbox.

**Terrain.** One height function `terrainH(x, z)` makes the beach, the headland and the seabed.
It builds the mesh, and it is baked into a 256 × 256 float texture for shadows.
The seabed falls from the beach under the water, with rocks for the draw-back to reveal.

**Sea.**

- Gerstner waves, four components, in the vertex shader. A dense grid near the cove fades into a sparse far plane.
- The mean water level `uLevel(x, z, t)` lowers in the cove with a lag over distance, which gives the draw-back.
- The return is a `sech²` bulge travelling to shore. Foam shows where the slope is steep, plus noise.
- Exposed seabed is wet: darker albedo, high gloss, small glints that dry over 10 s.

**The moving light.** Uniforms `uFireball` (position, intensity) and `uFireCol` feed every lit shader, as Night viaduct's `uArc` does.

- **Shadow:** 16 raymarch steps through the height texture, toward the light, give a soft shadow. That one term is the sweeping shadow.
- **Glitter:** a specular lobe on the Gerstner normals toward the light, sharp and sparse.

**Meteor.**

- **Head:** a bright billboard, green-white (0.92 0.08 150).
- **Tail:** a ribbon that cools to orange (0.75 0.15 55), drawn from the path history.
- **Fragments:** K6 stars with drag, spawned along the last third of the path.

**Impact.**

- **Flash dome:** a sky term over the impact bearing, with exposure lifted for 0.4 s.
- **Shock ring:** an expanding dark ring on the sea with a crisp front. It moves in compressed time.
- **Condensation dome:** a translucent white hemisphere with Fresnel, grown and gone in 1.5 s.
- **Steam column:** billboards with fbm, lit by the flash, then by the dusk sky.

**Persistent train.** A ribbon of 64 points. Each point drifts in a wind sheared by height, which twists it. It glows green (0.7 0.12 150) and fades over 20 s into smoke lit from below.

**Timelines.** Each Size is a function that returns a GSAP timeline on the sim clock: `gsap.timeline({ paused: true })`, driven by `tl.time(simT)`. Pausing then follows the Frame loop rules for free.
GSAP has its own `requestAnimationFrame` ticker. Paused timelines leave it idle; Q4 counts its frames too, so a busy ticker fails the check.

## Sound

- **Entry:** a faint sizzle at the same instant as the light. People do report hearing fireballs at once; it is electrophonic.
- **Fireball boom:** two cracks 0.15 s apart, the N-wave, then a rumble. Delay 3 to 6 s, compressed from real distances. Reverb tail 4 s.
- **Impact:** a sub rumble under 40 Hz that swells over 6 s, starting 5 s after the flash.
- **Draw-back:** a long hiss of water leaving stones, and a gurgle. **Return:** a rising roar, the crash, then a foam fizz.
- **Bed:** gentle surf, its level following the wave height.
- Follow the Delayed sound rules.

## Finesse

- The light colour shifts as the meteor heats: white-green at the head, orange in the wake.
- A Fireball's shadow moves fastest just before the airburst.
- After an Impact, stars dim in the glare, then return.
- Wet stones keep a sheen after the sea returns, then dry over 10 s.
- The headland's rim catches the flash: a thin bright edge on the dark mass.

## Reduced motion and idle

- **Reduced motion:** Pebble only fades in place. The flash rises over 200 ms. The draw-back cross-fades. The train fades without twisting.
- **Idle:** the waves drift. It runs at 30 fps when drifting and sleeps 60 s after the last input.

## Review focus

1. **Taps during an Impact:** the first queues; each later one adds a Pebble, so every tap still answers. The Impact timeline is never cut short.
2. **Hidden tab mid-Impact:** the timeline pauses with the sim clock. Pending sounds cancel and play again as the timeline reaches them.
3. **375 px portrait:** the horizon sits at 45 %, the headland still frames the left, and the impact bearing stays in view.
4. **Cliff Left or Right during an event:** applies at the next event, never mid-event.
5. **A slow GPU:** the ladder drops the shadow march to 8 steps before it drops bloom.

## Tasks

### Task 1: The cove at dusk

**Files:** Create `meteor/index.html` and the bean.

**Produces:** marked `K2` and `K6` sections, copied from Fireworks; `terrainH(x, z)`; `heightTex`; `sea` (Gerstner material, with `uLevel`).

- [ ] Lift K2 and K6 from `fireworks/index.html`. Build terrain, sea and sky.
- [ ] Q1, Q2 and stills at 1280 and 375 px at three Dusk values. Checkpoint with Tom. **Do not start Task 2 until he approves the blockout.**
- [ ] Commit: `Coast and meteor: the cove at dusk, blockout`.

### Task 2: Pebble and Fireball

**Produces:** `uFireball`, `uFireCol`; `pebble(dir)`, `fireball(dir)` (each returns a timeline); `train`.

- [ ] Moving light, shadow march, glitter, head, tail, fragments, flash and train.
- [ ] Screenshots mid-Fireball, with the shadow halfway across the bay. Checkpoint with Tom.
- [ ] Commit: `Coast and meteor: the moving light, shadows and the persistent train`.

### Task 3: Impact

**Produces:** `impact(dir)`; `uLevel` animation; `returnWave`.

- [ ] Flash dome, shock ring, condensation dome, steam, draw-back, wet seabed, the return and foam.
- [ ] Screenshots at the flash, the draw-back and the return.
- [ ] Commit: `Coast and meteor: impact, draw-back and the returning sea`.

### Task 4: Sound

- [ ] Every voice in Sound, with the delays. Q9, and the hidden-tab test from Review focus 2.
- [ ] Commit: `Coast and meteor: sizzle, double boom, the sea leaving and returning`.

### Task 5: Bar, menu and QA

- [ ] Bar, Settings and persistence. `toys.json`, and the menu Lab entry with its hook.
- [ ] Q1 to Q10. Tick the bean and record the cost. Commit.

## Kit handoff

The Gerstner sea with `uLevel` and the height-texture shadow march, both marked. Lighthouse storm (95) or Calving (57) could use them later.
