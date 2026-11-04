# Wind map (`windmap`) implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. One fresh session builds this toy, task by task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Tens of thousands of particles trace a living wind field. Circle a finger to spin up a cyclone, and watch two cyclones orbit and merge.

**Architecture:** Raw WebGL2. Particle state lives in float textures and advects on the GPU through an analytic field: curl noise plus a sum of point vortices. Each particle draws one segment per frame into Star trails' K1 plate, which fades it into a trail. The vortices move on the CPU, by point-vortex dynamics.

**Tech stack:** raw WebGL2 on the `shared/stim.js` helpers; Tone.js through `kit.tone()`.

**Spec:** shortlist 12 in [toy-ideas.md](../toy-ideas.md); rank 9 in [toy-plan.md](../toy-plan.md); batch rules in [README.md](README.md).

| | |
|---|---|
| Size, estimate | S · $10 to $15 |
| Kits | Uses K1 from `trails/index.html`, with a variant that reads segments from textures |
| Before the build | nothing |

## The shot

A deep slate field with a faint graticule: thin lines every 15°, like a chart with no land on it.
Silk-white streamlines run west to east, meandering. Brighter lines mark the faster air.
The first frame shows the flow with one young cyclone already turning near the centre.

## Hero moments

1. **Spin one up.** Circle a finger and a cyclone builds under it. Spiral arms wrap in, and the eye clears.
2. **Fujiwhara.** Two cyclones close together orbit each other, then merge with a low whomp. This is real storm behaviour.
3. **A dipole.** Two opposite cyclones pair up and sail off together in a straight line, like a smoke ring seen from above.
4. **Isobars.** In Settings, contour lines of the stream function bend around each storm in real time.

## Loop

- Drag in circles: spin a cyclone at the press point. The direction of your circling sets its spin.
- Tap: a gust, a short burst of air outward from that point.
- Cyclones drift with the flow, curve toward the pole, and weaken over about 45 s.
- + Cyclone spawns one, spinning the hemisphere's way.

## Bar

| Control | Content |
|---|---|
| Chips | Silk, Heat, Dye |
| Slider | Wind: the strength of the base flow |
| Actions | + Cyclone, Clear |
| Settings | Particles: Few, Some, Many · Trails: Short, Long · Hemisphere: North, South · Isobars: Off, On · Quality: Standard, High (shared) |
| How | Drag: circle to spin a storm · Click/Tap: gust · Space: cyclone (mouse devices only) |

| Look | Colour |
|---|---|
| Silk | White, with brightness by speed |
| Heat | A speed ramp: 0.45 0.08 250 (slow), through 0.75 0.14 150, to 0.85 0.17 70 (fast) |
| Dye | Each particle keeps the hue of where it spawned. Long life, so the mixing shows |

## Tech

**World.** x runs from 0 to the aspect ratio and y from 0 to 1. The particle state is RGBA32F: (x, y, age, life).

| Particles setting | State texture | Particles |
|---|---|---|
| Many | 256 × 256 | 65,536 |
| Some | 256 × 128 | 32,768 |
| Few | 128 × 128 | 16,384 |

Without `EXT_color_buffer_float`, a CPU path advects 8,000 particles over a 128 × 72 velocity grid. The grid is rebuilt every 0.5 s.

**Field (GLSL).**

- **Base:** stream function `ψ = U * y + A * snoise(x * s, y * s, t * 0.03)`, plus a second octave. Velocity is `(∂ψ/∂y, −∂ψ/∂x)`, so the base flow has no divergence. Use central differences, or the noise's analytic gradient.
- **Vortex k,** Lamb-Oseen: `v_θ = Γ / (2π r) * (1 − exp(−r² / rc²))`.
- **Inflow:** inside 2 rc, a small radial term, `−r̂ * 0.25 * |v_θ|`. Air converges into the eye, which turns the arms into spirals.
- **Gust:** a source term `Q / (2π r) * r̂` that decays with τ 0.3 s.
- Up to 12 vortices and 4 gusts go in as uniform arrays.
- The simplex noise is Stefan Gustavson's public GLSL (MIT). Keep its notice in a comment.

**Update pass.** RK2 advection. A particle respawns at a hashed position when it ages past its life (2 to 6 s), leaves the field, or falls inside 0.3 rc of an eye.

**Draw (K1).**

