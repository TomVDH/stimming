# Fireworks (`fireworks`) implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. One fresh session builds this toy, task by task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Shells burst over dark water at night; each burst lights its own smoke, the low sky and the water, and its boom arrives late.

**Architecture:** three.js 0.170 on Night viaduct's K2 night scene. Stars are GPU particles with a closed-form path, so a burst writes its stars once and each frame only moves a time uniform. A mirrored half-size pass gives the water its reflections.

**Tech stack:** three.js 0.170 (EffectComposer, RenderPass, UnrealBloomPass, ShaderPass, OutputPass), simplex-noise, Tone.js through `kit.tone()`.

**Spec:** shortlist S2 in [toy-ideas.md](../toy-ideas.md); rank 5 in [toy-plan.md](../toy-plan.md); batch rules in [README.md](README.md).

| | |
|---|---|
| Size, estimate | S to M · $15 to $30 |
| Kits | Uses K2 from `viaduct/`. Builds K6, burst particles. |
| Before the build | D1: ask Tom what broke in Night viaduct. |

## The shot

A wide, still frame of a dark bay at night. A low far shore runs across the lower third as one ridge line, as in Star trails, with a few warm village lights and their reflections.
Above it: a clear sky with faint haze and few stars. Nothing else. The fireworks are the only strong light, and they light everything else.

## Hero moments

1. **Light, then sound.** The flash is instant; the boom arrives `distance / 343` seconds later. At the far end of the slider the wait is 4.4 s.
2. **The burst lights its world.** The flash lifts the low haze, rims the ridge, and lights old smoke from inside. Later bursts light earlier smoke again.
3. **Willows hang.** Gold willow trails droop for about 5 s, and their reflections wobble on the water.
4. **+ Finale.** Twenty-four shells in 7 s, building to a crackling strobe wall, then three gold willows that hang over the smoke.

## Loop

- Press on the sky: a faint seed light grows at that point while you hold. That is the anticipation.
- Release: a comet climbs from the shore under that x and bursts at the press point. Hold time sets the calibre, 1 to 2, over 1.5 s.
- The chip picks the shell type. Smoke drifts with a slow wind and lingers about 12 s.

## Bar

| Control | Content |
|---|---|
| Chips | Peony, Willow, Crossette, Ring, Strobe |
| Slider | Distance: 300 m to 1,500 m; size, haze and sound delay follow |
| Action | + Finale |
| Settings | Smoke: Thin, Thick · Water: Calm, Ripple · Quality: Standard, High (shared) |
| How | Click/Tap: launch · Hold: bigger shell · Space: shell (mouse devices only) |

## Tech

**Stars (K6).** One `InstancedBufferGeometry` quad and a ring buffer of 48,000 star slots (16,000 on Low).
Each star holds four `vec4` attributes:

| Attribute | Content |
|---|---|
| `aA` | birth position `p0`, birth time `t0` |
| `aB` | birth velocity `v0`, drag `k` |
| `aC` | colour ramp id, life, trail length, size |
| `aD` | kind flags (strobe, willow), strobe seed, split time, spare |

The vertex shader places each star with linear drag, closed form:

```glsl
// a = G - k v, so the path needs no stored state.
vec3 starPos(vec3 p0, vec3 v0, float k, float t) {
  vec3 vt = G / k;
  return p0 + vt * t + (v0 - vt) * (1.0 - exp(-k * t)) / k;
}
```

- Each star draws as a streak from `starPos(t - trail)` to `starPos(t)`. Width and brightness follow age.
- **Colour over life:** white-hot for the first 10 %, then the chemical colour, then an ember red at the end.
- **Crossette:** the CPU evaluates the parent's position and velocity at the split time. It writes four children whose `t0` is the split time. The parent's life ends there.
- **Strobe:** brightness is `step(0.5, hash(seed, floor(t * 12.0)))`.
- **Ring:** velocities lie in one random plane.
- **Willow:** drag 2.2, life 4.5 s, a long trail, and a slight flicker.

| Ramp | OKLCH | Note |
|---|---|---|
| Strontium red | 0.62 0.24 25 | |
| Barium green | 0.75 0.2 150 | |
| Copper blue | 0.6 0.15 255 | Dimmer than the others; blue is the hardest firework colour. |
| Sodium gold | 0.82 0.16 80 | Willows use this. |
| Magnesium white | 0.97 0.02 90 | Strobe and crackle |

**Burst lights.** An array of eight `vec4` uniforms (position, intensity) plus colours. A light flashes from 0 to 1 in 30 ms, falls with τ 0.35 s, then holds a glow tail with τ 1.5 s.
Every lit shader reads this array: sky, haze, ridge, smoke and water.
When more than eight lights are alive, the eight brightest win.

**Smoke.** Up to 64 billboard puffs, made at each burst. They carry fbm density, grow, drift with the wind and fade over 12 s.
Lighting is the sum over burst lights of `col * I / (1 + d * d * k)` plus a little sky ambient.

**Water.**

- **Mirror pass:** the light layer (stars, comets, smoke) renders again into a half-size target, with the camera mirrored about y = 0. Use `camera.layers`, so the scene does not render twice.
- **Water shader:** samples the mirror target with a ripple offset (`vnoise`), a 5-tap vertical smear and Fresnel.
- The village lights reflect as streaks, as in Night viaduct.

**K2 lift.** Copy these from `viaduct/index.html` into marked sections: `NOISE`, the `haze()` part of `LIGHT`, the sky dome, the village-lights points and the post chain (bloom at half size, grade, OutputPass). Drop the train, snow and terrain.

**Distance.** The slider maps 0 to 1 onto 300 to 1,500 m. It scales the burst field's depth, the haze, the boom delay, the boom level (−6 to −20 dB) and the boom low-pass (6 kHz to 900 Hz).
A change applies to new shells only.

## Sound

- **Lift:** a MembraneSynth thump. Noise through a bandpass sweeps 300 Hz to 1.8 kHz over the climb.
  One shell in six whistles: a sine glides 1.2 to 2.6 kHz with a 7 Hz vibrato.
- **Boom, after the delay:**
  1. A crack: 8 ms of white noise through a 2 kHz high-pass.
  2. A body: brown noise through the distance low-pass.
  3. A sub: MembraneSynth on G0.
  4. Reverb with a 3.5 s decay, and a slap echo off the far shore at +0.45 s.
- **Crackle (Strobe, Crossette):** 30 to 80 clicks of 2 ms noise, bandpassed 3 to 6 kHz, spread over 1.2 s, after the delay.
- **Willow:** a soft sizzle, pink noise above 4 kHz, decaying over 2.5 s.
- **Bed:** brown noise below 300 Hz with a slow LFO, the water lapping, at −32 dB, while lively only.
- **Caps:** six booms and two crackles at a time. Everything pans by burst x and follows the Delayed sound rules.

## Finesse

- Each star cools from white through its colour to ember red.
- Copper blue is dim on purpose.
- The comet trail sheds a few sparks as it climbs, and the shell bursts at its apex, not on a fixed timer.
- Calibre scales the radius, the star count and the boom's depth together.
- The first frame shows the calm bay with its lights reflected: a picture before the first shell.

## Reduced motion and idle

- **Reduced motion:** the flash rises over 150 ms instead of 30 ms. Strobe stars hold steady. Smoke drifts at half speed. Sound is unchanged.
- **Idle:** the loop sleeps when no star is alive and the last smoke has faded. A calm bay needs no frames.

## Review focus

1. **Tap spam,** 30 taps in 2 s: the ring buffer overwrites the oldest stars, the eight brightest lights win, the voice caps hold, and fps holds.
2. **Mute while booms are pending:** silence at once. The scheduled nodes stop.
3. **Hidden tab mid-show:** the sim clock stops and pending sounds cancel. On return the show resumes without a jump.
4. **375 px portrait:** the burst altitude band maps onto the visible sky. No burst clips the top, and the bar never covers the shore.
5. **Distance change mid-show:** only new shells use the new distance.

## Tasks

### Task 1: The bay at night (K2 lift)

**Files:** Create `fireworks/index.html` (skeleton from `trails/index.html`). Create the `feature` bean.

**Produces:** marked `K2` sections; `U` shared uniforms with `uLights` (vec4[8]) and `uLightCol` (vec3[8]); `layers.LIGHT = 1`.

- [ ] Copy the K2 parts named in Tech into marked sections. Fix in this copy whatever Tom named for D1.
- [ ] Build the ridge strip, the water plane, the village lights and the empty mirror target.
- [ ] Wire `ready`: `await renderer.compileAsync(scene, camera)`, then one `composer.render()`.
- [ ] Run Q1, Q2 and Q3 (stills at 1280 and 375 px). Send the stills to Tom.
- [ ] Commit: `Fireworks: the bay at night, K2 lifted and marked`.

### Task 2: Shells (K6)

**Produces:** `launch(x, y, calibre)`, `burst(pos, type, calibre)`, GLSL `starPos()`, the `stars` ring buffer, `lights.push(pos, col)`.

- [ ] Ring buffer and instance layout as in Tech, with `bufferSubData` on burst only.
- [ ] Five shell types, comets, hold-to-charge with the seed light, burst lights, sky flash.
- [ ] A throwaway Playwright step launches one shell of each type and takes a mid-burst screenshot.
- [ ] Q4: the loop stops after the last star dies.
- [ ] Commit: `Fireworks: five shells on closed-form GPU stars (K6)`.

### Task 3: Smoke, reflections and the finale

- [ ] Smoke puffs lit by the light array. Mirror pass and water shader.
- [ ] `+ Finale` as a list of `[t, x, y, type, calibre]` entries read on the sim clock.
- [ ] Screenshots of the finale peak and a willow over the water. Checkpoint with Tom.
- [ ] Commit: `Fireworks: lit smoke, water reflections, finale`.

### Task 4: Sound

- [ ] Every voice in Sound, on `kit.out`, with the Delayed sound rules.
- [ ] Q9, plus the mute test from Review focus 2.
- [ ] A listen-through with Tom: the delay at three distances.
- [ ] Commit: `Fireworks: lift, delayed boom, crackle and sizzle`.

### Task 5: Bar, menu and QA

- [ ] Bar, Settings and persistence, as in Bar.
- [ ] `toys.json` entry and menu Lab entry with an icon and a `toys.fireworks` hook, per the Ground rules.
- [ ] Run Q1 to Q10. Tick the bean and record the session cost.
- [ ] Commit the page and the bean. Commit `index.html` through a private index.

## Kit handoff

- **K6** (ring buffer, attribute layout, `starPos()`, `burst()`) goes to Coast and meteor and Marsh launch.
- **K2,** marked and fixed, is the copy that Wind farm, Coast and meteor, Canal at dusk and Marsh launch lift.