- Copy K1 from Star trails: `DECAY`, `SEG_FS`, `target()`, `decayPass()` and `segPass()`.
- Add one new vertex shader, `SEG_TEX_VS`. It reads point a from the previous state texture and point b from the new one, with `texelFetch` at `gl_InstanceID`. Width is zero when the particle has just respawned.
- Trail τ: Short 0.6 s, Long 2.5 s.
- Colour comes from the Look: a speed ramp baked into a 256 × 1 texture with `linFit`.

**Composite.** Background slate (0.17 0.015 250), the graticule, the plate, and isobars when on: `fract(ψ * k)` lines anti-aliased with `fwidth`. Then a vignette and grain.

**Vortex dynamics (CPU).** For each vortex:

1. Velocity is the base flow at its centre, plus the induced velocity of every other vortex (this gives Fujiwhara), plus a beta drift toward the pole and west.
2. Circulation decays with τ 45 s.
3. **Merge:** same-sign vortices closer than 0.6 (rc_a + rc_b) merge. Their Γ adds and rc grows.
4. **Dipole:** opposite signs just leave each other alone. They pair up by themselves.

**Spin-up gesture.** On press, a seed vortex with Γ = 0 sits at the press point. Each move adds `k * cross(r, dp) / |r|²`, the angle the pointer swept around the seed. The seed's centre eases toward the centroid of the path. On release, the vortex goes free.

## Sound

- **Wind bed:** noise through a bandpass of 400 Hz to 1.2 kHz. Level and centre follow the mean speed, from the base wind and ∑ |Γ|.
- **Storm howl:** for the three strongest vortices, resonant bandpassed noise at `200 + 600 * |Γ|` Hz, panned by x.
- **Gust:** a whoosh. **Merge:** a low whomp, from MembraneSynth plus low-passed noise.

## Finesse

- The eye stays clear: respawn inside the eye keeps the spiral arms crisp.
- Spin-up is felt, not instant: Γ builds with each circle you draw.
- Trails taper, because older segments fade first.
- Isobars and streamlines agree, because both come from the same ψ.
- Hemisphere South flips + Cyclone's spin; the drag gesture keeps the user's own direction.

## Reduced motion and idle

- **Reduced motion:** particles at 40 % speed, a gust is a soft push, and trails are long so motion reads calmer.
- **Idle:** this toy drifts. It runs at 30 fps when drifting and sleeps 60 s after the last input. While asleep the plate keeps its last frame.

## Review focus

1. **No float targets:** the CPU path runs, with a smaller count and no console error.
2. **A spin-up drag that leaves the stage:** capture holds; release frees the vortex where it is.
3. **The 13th cyclone:** the weakest vortex fades out to make room. Nothing pops.
4. **Resize:** state textures keep the particles in normalised units, so a resize does not scatter them.
5. **A tap and a drag too close in time:** the 8 px and 260 ms machine sorts them; a tap never makes a vortex.

## Tasks

### Task 1: Flow and plate (K1 lift)

**Files:** Create `windmap/index.html` and the bean.

**Produces:** marked `K1` sections; `SEG_TEX_VS`; `FIELD` (a GLSL chunk); `stateA` and `stateB` (ping-pong).

- [ ] Lift K1. Add the state textures, the update pass, the base field and the texture-fed segments.
- [ ] Graticule and composite. Seed one cyclone for the first frame.
- [ ] Q1, Q2 and stills at 1280 and 375 px. Checkpoint with Tom.
- [ ] Commit: `Wind map: streamlines on the K1 plate`.

### Task 2: Storms

**Produces:** `vortices` (array of `{ x, y, g, rc }`), `spawnCyclone(x, y, g)`, `gust(x, y)`.

- [ ] Vortex field, inflow, the dynamics, merge, the spin-up gesture and the gust.
- [ ] A Playwright step spawns two same-sign cyclones 0.2 apart. Screenshots at 0 s, 4 s and 10 s show the orbit and the merge.
- [ ] Commit: `Wind map: cyclones that orbit and merge`.

### Task 3: Looks and isobars

- [ ] Silk, Heat and Dye. The isobars. The CPU fallback.
- [ ] Commit: `Wind map: three looks, isobars, CPU fallback`.

### Task 4: Sound

- [ ] Bed, howl, gust and merge. Q9.
- [ ] Commit: `Wind map: wind bed and storm howl`.

### Task 5: Bar, menu and QA

- [ ] Bar, Settings and persistence. `toys.json`, and the menu Lab entry with its hook.
- [ ] Q1 to Q10. Tick the bean and record the cost. Commit.

## Kit handoff

`SEG_TEX_VS` joins K1 as a variant for GPU particles. Kelvin dropper can copy it from here.
